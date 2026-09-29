// @ts-nocheck

import {
  createClient,
} from 'https://esm.sh/@supabase/supabase-js@2'


/* =========================================================
   CONFIG
========================================================= */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i


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
      Нужны для best-effort rollback,
      если ошибка случится после начала
      обновления.
    */

    let teacher = null

    let oldWorkloads = []

    let oldUserMetadata = {}

    let profileChanged =
      false

    let authChanged =
      false

    let workloadsDeleted =
      false


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
              'Изменять сотрудников может только администратор школы.',
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


      const fullName =
        cleanText(
          body?.fullName,
        )


      const position =
        cleanText(
          body?.position,
        ) ||
        'Учитель'


      const sourceAssignments =
        Array.isArray(
          body?.assignments,
        )
          ? body.assignments
          : []


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
        fullName.length <
        3
      ) {
        return jsonResponse(
          {
            error:
              'Введите ФИО учителя.',
          },
          400,
        )
      }


      if (
        fullName.length >
        160
      ) {
        return jsonResponse(
          {
            error:
              'ФИО учителя слишком длинное.',
          },
          400,
        )
      }


      if (
        position.length >
        120
      ) {
        return jsonResponse(
          {
            error:
              'Название должности слишком длинное.',
          },
          400,
        )
      }


      /* ===================================================
         4. NORMALIZE ASSIGNMENTS

         В отличие от create-teacher,
         здесь разрешаем пустую нагрузку.

         Учитель может временно не иметь
         назначенных классов.
      =================================================== */

      stage =
        'assignments'


      const assignments =
        sourceAssignments.map(
          (
            item,
          ) => ({
            classId:
              cleanText(
                item?.classId,
              ),

            subject:
              cleanText(
                item?.subject,
              ),

            weeklyHours:
              Number(
                item?.weeklyHours ??
                1,
              ),

            groupName:
              cleanText(
                item?.groupName,
              ),
          }),
        )


      const assignmentKeys =
        new Set()


      for (
        const assignment
        of assignments
      ) {
        if (
          !UUID_PATTERN.test(
            assignment.classId,
          )
        ) {
          return jsonResponse(
            {
              error:
                'Не выбран корректный класс.',
            },
            400,
          )
        }


        if (
          !assignment.subject
        ) {
          return jsonResponse(
            {
              error:
                'Не указан предмет.',
            },
            400,
          )
        }


        if (
          assignment.subject.length >
          120
        ) {
          return jsonResponse(
            {
              error:
                'Название предмета слишком длинное.',
            },
            400,
          )
        }


        if (
          assignment.groupName.length >
          80
        ) {
          return jsonResponse(
            {
              error:
                'Название подгруппы слишком длинное.',
            },
            400,
          )
        }


        if (
          !Number.isInteger(
            assignment.weeklyHours,
          ) ||
          assignment.weeklyHours <
            1 ||
          assignment.weeklyHours >
            40
        ) {
          return jsonResponse(
            {
              error:
                'Количество часов должно быть от 1 до 40.',
            },
            400,
          )
        }


        const duplicateKey =
          [
            assignment.classId,

            assignment.subject
              .toLowerCase(),

            assignment.groupName
              .toLowerCase(),
          ].join('|')


        if (
          assignmentKeys.has(
            duplicateKey,
          )
        ) {
          return jsonResponse(
            {
              error:
                `Назначение «${assignment.subject}» для этого класса уже добавлено.`,
            },
            400,
          )
        }


        assignmentKeys.add(
          duplicateKey,
        )
      }


      /* ===================================================
         5. LOAD TEACHER
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
            position,
            school,
            school_id,
            edu_login
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


      /* ===================================================
         6. CHECK CLASSES
      =================================================== */

      stage =
        'classes'


      const classIds =
        [
          ...new Set(
            assignments.map(
              (
                assignment,
              ) =>
                assignment.classId,
            ),
          ),
        ]


      let classes =
        []


      if (
        classIds.length >
        0
      ) {
        const {
          data:
            classRows,

          error:
            classesError,
        } =
          await adminClient
            .from(
              'school_classes',
            )
            .select(`
              id,
              school_id,
              class_name,
              academic_year,
              is_active
            `)
            .eq(
              'school_id',
              schoolId,
            )
            .eq(
              'is_active',
              true,
            )
            .in(
              'id',
              classIds,
            )


        if (
          classesError
        ) {
          throw new Error(
            `Не удалось проверить классы: ${
              classesError.message
            }`,
          )
        }


        classes =
          classRows ||
          []


        if (
          classes.length !==
          classIds.length
        ) {
          return jsonResponse(
            {
              error:
                'Один из выбранных классов не найден, неактивен или относится к другой школе.',
            },
            400,
          )
        }
      }


      const classMap =
        new Map(
          classes.map(
            (
              schoolClass,
            ) => [
              schoolClass.id,
              schoolClass,
            ],
          ),
        )


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


      oldUserMetadata =
        (
          authData.user
            .user_metadata &&
          typeof authData.user
            .user_metadata ===
            'object'
        )
          ? {
              ...authData.user
                .user_metadata,
            }
          : {}


      /* ===================================================
         8. OLD WORKLOADS

         Сохраняем их для rollback.
      =================================================== */

      stage =
        'old-workloads'


      const {
        data:
          oldWorkloadRows,

        error:
          oldWorkloadError,
      } =
        await adminClient
          .from(
            'teacher_workloads',
          )
          .select(`
            id,
            school_id,
            teacher_id,
            class_name,
            subject,
            weekly_hours,
            group_name,
            academic_year,
            notes,
            created_by,
            created_at,
            updated_at
          `)
          .eq(
            'teacher_id',
            teacher.id,
          )
          .eq(
            'school_id',
            schoolId,
          )


      if (
        oldWorkloadError
      ) {
        throw new Error(
          `Не удалось загрузить текущую нагрузку: ${
            oldWorkloadError.message
          }`,
        )
      }


      oldWorkloads =
        oldWorkloadRows ||
        []


      /* ===================================================
         9. UPDATE PROFILE

         role / school / edu_login НЕ ТРОГАЕМ.
      =================================================== */

      stage =
        'update-profile'


      const {
        error:
          profileUpdateError,
      } =
        await adminClient
          .from(
            'profiles',
          )
          .update({
            name:
              fullName,

            position,
          })
          .eq(
            'id',
            teacher.id,
          )
          .eq(
            'school_id',
            schoolId,
          )


      if (
        profileUpdateError
      ) {
        throw new Error(
          `Не удалось обновить профиль учителя: ${
            profileUpdateError.message
          }`,
        )
      }


      profileChanged =
        true


      /* ===================================================
         10. UPDATE AUTH METADATA

         Пароль, email, EDU и recovery
         не меняем.
      =================================================== */

      stage =
        'update-auth'


      const {
        error:
          authUpdateError,
      } =
        await adminClient
          .auth
          .admin
          .updateUserById(
            teacher.id,
            {
              user_metadata: {
                ...oldUserMetadata,

                name:
                  fullName,

                role:
                  'Учитель',
              },
            },
          )


      if (
        authUpdateError
      ) {
        throw new Error(
          `Не удалось обновить Auth учителя: ${
            getErrorMessage(
              authUpdateError,
            )
          }`,
        )
      }


      authChanged =
        true


      /* ===================================================
         11. REPLACE WORKLOADS
      =================================================== */

      stage =
        'delete-old-workloads'


      const {
        error:
          deleteError,
      } =
        await adminClient
          .from(
            'teacher_workloads',
          )
          .delete()
          .eq(
            'teacher_id',
            teacher.id,
          )
          .eq(
            'school_id',
            schoolId,
          )


      if (
        deleteError
      ) {
        throw new Error(
          `Не удалось заменить старую нагрузку: ${
            deleteError.message
          }`,
        )
      }


      workloadsDeleted =
        true


      const workloadRows =
        assignments.map(
          (
            assignment,
          ) => {
            const schoolClass =
              classMap.get(
                assignment.classId,
              )


            if (
              !schoolClass
            ) {
              throw new Error(
                'Класс не найден.',
              )
            }


            return {
              school_id:
                schoolId,

              teacher_id:
                teacher.id,

              class_name:
                schoolClass
                  .class_name,

              subject:
                assignment.subject,

              weekly_hours:
                assignment
                  .weeklyHours,

              group_name:
                assignment
                  .groupName,

              academic_year:
                schoolClass
                  .academic_year,

              notes:
                '',

              created_by:
                caller.id,
            }
          },
        )


      let insertedRows =
        []


      if (
        workloadRows.length >
        0
      ) {
        stage =
          'insert-workloads'


        const {
          data:
            inserted,

          error:
            insertError,
        } =
          await adminClient
            .from(
              'teacher_workloads',
            )
            .insert(
              workloadRows,
            )
            .select(`
              id,
              teacher_id,
              class_name,
              subject,
              weekly_hours,
              group_name,
              academic_year
            `)


        if (
          insertError
        ) {
          throw new Error(
            `Не удалось сохранить новую нагрузку: ${
              insertError.message
            }`,
          )
        }


        insertedRows =
          inserted ||
          []
      }


      /* ===================================================
         12. SUCCESS
      =================================================== */

      stage =
        'success'


      console.log(
        'update-teacher success:',
        {
          teacherId:
            teacher.id,

          schoolId,

          assignments:
            workloadRows.length,
        },
      )


      return jsonResponse({
        success:
          true,

        teacherId:
          teacher.id,

        fullName,

        position,

        eduLogin:
          teacher.edu_login,

        assignments:
          insertedRows.map(
            (
              row,
            ) => ({
              id:
                row.id,

              className:
                row.class_name,

              subject:
                row.subject,

              weeklyHours:
                Number(
                  row.weekly_hours ||
                    0,
                ),

              groupName:
                row.group_name ||
                '',

              academicYear:
                row.academic_year ||
                '',
            }),
          ),

        message:
          'Данные учителя обновлены.',
      })
    } catch (
      error
    ) {
      const message =
        getErrorMessage(
          error,
        )


      console.error(
        'update-teacher FAILED:',
        {
          stage,
          message,
          error,
        },
      )


      /* ===================================================
         ROLLBACK

         Это best-effort защита.
      =================================================== */

      if (
        teacher
      ) {
        try {
          if (
            workloadsDeleted
          ) {
            await adminClient
              .from(
                'teacher_workloads',
              )
              .delete()
              .eq(
                'teacher_id',
                teacher.id,
              )


            if (
              oldWorkloads.length >
              0
            ) {
              await adminClient
                .from(
                  'teacher_workloads',
                )
                .insert(
                  oldWorkloads,
                )
            }
          }


          if (
            profileChanged
          ) {
            await adminClient
              .from(
                'profiles',
              )
              .update({
                name:
                  teacher.name,

                position:
                  teacher.position,
              })
              .eq(
                'id',
                teacher.id,
              )
          }


          if (
            authChanged
          ) {
            await adminClient
              .auth
              .admin
              .updateUserById(
                teacher.id,
                {
                  user_metadata:
                    oldUserMetadata,
                },
              )
          }
        } catch (
          rollbackError
        ) {
          console.error(
            'update-teacher rollback FAILED:',
            rollbackError,
          )
        }
      }


      return jsonResponse(
        {
          error:
            message ||
            'Не удалось изменить учителя.',

          stage,
        },
        500,
      )
    }
  },
)