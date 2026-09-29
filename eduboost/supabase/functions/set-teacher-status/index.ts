// @ts-nocheck

import {
  createClient,
} from 'https://esm.sh/@supabase/supabase-js@2'


/* =========================================================
   CONFIG
========================================================= */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/*
  Практически постоянная блокировка:
  около 100 лет.

  Учителя НЕ удаляем.
*/
const DEACTIVATION_BAN_DURATION =
  '876000h'


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


/*
  Если до нашей операции пользователь
  уже был заблокирован по другой причине,
  при rollback стараемся восстановить
  примерно оставшийся срок ban.
*/
function getPreviousBanDuration(
  authUser,
) {
  const bannedUntil =
    authUser?.banned_until

  if (!bannedUntil) {
    return 'none'
  }

  const until =
    new Date(
      bannedUntil,
    ).getTime()

  const now =
    Date.now()

  if (
    Number.isNaN(until) ||
    until <= now
  ) {
    return 'none'
  }

  const seconds =
    Math.max(
      1,
      Math.ceil(
        (until - now) /
        1000,
      ),
    )

  return `${seconds}s`
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
        'set-teacher-status env missing',
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
       CLIENTS
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


    /*
      Данные для rollback.
    */

    let teacher =
      null

    let previousStatus =
      null

    let previousAppMetadata =
      {}

    let previousBanDuration =
      'none'

    let authChanged =
      false

    let statusChanged =
      false

    let revokedEtIds =
      []


    try {
      /* ===================================================
         1. CALLER
      =================================================== */

      stage =
        'caller-auth'


      const {
        data:
          callerData,

        error:
          callerError,
      } =
        await userClient
          .auth
          .getUser()


      const caller =
        callerData?.user ||
        null


      if (
        callerError ||
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
         2. CALLER PROFILE
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


      /*
        Пока не расширяем права на Завуча
        или Директора самостоятельно.

        Управление аккаунтом:
        только Администратор школы.
      */

      if (
        callerProfile.role !==
        'Администратор школы'
      ) {
        return jsonResponse(
          {
            error:
              'Управлять доступом учителей может только администратор школы.',
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


      const action =
        cleanText(
          body?.action,
        )
          .toLowerCase()


      const reason =
        cleanText(
          body?.reason,
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
        ![
          'deactivate',
          'reactivate',
        ].includes(
          action,
        )
      ) {
        return jsonResponse(
          {
            error:
              'Некорректное действие.',
          },
          400,
        )
      }


      /*
        Для деактивации причина обязательна.
        В журнале должна оставаться
        осмысленная запись.
      */

      if (
        action ===
          'deactivate' &&
        reason.length <
          3
      ) {
        return jsonResponse(
          {
            error:
              'Укажите причину деактивации.',
          },
          400,
        )
      }


      if (
        reason.length >
        500
      ) {
        return jsonResponse(
          {
            error:
              'Причина слишком длинная. Максимум 500 символов.',
          },
          400,
        )
      }


      /* ===================================================
         4. TARGET TEACHER
      =================================================== */

      stage =
        'teacher-profile'


      const {
        data:
          teacherRow,

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
            school_id,
            edu_login,
            position
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
        !teacherRow ||
        teacherRow.role !==
          'Учитель' ||
        teacherRow.school_id !==
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


      teacher =
        teacherRow


      /*
        Дополнительная защита:
        администратор не может случайно
        применить эту функцию к себе.
      */

      if (
        teacher.id ===
        caller.id
      ) {
        return jsonResponse(
          {
            error:
              'Нельзя изменить статус собственного аккаунта этой функцией.',
          },
          400,
        )
      }


      /* ===================================================
         5. CURRENT STATUS
      =================================================== */

      stage =
        'current-status'


      const {
        data:
          currentStatus,

        error:
          statusError,
      } =
        await adminClient
          .from(
            'staff_account_status',
          )
          .select(`
            user_id,
            school_id,
            status,
            deactivated_at,
            deactivated_by,
            deactivation_reason,
            reactivated_at,
            reactivated_by,
            created_at,
            updated_at
          `)
          .eq(
            'user_id',
            teacher.id,
          )
          .maybeSingle()


      if (
        statusError
      ) {
        throw new Error(
          `Не удалось проверить статус учителя: ${
            statusError.message
          }`,
        )
      }


      previousStatus =
        currentStatus ||
        null


      /*
        Отсутствие строки =
        ACTIVE.
      */

      const currentState =
        currentStatus
          ?.status ===
          'deactivated'
          ? 'deactivated'
          : 'active'


      /* ===================================================
         6. IDEMPOTENT NO-OP
      =================================================== */

      if (
        action ===
          'deactivate' &&
        currentState ===
          'deactivated'
      ) {
        return jsonResponse({
          success:
            true,

          changed:
            false,

          teacherId:
            teacher.id,

          fullName:
            teacher.name,

          status:
            'deactivated',

          message:
            'Учитель уже деактивирован.',
        })
      }


      /*
        Очень важно:

        Если нашей строки deactivated нет,
        НЕ снимаем бан автоматически.

        Иначе случайно можно снять
        чужую security-блокировку.
      */

      if (
        action ===
          'reactivate' &&
        currentState !==
          'deactivated'
      ) {
        return jsonResponse({
          success:
            true,

          changed:
            false,

          teacherId:
            teacher.id,

          fullName:
            teacher.name,

          status:
            'active',

          message:
            'Аккаунт учителя уже активен.',
        })
      }


      /* ===================================================
         7. AUTH USER
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


      previousAppMetadata =
        (
          authUser.app_metadata &&
          typeof authUser
            .app_metadata ===
            'object'
        )
          ? {
              ...authUser
                .app_metadata,
            }
          : {}


      previousBanDuration =
        getPreviousBanDuration(
          authUser,
        )


      /* ===================================================
         8A. DEACTIVATE
      =================================================== */

      if (
        action ===
        'deactivate'
      ) {
        const now =
          new Date()
            .toISOString()


        /* ===============================================
           AUTH BAN

           Не удаляем Auth user.
        =============================================== */

        stage =
          'auth-ban'


        const {
          error:
            banError,
        } =
          await adminClient
            .auth
            .admin
            .updateUserById(
              teacher.id,
              {
                ban_duration:
                  DEACTIVATION_BAN_DURATION,

                app_metadata: {
                  ...previousAppMetadata,

                  staff_account_status:
                    'deactivated',

                  staff_deactivated_at:
                    now,
                },
              },
            )


        if (
          banError
        ) {
          throw new Error(
            `Не удалось заблокировать вход учителя: ${
              getErrorMessage(
                banError,
              )
            }`,
          )
        }


        authChanged =
          true


        /* ===============================================
           FIND ACTIVE UNUSED ET
        =============================================== */

        stage =
          'find-et'


        const {
          data:
            activeEtRows,

          error:
            etLookupError,
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
            .is(
              'used_at',
              null,
            )
            .is(
              'revoked_at',
              null,
            )


        if (
          etLookupError
        ) {
          throw new Error(
            `Не удалось проверить ET-коды: ${
              etLookupError.message
            }`,
          )
        }


        revokedEtIds =
          (
            activeEtRows ||
            []
          ).map(
            (
              row,
            ) =>
              row.id,
          )


        /* ===============================================
           REVOKE ET

           Старые ET после восстановления
           автоматически не оживляем.
        =============================================== */

        if (
          revokedEtIds.length >
          0
        ) {
          stage =
            'revoke-et'


          const {
            error:
              revokeEtError,
          } =
            await adminClient
              .from(
                'staff_activation_codes',
              )
              .update({
                revoked_at:
                  now,
              })
              .in(
                'id',
                revokedEtIds,
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
            revokeEtError
          ) {
            throw new Error(
              `Не удалось отозвать ET-коды: ${
                revokeEtError.message
              }`,
            )
          }
        }


        /* ===============================================
           SAVE CURRENT STATUS
        =============================================== */

        stage =
          'save-status'


        const {
          error:
            statusUpdateError,
        } =
          await adminClient
            .from(
              'staff_account_status',
            )
            .upsert(
              {
                user_id:
                  teacher.id,

                school_id:
                  schoolId,

                status:
                  'deactivated',

                deactivated_at:
                  now,

                deactivated_by:
                  caller.id,

                deactivation_reason:
                  reason,

                reactivated_at:
                  null,

                reactivated_by:
                  null,
              },
              {
                onConflict:
                  'user_id',
              },
            )


        if (
          statusUpdateError
        ) {
          throw new Error(
            `Не удалось сохранить статус учителя: ${
              statusUpdateError.message
            }`,
          )
        }


        statusChanged =
          true


        /* ===============================================
           AUDIT HISTORY
        =============================================== */

        stage =
          'history'


        const {
          error:
            historyError,
        } =
          await adminClient
            .from(
              'staff_account_status_history',
            )
            .insert({
              user_id:
                teacher.id,

              school_id:
                schoolId,

              action:
                'deactivated',

              reason,

              actor_id:
                caller.id,
            })


        if (
          historyError
        ) {
          throw new Error(
            `Не удалось сохранить историю деактивации: ${
              historyError.message
            }`,
          )
        }


        /* ===============================================
           SUCCESS
        =============================================== */

        return jsonResponse({
          success:
            true,

          changed:
            true,

          teacherId:
            teacher.id,

          fullName:
            teacher.name,

          eduLogin:
            teacher.edu_login,

          status:
            'deactivated',

          revokedEtCount:
            revokedEtIds.length,

          message:
            'Доступ учителя деактивирован. История аккаунта сохранена.',
        })
      }


      /* ===================================================
         8B. REACTIVATE
      =================================================== */

      const now =
        new Date()
          .toISOString()


      /* ===============================================
         AUTH UNBAN

         ban_duration='none'
         снимает наш ban.
      =============================================== */

      stage =
        'auth-unban'


      const {
        error:
          unbanError,
      } =
        await adminClient
          .auth
          .admin
          .updateUserById(
            teacher.id,
            {
              ban_duration:
                'none',

              app_metadata: {
                ...previousAppMetadata,

                staff_account_status:
                  'active',

                staff_reactivated_at:
                  now,
              },
            },
          )


      if (
        unbanError
      ) {
        throw new Error(
          `Не удалось восстановить вход учителя: ${
            getErrorMessage(
              unbanError,
            )
          }`,
        )
      }


      authChanged =
        true


      /* ===============================================
         STATUS ACTIVE
      =============================================== */

      stage =
        'reactivate-status'


      const {
        error:
          reactivateError,
      } =
        await adminClient
          .from(
            'staff_account_status',
          )
          .update({
            status:
              'active',

            reactivated_at:
              now,

            reactivated_by:
              caller.id,
          })
          .eq(
            'user_id',
            teacher.id,
          )
          .eq(
            'school_id',
            schoolId,
          )
          .eq(
            'status',
            'deactivated',
          )


      if (
        reactivateError
      ) {
        throw new Error(
          `Не удалось восстановить статус учителя: ${
            reactivateError.message
          }`,
        )
      }


      statusChanged =
        true


      /* ===============================================
         HISTORY
      =============================================== */

      stage =
        'reactivate-history'


      const {
        error:
          historyError,
      } =
        await adminClient
          .from(
            'staff_account_status_history',
          )
          .insert({
            user_id:
              teacher.id,

            school_id:
              schoolId,

            action:
              'reactivated',

            reason:
              reason ||
              null,

            actor_id:
              caller.id,
          })


      if (
        historyError
      ) {
        throw new Error(
          `Не удалось сохранить историю восстановления: ${
            historyError.message
          }`,
        )
      }


      return jsonResponse({
        success:
          true,

        changed:
          true,

        teacherId:
          teacher.id,

        fullName:
          teacher.name,

        eduLogin:
          teacher.edu_login,

        status:
          'active',

        /*
          Старые revoked ET НЕ возвращаем.

          Если учитель ещё не активирован,
          администратор после восстановления
          выдаст ему новый ET.
        */

        message:
          'Доступ учителя восстановлен.',
      })
    } catch (
      error
    ) {
      const message =
        getErrorMessage(
          error,
        )


      console.error(
        'set-teacher-status FAILED:',
        {
          stage,
          message,
          error,
        },
      )


      /* ===================================================
         BEST-EFFORT ROLLBACK
      =================================================== */

      if (
        teacher
      ) {
        try {
          /* =============================================
             ROLLBACK STATUS
          ============================================= */

          if (
            statusChanged
          ) {
            if (
              previousStatus
            ) {
              await adminClient
                .from(
                  'staff_account_status',
                )
                .upsert(
                  {
                    user_id:
                      previousStatus.user_id,

                    school_id:
                      previousStatus.school_id,

                    status:
                      previousStatus.status,

                    deactivated_at:
                      previousStatus.deactivated_at,

                    deactivated_by:
                      previousStatus.deactivated_by,

                    deactivation_reason:
                      previousStatus.deactivation_reason,

                    reactivated_at:
                      previousStatus.reactivated_at,

                    reactivated_by:
                      previousStatus.reactivated_by,
                  },
                  {
                    onConflict:
                      'user_id',
                  },
                )
            } else {
              await adminClient
                .from(
                  'staff_account_status',
                )
                .delete()
                .eq(
                  'user_id',
                  teacher.id,
                )
            }
          }


          /* =============================================
             RESTORE ET ONLY IF DEACTIVATION FAILED

             Возвращаем только ET,
             которые именно эта операция
             успела отозвать.
          ============================================= */

          if (
            revokedEtIds.length >
            0
          ) {
            await adminClient
              .from(
                'staff_activation_codes',
              )
              .update({
                revoked_at:
                  null,
              })
              .in(
                'id',
                revokedEtIds,
              )
              .is(
                'used_at',
                null,
              )
          }


          /* =============================================
             RESTORE AUTH
          ============================================= */

          if (
            authChanged
          ) {
            await adminClient
              .auth
              .admin
              .updateUserById(
                teacher.id,
                {
                  ban_duration:
                    previousBanDuration,

                  app_metadata:
                    previousAppMetadata,
                },
              )
          }
        } catch (
          rollbackError
        ) {
          console.error(
            'set-teacher-status rollback FAILED:',
            rollbackError,
          )
        }
      }


      return jsonResponse(
        {
          error:
            message ||
            'Не удалось изменить статус учителя.',

          stage,
        },
        500,
      )
    }
  },
)