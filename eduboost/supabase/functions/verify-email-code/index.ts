// @ts-nocheck

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'


const MAX_FAILED_ATTEMPTS = 5
const LOCK_MINUTES = 15


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',

  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
}


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


function cleanText(value) {
  return String(
    value ?? '',
  ).trim()
}


function normalizeCode(value) {
  return cleanText(
    value,
  )
    .replace(/[\s-]/g, '')
}


async function createCodeDigest(
  userId,
  purpose,
  code,
) {
  const source =
    `${userId}:${purpose}:${code}`

  const bytes =
    new TextEncoder()
      .encode(
        source,
      )

  const hash =
    await crypto.subtle.digest(
      'SHA-256',
      bytes,
    )

  return Array
    .from(
      new Uint8Array(
        hash,
      ),
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


  const lastAttemptTime =
    new Date(
      lastAttemptAt,
    ).getTime()


  if (
    Number.isNaN(
      lastAttemptTime,
    )
  ) {
    return 0
  }


  const unlockTime =
    lastAttemptTime +
    LOCK_MINUTES *
      60 *
      1000


  const remaining =
    unlockTime -
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


Deno.serve(
  async (request) => {
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
      return jsonResponse(
        {
          error:
            'Ошибка конфигурации сервера.',
        },
        500,
      )
    }


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
         1. USER
      =================================================== */

      stage =
        'user'


      const {
        data:
          userData,

        error:
          userError,
      } =
        await userClient
          .auth
          .getUser()


      if (
        userError ||
        !userData?.user
      ) {
        return jsonResponse(
          {
            error:
              'Сессия недействительна. Войдите снова.',
          },
          401,
        )
      }


      const userId =
        userData.user.id


      /* ===================================================
         2. INPUT
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


      const code =
        normalizeCode(
          body?.code,
        )


      if (
        !/^[0-9]{6}$/.test(
          code,
        )
      ) {
        return jsonResponse(
          {
            error:
              'Введите 6-значный код из письма.',
          },
          400,
        )
      }


      const purpose =
        'verify_recovery_email'


      /* ===================================================
         3. FIND ACTIVE CODE
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
          .select(
            `
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
            `,
          )
          .eq(
            'user_id',
            userId,
          )
          .eq(
            'purpose',
            purpose,
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
          `Ошибка поиска кода: ${codeError.message}`,
        )
      }


      if (
        !codeRow
      ) {
        return jsonResponse(
          {
            error:
              'Активный код не найден. Запросите новый код.',
          },
          400,
        )
      }


      /* ===================================================
         4. EXPIRED
      =================================================== */

      stage =
        'expiration'


      const expiresAt =
        new Date(
          codeRow.expires_at,
        )
          .getTime()


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
         5. LOCK
      =================================================== */

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
        remainingSeconds > 0
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
        Блокировка закончилась.
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
            `Ошибка сброса блокировки: ${resetError.message}`,
          )
        }


        failedAttempts = 0
      }


      /* ===================================================
         6. VERIFY HASH
      =================================================== */

      stage =
        'verify'


      const enteredDigest =
        await createCodeDigest(
          userId,
          purpose,
          code,
        )


      if (
        enteredDigest !==
        codeRow.code_digest
      ) {
        const nextAttempts =
          failedAttempts +
          1


        const now =
          new Date()
            .toISOString()


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
                now,
            })
            .eq(
              'id',
              codeRow.id,
            )


        if (
          attemptError
        ) {
          throw new Error(
            `Ошибка обновления попыток: ${attemptError.message}`,
          )
        }


        if (
          nextAttempts >=
          MAX_FAILED_ATTEMPTS
        ) {
          return jsonResponse(
            {
              error:
                `Слишком много неправильных попыток. Проверка заблокирована на ${LOCK_MINUTES} минут.`,

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
              'Неверный код.',

            attemptsLeft:
              MAX_FAILED_ATTEMPTS -
              nextAttempts,
          },
          400,
        )
      }


      /* ===================================================
         7. CLAIM CODE
      =================================================== */

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
          `Ошибка подтверждения кода: ${claimError.message}`,
        )
      }


      if (
        !claimedCode
      ) {
        return jsonResponse(
          {
            error:
              'Этот код уже использован. Запросите новый.',
          },
          409,
        )
      }


      /* ===================================================
         8. UPDATE PROFILE

         Email берём ТОЛЬКО из записи OTP.
         Не доверяем email из frontend.
      =================================================== */

      stage =
        'update-profile'


      const verifiedAt =
        new Date()
          .toISOString()


      const {
        error:
          profileError,
      } =
        await adminClient
          .from(
            'profiles',
          )
          .update({
            recovery_email:
              String(
                codeRow.email,
              )
                .trim()
                .toLowerCase(),

            recovery_email_verified_at:
              verifiedAt,
          })
          .eq(
            'id',
            userId,
          )


      if (
        profileError
      ) {
        /*
          Не удалось обновить профиль —
          возвращаем код в доступное состояние.
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
          `Не удалось сохранить recovery email: ${profileError.message}`,
        )
      }


      /* ===================================================
         9. REVOKE OTHER VERIFY CODES
      =================================================== */

      stage =
        'revoke-others'


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
            purpose,
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
          'verify-email-code revoke:',
          revokeError,
        )
      }


      /* ===================================================
         10. SUCCESS
      =================================================== */

      console.log(
        'verify-email-code success:',
        {
          userId,
        },
      )


      return jsonResponse({
        success:
          true,

        message:
          'Email подтверждён.',

        recoveryEmailVerifiedAt:
          verifiedAt,
      })
    } catch (
      error
    ) {
      const message =
        error instanceof
          Error
          ? error.message
          : String(
              error ||
              'Неизвестная ошибка',
            )


      console.error(
        'verify-email-code FAILED:',
        {
          stage,
          message,
        },
      )


      return jsonResponse(
        {
          error:
            'Не удалось подтвердить email.',

          stage,
        },
        500,
      )
    }
  },
)