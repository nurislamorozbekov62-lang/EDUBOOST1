// @ts-nocheck

import {
  createClient,
} from 'https://esm.sh/@supabase/supabase-js@2'


/* =========================================================
   CONFIG
========================================================= */

const EDU_PATTERN =
  /^EDU-[0-9]{6}$/

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const DEFAULT_EXPIRES_HOURS =
  168

const MAX_EXPIRES_HOURS =
  720


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
   TEXT
========================================================= */

function cleanText(
  value,
) {
  return String(
    value ?? '',
  ).trim()
}


/* =========================================================
   ERROR
========================================================= */

function getErrorMessage(
  error,
) {
  if (
    error instanceof Error
  ) {
    return error.message
  }


  if (
    error &&
    typeof error ===
      'object' &&
    'message' in error
  ) {
    return String(
      error.message ||
      '',
    )
  }


  return String(
    error ||
    'Неизвестная ошибка',
  )
}


/* =========================================================
   SECURE 6 DIGITS

   Генерируем:
   100000 ... 999999

   Math.random() НЕ используем.
========================================================= */

function createSixDigits() {
  const values =
    new Uint32Array(1)

  const possibilities =
    900000

  const maxUint32 =
    0x100000000

  const safeLimit =
    Math.floor(
      maxUint32 /
      possibilities,
    ) *
    possibilities


  let randomValue =
    0


  do {
    crypto.getRandomValues(
      values,
    )

    randomValue =
      values[0]
  } while (
    randomValue >=
    safeLimit
  )


  return String(
    100000 +
    (
      randomValue %
      possibilities
    ),
  )
}


/* =========================================================
   SHA-256

   activate-staff проверяет:

   SHA256("ET-123456")

   Поэтому здесь алгоритм должен быть точно таким же.
========================================================= */

