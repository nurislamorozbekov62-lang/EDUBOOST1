// @ts-nocheck

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'


/* =========================================================
   CONFIG
========================================================= */

const EDU_PATTERN =
  /^EDU-[0-9]{6}$/

const CODE_PATTERN =
  /^[0-9]{6}$/

const PURPOSE =
  'password_recovery'

const MAX_FAILED_ATTEMPTS =
  5

const LOCK_MINUTES =
  15

const MIN_PASSWORD_LENGTH =
  8

const MAX_PASSWORD_LENGTH =
  72


/* =========================================================
   CORS
========================================================= */

const corsHeaders = {
  'Access-Control-Allow-Origin':
    '*',

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
    JSON.stringify(
      body,
    ),
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
    cleanText(
      value,
    )
      .toUpperCase()
      .replace(
        /\s+/g,
        '',
      )


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
    return `EDU-${normalized.slice(
      3,
    )}`
  }


  return normalized
}


function normalizeCode(
  value,
) {
  return cleanText(
    value,
  )
    .replace(
      /\D/g,
      '',
    )
}


/* =========================================================
   SHA-256

   Должен совпадать с send-email-code:

   userId:purpose:code
========================================================= */

async function createCodeDigest(
  userId,
  purpose,
  code,
) {
  const source =
    `${userId}:${purpose}:${code}`


  const encoded =
    new TextEncoder()
      .encode(
        source,
      )


  const hash =
    await crypto.subtle.digest(
      'SHA-256',
      encoded,
    )


  return Array
    .from(
      new Uint8Array(
        hash,
      ),
    )
    .map(
      (
        byte,
      ) =>
        byte
          .toString(
            16,
          )
          .padStart(
            2,
            '0',
          ),
    )
    .join('')
}


