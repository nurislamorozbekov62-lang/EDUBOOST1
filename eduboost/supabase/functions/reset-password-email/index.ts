// @ts-nocheck

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'


/* =========================================================
   CONFIG
========================================================= */

const MAX_FAILED_ATTEMPTS = 5
const LOCK_MINUTES = 15

const EDU_PATTERN =
  /^EDU-[0-9]{6}$/

const CODE_PATTERN =
  /^[0-9]{6}$/

const PURPOSE =
  'password_recovery'


/* =========================================================
   CORS
========================================================= */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',

  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
}


/* =========================================================
   RESPONSE
========================================================= */

function jsonResponse(
  body,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,

      headers: {
        ...corsHeaders,

        'Content-Type':
          'application/json; charset=utf-8',
      },
    },
  )
}


/* =========================================================
   HELPERS
========================================================= */

function cleanText(
  value,
) {
  return String(
    value ?? '',
  ).trim()
}


function normalizeEduLogin(
  value,
) {
  const normalized =
    cleanText(value)
      .toUpperCase()
      .replace(/\s+/g, '')


  if (
    /^[0-9]{6}$/.test(
      normalized,
    )
  ) {
    return `EDU-${normalized}`
  }


  if (
    /^EDU[0-9]{6}$/.test(
      normalized,
    )
  ) {
    return `EDU-${normalized.slice(3)}`
  }


  return normalized
}


function normalizeCode(
  value,
) {
  return cleanText(value)
    .replace(/\D/g, '')
}


/* =========================================================
   SHA-256

   Должно совпадать с send-email-code:

   userId:purpose:code
========================================================= */

async function createCodeDigest(
  userId,
  purpose,
  code,
) {
  const source =
    `${userId}:${purpose}:${code}`


  const bytes =
    new TextEncoder()
      .encode(source)


  const hash =
    await crypto.subtle.digest(
      'SHA-256',
      bytes,
    )


  return Array
    .from(
      new Uint8Array(hash),
    )
    .map(
      (byte) =>
        byte
          .toString(16)
          .padStart(
            2,
            '0',
          ),
    )
    .join('')
}


/* =========================================================
   LOCK
========================================================= */

function getLockRemainingSeconds(
  failedAttempts,
  lastAttemptAt,
) {
  if (
    failedAttempts <
    MAX_FAILED_ATTEMPTS
  ) {
    return 0
  }


  if (
    !lastAttemptAt
  ) {
    return 0
  }


  const lastAttempt =
    new Date(
      lastAttemptAt,
    ).getTime()


  if (
    Number.isNaN(
      lastAttempt,
    )
  ) {
    return 0
  }


  const unlockAt =
    lastAttempt +
    LOCK_MINUTES *
    60 *
    1000


  const remaining =
    unlockAt -
    Date.now()


  if (
    remaining <= 0
  ) {
    return 0
  }


  return Math.ceil(
    remaining /
    1000,
  )
}


/* =========================================================
   FIND USER BY EDU LOGIN

   STAFF / TEACHER:

   profiles.edu_login
        ↓
   profiles.id


   STUDENT:

   school_students.student_login
        ↓
   school_students.user_id
        ↓
   profiles.id
========================================================= */