async function sha256Hex(
  value,
) {
  const encoded =
    new TextEncoder()
      .encode(
        value,
      )


  const buffer =
    await crypto.subtle.digest(
      'SHA-256',
      encoded,
    )


  return Array
    .from(
      new Uint8Array(
        buffer,
      ),
    )
    .map(
      (
        byte,
      ) =>
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
   CREATE UNIQUE ET

   ET-123456

   Проверяем digest по ВСЕЙ таблице,
   включая старые / использованные / revoked ET.
========================================================= */

async function createUniqueEtCode(
  adminClient,
) {
  for (
    let attempt = 0;
    attempt < 100;
    attempt += 1
  ) {
    const activationCode =
      `ET-${createSixDigits()}`


    const codeDigest =
      await sha256Hex(
        activationCode,
      )


    const {
      data,
      error,
    } =
      await adminClient
        .from(
          'staff_activation_codes',
        )
        .select(
          'id',
        )
        .eq(
          'code_digest',
          codeDigest,
        )
        .limit(1)


    if (
      error
    ) {
      throw new Error(
        `Не удалось проверить уникальность ET-кода: ${
          error.message ||
          'неизвестная ошибка'
        }`,
      )
    }


    if (
      (
        data ||
        []
      ).length ===
      0
    ) {
      return {
        activationCode,
        codeDigest,
      }
    }
  }


  throw new Error(
    'Не удалось создать уникальный ET-код. Попробуйте ещё раз.',
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
       CORS
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

    const anonKey =
      Deno.env.get(
        'SUPABASE_ANON_KEY',
      )

    const serviceRoleKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY',
      )


    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      console.error(
        'reissue-staff-code env:',
        {
          hasUrl:
            Boolean(
              supabaseUrl,
            ),

          hasAnonKey:
            Boolean(
              anonKey,
            ),

          hasServiceRole:
            Boolean(
              serviceRoleKey,
            ),
        },
      )


      return jsonResponse(
        {
          error:
            'Ошибка конфигурации сервера.',
        },
        500,
      )
    }


    /* =====================================================
       AUTH HEADER
    ===================================================== */

    const authorization =
      request.headers.get(
        'Authorization',
      )


    if (
      !authorization
    ) {
      return jsonResponse(
        {
          error:
            'Необходимо войти в аккаунт.',
        },
        401,
      )
    }


    /* =====================================================
       USER CLIENT

       Проверяет реальную сессию администратора.
    ===================================================== */

    const userClient =
      createClient(
        supabaseUrl,
        anonKey,
        {
          global: {
            headers: {
              Authorization:
                authorization,
            },
          },

          auth: {
            persistSession:
              false,

            autoRefreshToken:
              false,
          },
        },
      )


    /* =====================================================
       SERVICE ROLE

       Нужен только внутри Edge Function.
    ===================================================== */

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
         1. AUTH CALLER
      =================================================== */

      stage =
        'caller-auth'


      const {
        data:
          userData,

        error:
          userError,
      } =
        await userClient
          .auth
          .getUser()


      const caller =
        userData?.user ||
        null


      if (
        userError ||
        !caller
      ) {
        return jsonResponse(
          {
            error:
              'Сессия недействительна. Войдите снова.',
          },
          401,
        )
      }


      /* ===================================================
         2. ADMIN PROFILE
      =================================================== */

      stage =
        'caller-profile'


      const {
        data:
          callerProfile,

        error:
          callerProfileError,
      } =
        await adminClient
          .from(
            'profiles',
          )
          .select(`
            id,
            role,
            school_id
          `)
          .eq(
            'id',
            caller.id,
          )
          .maybeSingle()


      if (
        callerProfileError
      ) {
        throw new Error(
          `Не удалось проверить администратора: ${
            callerProfileError.message
          }`,
        )
      }


      if (
        !callerProfile
      ) {
        return jsonResponse(
          {
            error:
              'Профиль администратора не найден.',
          },
          403,
        )
      }


      if (
        callerProfile.role !==
        'Администратор школы'
      ) {
        return jsonResponse(
          {
            error:
              'Выдавать новый ET-код может только администратор школы.',
          },
          403,
        )
      }


      const schoolId =
        callerProfile.school_id


      if (
        !schoolId
      ) {
        return jsonResponse(
          {
            error:
              'У администратора не указана школа.',
          },
          400,
        )
      }


      /* ===================================================
         3. INPUT
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
              'Некорректный формат запроса.',
          },
          400,
        )
      }


      const teacherId =
        cleanText(
          body?.teacherId,
        )


      const expiresHours =
        Number(
          body?.expiresHours ??
          DEFAULT_EXPIRES_HOURS,
        )


      if (
        !UUID_PATTERN.test(
          teacherId,
        )
      ) {
        return jsonResponse(
          {
            error:
              'Некорректный ID учителя.',
          },
          400,
        )
      }


      if (
        !Number.isInteger(
          expiresHours,
        ) ||
        expiresHours <
        1 ||
        expiresHours >
        MAX_EXPIRES_HOURS
      ) {
        return jsonResponse(
          {
            error:
              'Некорректный срок действия ET-кода.',
          },
          400,
        )
      }


      /* ===================================================
         4. LOAD TEACHER

         ВАЖНО:
         admin может работать только со своей школой.
      =================================================== */

      stage =
        'teacher-profile'


      const {
        data:
          teacher,

        error:
          teacherError,
      } =
        await adminClient
          .from(
            'profiles',
          )
          .select(`
            id,
            name,
            role,
            school,
            school_id,
            edu_login,
            recovery_email_verified_at
          `)
          .eq(
            'id',
            teacherId,
          )
          .maybeSingle()


      if (
        teacherError
      ) {
        throw new Error(
          `Не удалось загрузить учителя: ${
            teacherError.message
          }`,
        )
      }


      if (
        !teacher ||
        teacher.role !==
          'Учитель' ||
        teacher.school_id !==
          schoolId
      ) {
        return jsonResponse(
          {
            error:
              'Учитель не найден в вашей школе.',
          },
          404,
        )
      }


      /* ===================================================
         5. CHECK TEACHER ACCOUNT STATUS

         UI уже блокирует выдачу нового ET для
         деактивированного учителя, но Edge Function
         должна проверять это самостоятельно.

         Семантика staff_account_status:
         строки нет = active
         status = deactivated = выдача ET запрещена
      =================================================== */

      stage =
        'teacher-status'


      const {
        data:
          teacherStatus,

        error:
          teacherStatusError,
      } =
        await adminClient
          .from(
            'staff_account_status',
          )
          .select(`
            status,
            school_id
          `)
          .eq(
            'user_id',
            teacher.id,
          )
          .maybeSingle()


      if (
        teacherStatusError
      ) {
        throw new Error(
          `Не удалось проверить статус аккаунта учителя: ${
            teacherStatusError.message
          }`,
        )
      }


      if (
        teacherStatus?.school_id &&
        teacherStatus.school_id !==
          schoolId
      ) {
        throw new Error(
          'Статус аккаунта учителя относится к другой школе.',
        )
      }


      if (
        teacherStatus?.status ===
          'deactivated'
      ) {
        return jsonResponse(
          {
            error:
              'Доступ учителя отключён. Сначала восстановите аккаунт, затем при необходимости выдайте новый ET-код.',
          },
          409,
        )
      }


      const eduLogin =
        cleanText(
          teacher.edu_login,
        )
          .toUpperCase()


      if (
        !EDU_PATTERN.test(
          eduLogin,
        )
      ) {
        return jsonResponse(
          {
            error:
              'У учителя отсутствует корректный EDU-логин.',
          },
          400,
        )
      }


      /* ===================================================
         5. LOAD AUTH USER
      =================================================== */

      stage =
        'auth-user'


      const {
        data:
          authData,

        error:
          authError,
      } =
        await adminClient
          .auth
          .admin
          .getUserById(
            teacher.id,
          )


      if (
        authError ||
        !authData?.user
      ) {
        return jsonResponse(
          {
            error:
              'Auth-аккаунт учителя не найден.',
          },
          404,
        )
      }


      const authUser =
        authData.user


      const userMetadata =
        (
          authUser.user_metadata &&
          typeof authUser.user_metadata ===
            'object'
        )
          ? authUser.user_metadata
          : {}


      /* ===================================================
         6. CHECK ACTIVATION STATUS

         НОВЫЙ ET выдаём ТОЛЬКО если учитель
         ещё не активировал аккаунт.

         Проверяем:

         A) pending_activation
         B) использованный ET
         C) verified recovery email
      =================================================== */

      stage =
        'activation-check'


      const {
        data:
          usedCodeRows,

        error:
          usedCodesError,
      } =
        await adminClient
          .from(
            'staff_activation_codes',
          )
          .select(
            'id',
          )
          .eq(
            'user_id',
            teacher.id,
          )
          .eq(
            'role',
            'Учитель',
          )
          .not(
            'used_at',
            'is',
            null,
          )
          .limit(1)


      if (
        usedCodesError
      ) {
        throw new Error(
          `Не удалось проверить активацию: ${
            usedCodesError.message
          }`,
        )
      }


      const hasUsedEt =
        (
          usedCodeRows ||
          []
        ).length >
        0


      const metadataActivated =
        userMetadata
          .pending_activation ===
        false


      const hasVerifiedRecoveryEmail =
        Boolean(
          teacher
            .recovery_email_verified_at,
        )


      if (
        metadataActivated ||
        hasUsedEt ||
        hasVerifiedRecoveryEmail
      ) {
        return jsonResponse(
          {
            error:
              'Аккаунт учителя уже активирован. Используйте восстановление пароля.',
          },
          409,
        )
      }


      /* ===================================================
         7. GENERATE NEW ET
      =================================================== */

      stage =
        'generate-et'


      const {
        activationCode,
        codeDigest,
      } =
        await createUniqueEtCode(
          adminClient,
        )


      const expiresAt =
        new Date(
          Date.now() +
          expiresHours *
          60 *
          60 *
          1000,
        ).toISOString()


      /* ===================================================
         8. CREATE NEW CODE FIRST

         Сначала создаём новый ET.

         Это безопаснее, чем сначала уничтожать старый:
         если INSERT упадёт — старый ET ещё останется рабочим.
      =================================================== */

      stage =
        'insert-new-et'


      const {
        data:
          newCodeRow,

        error:
          insertError,
      } =
        await adminClient
          .from(
            'staff_activation_codes',
          )
          .insert({
            user_id:
              teacher.id,

            school_id:
              schoolId,

            role:
              'Учитель',

            code_digest:
              codeDigest,

            expires_at:
              expiresAt,

            failed_attempts:
              0,

            created_by:
              caller.id,
          })
          .select(
            'id',
          )
          .single()


      if (
        insertError ||
        !newCodeRow
      ) {
        throw new Error(
          `Не удалось сохранить новый ET-код: ${
            insertError?.message ||
            'неизвестная ошибка'
          }`,
        )
      }


      /* ===================================================
         9. REVOKE OLD ACTIVE CODES

         Новый код исключаем по id.
      =================================================== */

      stage =
        'revoke-old-et'


      const revokedAt =
        new Date()
          .toISOString()


      const {
        error:
          revokeError,
      } =
        await adminClient
          .from(
            'staff_activation_codes',
          )
          .update({
            revoked_at:
              revokedAt,
          })
          .eq(
            'user_id',
            teacher.id,
          )
          .eq(
            'role',
            'Учитель',
          )
          .neq(
            'id',
            newCodeRow.id,
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
        /*
          Не хотим оставить одновременно
          старый и новый действующий ET.

          Поэтому если revoke старых кодов
          не удался — отменяем новый.
        */

        await adminClient
          .from(
            'staff_activation_codes',
          )
          .update({
            revoked_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            newCodeRow.id,
          )
          .is(
            'used_at',
            null,
          )
          .is(
            'revoked_at',
            null,
          )


        throw new Error(
          `Не удалось отменить предыдущий ET-код: ${
            revokeError.message ||
            'неизвестная ошибка'
          }`,
        )
      }


      /* ===================================================
         10. SUCCESS
      =================================================== */

      stage =
        'success'


      console.log(
        'reissue-staff-code success:',
        {
          teacherId:
            teacher.id,

          eduLogin,

          schoolId,

          codeId:
            newCodeRow.id,
        },
      )


      return jsonResponse({
        success:
          true,

        teacherId:
          teacher.id,

        fullName:
          teacher.name,

        eduLogin,

        activationCode,

        expiresAt,

        message:
          'Новый ET-код создан. Предыдущий ET-код больше не действует.',
      })
    } catch (
      error
    ) {
      const message =
        getErrorMessage(
          error,
        )


      console.error(
        'reissue-staff-code FAILED:',
        {
          stage,
          message,
          error,
        },
      )


      return jsonResponse(
        {
          error:
            message ||
            'Не удалось выдать новый ET-код.',

          stage,
        },
        500,
      )
    }
  },
)