/* =========================================================
   FIND ACCOUNT BY EDU

   TEACHER / STAFF:

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
     STAFF / PROFILE
  ======================================================= */

  const {
    data:
      directProfiles,

    error:
      directError,
  } =
    await adminClient
      .from(
        'profiles',
      )
      .select(
        `
          id,
          role,
          recovery_email,
          recovery_email_verified_at
        `,
      )
      .eq(
        'edu_login',
        eduLogin,
      )
      .limit(2)


  if (
    directError
  ) {
    throw new Error(
      `Ошибка поиска profiles: ${directError.message}`,
    )
  }


  if (
    (
      directProfiles ||
      []
    ).length >
    1
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
     STUDENT
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
      .select(
        `
          id,
          user_id,
          student_login
        `,
      )
      .eq(
        'student_login',
        eduLogin,
      )
      .limit(2)


  if (
    studentError
  ) {
    throw new Error(
      `Ошибка поиска school_students: ${studentError.message}`,
    )
  }


  if (
    (
      studentRows ||
      []
    ).length >
    1
  ) {
    console.error(
      'Duplicate student EDU:',
      eduLogin,
    )

    return null
  }


  const studentRow =
    studentRows?.[0] ||
    null


  /* =======================================================
     COLLISION PROTECTION
  ======================================================= */

  if (
    directProfile &&
    studentRow?.user_id &&
    directProfile.id !==
      studentRow.user_id
  ) {
    console.error(
      'EDU LOGIN COLLISION:',
      {
        eduLogin,

        directProfileId:
          directProfile.id,

        studentUserId:
          studentRow.user_id,
      },
    )


    return null
  }


  /* =======================================================
     STAFF FOUND
  ======================================================= */

  if (
    directProfile
  ) {
    return directProfile
  }


  /* =======================================================
     STUDENT NOT ACTIVATED
  ======================================================= */

  if (
    !studentRow?.user_id
  ) {
    return null
  }


  /* =======================================================
     ACTIVATED STUDENT PROFILE
  ======================================================= */

  const {
    data:
      studentProfile,

    error:
      profileError,
  } =
    await adminClient
      .from(
        'profiles',
      )
      .select(
        `
          id,
          role,
          recovery_email,
          recovery_email_verified_at
        `,
      )
      .eq(
        'id',
        studentRow.user_id,
      )
      .maybeSingle()


  if (
    profileError
  ) {
    throw new Error(
      `Ошибка профиля ученика: ${profileError.message}`,
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
      console.error(
        'reset-password-email: missing env',
      )


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


    let claimedCodeId =
      null


    try {
      /* ===================================================
         INPUT
      =================================================== */

      let body


      try {
        body =
          await request.json()
      } catch {
        return jsonResponse(
          {
            error:
              'Некорректный JSON.',
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
          body?.newPassword ||
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
              'Неверный EDU-логин или код.',
          },
          400,
        )
      }


      if (
        newPassword.length <
        MIN_PASSWORD_LENGTH
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
        MAX_PASSWORD_LENGTH
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
         FIND TEACHER OR STUDENT
      =================================================== */

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


      const recoveryEmail =
        String(
          profile.recovery_email,
        )
          .trim()
          .toLowerCase()


      /* ===================================================
         FIND LATEST ACTIVE OTP
      =================================================== */

      const {
        data:
          codes,

        error:
          codeSearchError,
      } =
        await adminClient
          .from(
            'account_email_codes',
          )
          .select(
            `
              id,
              user_id,
              email,
              code_digest,
              expires_at,
              used_at,
              revoked_at,
              failed_attempts,
              last_attempt_at,
              created_at
            `,
          )
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


      if (
        codeSearchError
      ) {
        throw new Error(
          `Ошибка поиска OTP: ${codeSearchError.message}`,
        )
      }


      const otp =
        codes?.[0] ||
        null


      if (
        !otp
      ) {
        return jsonResponse(
          {
            error:
              'Неверный EDU-логин или код.',
          },
          400,
        )
      }


      /* ===================================================
         EMAIL MUST STILL MATCH PROFILE
      =================================================== */

      const otpEmail =
        String(
          otp.email ||
          '',
        )
          .trim()
          .toLowerCase()


      if (
        otpEmail !==
        recoveryEmail
      ) {
        return jsonResponse(
          {
            error:
              'Код больше недействителен. Запросите новый.',
          },
          400,
        )
      }


      /* ===================================================
         EXPIRED
      =================================================== */

      if (
        new Date(
          otp.expires_at,
        ).getTime() <=
        Date.now()
      ) {
        return jsonResponse(
          {
            error:
              'Код истёк. Запросите новый.',
          },
          400,
        )
      }


      /* ===================================================
         ATTEMPT LOCK
      =================================================== */

      const failedAttempts =
        Number(
          otp.failed_attempts ||
          0,
        )


      if (
        failedAttempts >=
        MAX_FAILED_ATTEMPTS
      ) {
        const lastAttemptTime =
          otp.last_attempt_at
            ? new Date(
                otp.last_attempt_at,
              ).getTime()
            : 0


        const lockUntil =
          lastAttemptTime +
          (
            LOCK_MINUTES *
            60 *
            1000
          )


        if (
          lockUntil >
          Date.now()
        ) {
          return jsonResponse(
            {
              error:
                'Слишком много неверных попыток. Попробуйте позже.',
            },
            429,
          )
        }


        /*
          Блокировка закончилась.
          Начинаем счётчик заново.
        */

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
            otp.id,
          )
      }


      /* ===================================================
         CHECK DIGEST
      =================================================== */

      const submittedDigest =
        await createCodeDigest(
          userId,
          PURPOSE,
          code,
        )


      if (
        submittedDigest !==
        otp.code_digest
      ) {
        const nextAttempts =
          failedAttempts +
          1


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
            otp.id,
          )
          .is(
            'used_at',
            null,
          )
          .is(
            'revoked_at',
            null,
          )


        return jsonResponse(
          {
            error:
              nextAttempts >=
                MAX_FAILED_ATTEMPTS
                ? 'Слишком много неверных попыток. Попробуйте позже.'
                : 'Неверный EDU-логин или код.',
          },
          nextAttempts >=
            MAX_FAILED_ATTEMPTS
            ? 429
            : 400,
        )
      }


      /* ===================================================
         CLAIM OTP

         Один OTP нельзя использовать дважды.
      =================================================== */

      const usedAt =
        new Date()
          .toISOString()


      const {
        data:
          claimedRows,

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
          })
          .eq(
            'id',
            otp.id,
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


      if (
        claimError
      ) {
        throw new Error(
          `Ошибка подтверждения OTP: ${claimError.message}`,
        )
      }


      if (
        !claimedRows ||
        claimedRows.length !==
          1
      ) {
        return jsonResponse(
          {
            error:
              'Код уже использован или больше недействителен.',
          },
          400,
        )
      }


      claimedCodeId =
        otp.id


      /* ===================================================
         CHANGE SUPABASE AUTH PASSWORD
      =================================================== */

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
          Если Auth update упал,
          возвращаем OTP в рабочее состояние.
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
            claimedCodeId,
          )


        claimedCodeId =
          null


        throw new Error(
          `Не удалось изменить пароль: ${passwordError.message}`,
        )
      }


      /* ===================================================
         REVOKE OTHER RECOVERY CODES
      =================================================== */

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
            otp.id,
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
      =================================================== */

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
        message,
      )


      return jsonResponse(
        {
          error:
            'Не удалось изменить пароль. Попробуйте ещё раз.',
        },
        500,
      )
    }
  },
)