async function findProfileByEduLogin(
  adminClient,
  eduLogin,
) {
  /* =======================================================
     DIRECT PROFILE LOOKUP
  ======================================================= */

  const {
    data:
      directProfiles,

    error:
      directError,
  } =
    await adminClient
      .from('profiles')
      .select(`
        id,
        role,
        recovery_email,
        recovery_email_verified_at
      `)
      .eq(
        'edu_login',
        eduLogin,
      )
      .limit(2)


  if (
    directError
  ) {
    throw new Error(
      `Profile lookup: ${directError.message}`,
    )
  }


  if (
    (
      directProfiles ||
      []
    ).length > 1
  ) {
    console.error(
      'Duplicate profiles EDU:',
      eduLogin,
    )

    return null
  }


  const directProfile =
    directProfiles?.[0] ||
    null


  /* =======================================================
     STUDENT LOOKUP
  ======================================================= */

  const {
    data:
      studentRows,

    error:
      studentError,
  } =
    await adminClient
      .from(
        'school_students',
      )
      .select(`
        id,
        user_id,
        student_login
      `)
      .eq(
        'student_login',
        eduLogin,
      )
      .limit(2)


  if (
    studentError
  ) {
    throw new Error(
      `Student lookup: ${studentError.message}`,
    )
  }


  if (
    (
      studentRows ||
      []
    ).length > 1
  ) {
    console.error(
      'Duplicate student EDU:',
      eduLogin,
    )

    return null
  }


  const student =
    studentRows?.[0] ||
    null


  /* =======================================================
     COLLISION PROTECTION
  ======================================================= */

  if (
    directProfile &&
    student?.user_id &&
    directProfile.id !==
      student.user_id
  ) {
    console.error(
      'EDU LOGIN COLLISION:',
      {
        eduLogin,

        profileUserId:
          directProfile.id,

        studentUserId:
          student.user_id,
      },
    )


    return null
  }


  /*
    Учитель / сотрудник.
  */

  if (
    directProfile
  ) {
    return directProfile
  }


  /*
    Ученик существует в roster,
    но ещё не активировал аккаунт.
  */

  if (
    !student?.user_id
  ) {
    return null
  }


  /* =======================================================
     LOAD ACTIVATED STUDENT PROFILE
  ======================================================= */

  const {
    data:
      studentProfile,

    error:
      studentProfileError,
  } =
    await adminClient
      .from('profiles')
      .select(`
        id,
        role,
        recovery_email,
        recovery_email_verified_at
      `)
      .eq(
        'id',
        student.user_id,
      )
      .maybeSingle()


  if (
    studentProfileError
  ) {
    throw new Error(
      `Student profile: ${studentProfileError.message}`,
    )
  }


  return (
    studentProfile ||
    null
  )
}


/* =========================================================
   EDGE FUNCTION
========================================================= */

Deno.serve(
  async (
    request,
  ) => {
    /* =====================================================
       OPTIONS
    ===================================================== */

    if (
      request.method ===
      'OPTIONS'
    ) {
      return new Response(
        'ok',
        {
          headers:
            corsHeaders,
        },
      )
    }


    /* =====================================================
       METHOD
    ===================================================== */

    if (
      request.method !==
      'POST'
    ) {
      return jsonResponse(
        {
          error:
            'Метод не поддерживается.',
        },
        405,
      )
    }


    /* =====================================================
       ENV
    ===================================================== */

    const supabaseUrl =
      Deno.env.get(
        'SUPABASE_URL',
      )

    const serviceRoleKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY',
      )


    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      return jsonResponse(
        {
          error:
            'Ошибка конфигурации сервера.',
        },
        500,
      )
    }


    const adminClient =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession:
              false,

            autoRefreshToken:
              false,
          },
        },
      )


    let stage =
      'start'


    try {
      /* ===================================================
         INPUT
      =================================================== */

      stage =
        'input'


      let body


      try {
        body =
          await request.json()
      } catch {
        return jsonResponse(
          {
            error:
              'Некорректный запрос.',
          },
          400,
        )
      }


      const eduLogin =
        normalizeEduLogin(
          body?.eduLogin,
        )


      const code =
        normalizeCode(
          body?.code,
        )


      const newPassword =
        String(
          body?.newPassword ??
          '',
        )


      if (
        !EDU_PATTERN.test(
          eduLogin,
        )
      ) {
        return jsonResponse(
          {
            error:
              'Неверный EDU-логин или код.',
          },
          400,
        )
      }


      if (
        !CODE_PATTERN.test(
          code,
        )
      ) {
        return jsonResponse(
          {
            error:
              'Введите 6-значный код.',
          },
          400,
        )
      }


      if (
        newPassword.length <
        8
      ) {
        return jsonResponse(
          {
            error:
              'Пароль должен содержать минимум 8 символов.',
          },
          400,
        )
      }


      if (
        newPassword.length >
        72
      ) {
        return jsonResponse(
          {
            error:
              'Пароль слишком длинный. Максимум 72 символа.',
          },
          400,
        )
      }


      /* ===================================================
         PROFILE

         Теперь работает и для учителя,
         и для ученика.
      =================================================== */

      stage =
        'profile'


      const profile =
        await findProfileByEduLogin(
          adminClient,
          eduLogin,
        )


      if (
        !profile ||
        !profile.recovery_email ||
        !profile.recovery_email_verified_at
      ) {
        return jsonResponse(
          {
            error:
              'Неверный EDU-логин или код.',
          },
          400,
        )
      }


      const userId =
        profile.id


      /* ===================================================
         FIND ACTIVE OTP
      =================================================== */

      stage =
        'find-code'


      const {
        data:
          codeRow,

        error:
          codeError,
      } =
        await adminClient
          .from(
            'account_email_codes',
          )
          .select(`
            id,
            user_id,
            purpose,
            email,
            code_digest,
            expires_at,
            used_at,
            revoked_at,
            failed_attempts,
            last_attempt_at,
            created_at
          `)
          .eq(
            'user_id',
            userId,
          )
          .eq(
            'purpose',
            PURPOSE,
          )
          .is(
            'used_at',
            null,
          )
          .is(
            'revoked_at',
            null,
          )
          .order(
            'created_at',
            {
              ascending:
                false,
            },
          )
          .limit(1)
          .maybeSingle()


      if (
        codeError
      ) {
        throw new Error(
          `Code lookup: ${codeError.message}`,
        )
      }


      if (
        !codeRow
      ) {
        return jsonResponse(
          {
            error:
              'Код недействителен или уже использован.',
          },
          400,
        )
      }


      /* ===================================================
         EMAIL MUST STILL MATCH
      ======================================================= */

      const codeEmail =
        String(
          codeRow.email ||
          '',
        )
          .trim()
          .toLowerCase()


      const profileEmail =
        String(
          profile.recovery_email ||
          '',
        )
          .trim()
          .toLowerCase()


      if (
        codeEmail !==
        profileEmail
      ) {
        return jsonResponse(
          {
            error:
              'Код недействителен. Запросите новый.',
          },
          400,
        )
      }


      /* ===================================================
         EXPIRATION
      ======================================================= */

      stage =
        'expiration'


      const expiresAt =
        new Date(
          codeRow.expires_at,
        ).getTime()


      if (
        Number.isNaN(
          expiresAt,
        ) ||
        expiresAt <=
        Date.now()
      ) {
        await adminClient
          .from(
            'account_email_codes',
          )
          .update({
            revoked_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            codeRow.id,
          )


        return jsonResponse(
          {
            error:
              'Срок действия кода истёк. Запросите новый.',
          },
          400,
        )
      }


      /* ===================================================
         LOCK
      ======================================================= */

      stage =
        'lock'


      let failedAttempts =
        Number(
          codeRow.failed_attempts ||
          0,
        )


      const remainingSeconds =
        getLockRemainingSeconds(
          failedAttempts,
          codeRow.last_attempt_at,
        )


      if (
        remainingSeconds >
        0
      ) {
        return jsonResponse(
          {
            error:
              `Слишком много неправильных попыток. Попробуйте через ${Math.ceil(
                remainingSeconds /
                60,
              )} мин.`,

            retryAfterSeconds:
              remainingSeconds,
          },
          429,
        )
      }


      /*
        15 минут прошли —
        сбрасываем счётчик.
      */

      if (
        failedAttempts >=
        MAX_FAILED_ATTEMPTS
      ) {
        const {
          error:
            resetError,
        } =
          await adminClient
            .from(
              'account_email_codes',
            )
            .update({
              failed_attempts:
                0,

              last_attempt_at:
                null,
            })
            .eq(
              'id',
              codeRow.id,
            )


        if (
          resetError
        ) {
          throw new Error(
            `Reset lock: ${resetError.message}`,
          )
        }


        failedAttempts =
          0
      }


      /* ===================================================
         VERIFY CODE
      ======================================================= */

      stage =
        'verify-code'


      const enteredDigest =
        await createCodeDigest(
          userId,
          PURPOSE,
          code,
        )


      if (
        enteredDigest !==
        codeRow.code_digest
      ) {
        const nextAttempts =
          failedAttempts +
          1


        const {
          error:
            attemptError,
        } =
          await adminClient
            .from(
              'account_email_codes',
            )
            .update({
              failed_attempts:
                nextAttempts,

              last_attempt_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              'id',
              codeRow.id,
            )
            .is(
              'used_at',
              null,
            )
            .is(
              'revoked_at',
              null,
            )


        if (
          attemptError
        ) {
          throw new Error(
            `Attempts: ${attemptError.message}`,
          )
        }


        if (
          nextAttempts >=
          MAX_FAILED_ATTEMPTS
        ) {
          return jsonResponse(
            {
              error:
                `Слишком много неправильных попыток. Восстановление заблокировано на ${LOCK_MINUTES} минут.`,

              retryAfterSeconds:
                LOCK_MINUTES *
                60,
            },
            429,
          )
        }


        return jsonResponse(
          {
            error:
              'Неверный EDU-логин или код.',

            attemptsLeft:
              MAX_FAILED_ATTEMPTS -
              nextAttempts,
          },
          400,
        )
      }


      /* ===================================================
         CLAIM OTP
      ======================================================= */

      stage =
        'claim-code'


      const usedAt =
        new Date()
          .toISOString()


      const {
        data:
          claimedCode,

        error:
          claimError,
      } =
        await adminClient
          .from(
            'account_email_codes',
          )
          .update({
            used_at:
              usedAt,

            failed_attempts:
              0,

            last_attempt_at:
              null,
          })
          .eq(
            'id',
            codeRow.id,
          )
          .is(
            'used_at',
            null,
          )
          .is(
            'revoked_at',
            null,
          )
          .select(
            'id',
          )
          .maybeSingle()


      if (
        claimError
      ) {
        throw new Error(
          `Claim code: ${claimError.message}`,
        )
      }


      if (
        !claimedCode
      ) {
        return jsonResponse(
          {
            error:
              'Этот код уже использован.',
          },
          409,
        )
      }


      /* ===================================================
         CHANGE AUTH PASSWORD
      ======================================================= */

      stage =
        'change-password'


      const {
        error:
          passwordError,
      } =
        await adminClient
          .auth
          .admin
          .updateUserById(
            userId,
            {
              password:
                newPassword,
            },
          )


      if (
        passwordError
      ) {
        /*
          Пароль не изменился.
          Возвращаем OTP.
        */

        await adminClient
          .from(
            'account_email_codes',
          )
          .update({
            used_at:
              null,
          })
          .eq(
            'id',
            codeRow.id,
          )
          .eq(
            'used_at',
            usedAt,
          )


        throw new Error(
          `Password update: ${passwordError.message}`,
        )
      }


      /* ===================================================
         REVOKE OTHER RECOVERY CODES
      ======================================================= */

      stage =
        'revoke-other-codes'


      const {
        error:
          revokeError,
      } =
        await adminClient
          .from(
            'account_email_codes',
          )
          .update({
            revoked_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'user_id',
            userId,
          )
          .eq(
            'purpose',
            PURPOSE,
          )
          .neq(
            'id',
            codeRow.id,
          )
          .is(
            'used_at',
            null,
          )
          .is(
            'revoked_at',
            null,
          )


      if (
        revokeError
      ) {
        console.error(
          'reset-password-email revoke:',
          revokeError,
        )
      }


      /* ===================================================
         SUCCESS
      ======================================================= */

      console.log(
        'reset-password-email success:',
        {
          userId,
          eduLogin,

          role:
            profile.role,
        },
      )


      return jsonResponse({
        success:
          true,

        message:
          'Пароль успешно изменён.',

        eduLogin,
      })
    } catch (
      error
    ) {
      const message =
        error instanceof Error
          ? error.message
          : String(
              error ||
              'Неизвестная ошибка',
            )


      console.error(
        'reset-password-email FAILED:',
        {
          stage,
          message,
        },
      )


      return jsonResponse(
        {
          error:
            'Не удалось изменить пароль. Попробуйте ещё раз.',

          stage,
        },
        500,
      )
    }
  },
)