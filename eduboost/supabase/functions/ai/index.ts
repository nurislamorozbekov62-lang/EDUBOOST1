// @ts-nocheck

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'


/* =========================================================
   CORS
========================================================= */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}


/* =========================================================
   CONFIG
========================================================= */

const DAYS_WINDOW = 30

const SYSTEM_BASE = `
Ты AI-помощник образовательной платформы EduBoost (Кыргызстан).
Помогай ученику понять материал, а не выдавай готовый ответ.
Объясняй простыми словами, при необходимости давай подсказки.
Отвечай на русском, если ученик не попросил другой язык.
`.trim()


/* =========================================================
   HELPERS
========================================================= */

function cleanText(value) {
  return String(value ?? '').trim()
}


function formatNumber(value, digits = 1) {
  const num = Number(value)

  if (!Number.isFinite(num)) {
    return ''
  }

  return num.toFixed(digits)
}


/* =========================================================
   CONTEXT
========================================================= */

async function buildStudentContext(adminClient, userId) {
  if (!userId) {
    return null
  }

  /* 1. Профиль ученика */

  const { data: profile, error: profileError } =
    await adminClient
      .from('profiles')
      .select('id, role, class_name, school_id')
      .eq('id', userId)
      .maybeSingle()

  if (profileError) {
    console.error('Context profile error:', profileError)
    return null
  }

  if (!profile || profile.role !== 'Ученик') {
    return null
  }

  const className = cleanText(profile.class_name)

  const dateFrom = new Date(
    Date.now() - DAYS_WINDOW * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10)

  /* 2. Оценки за 30 дней */

  const { data: gradeRows, error: gradeError } =
    await adminClient
      .from('grades')
      .select('grade')
      .eq('student_id', userId)
      .gte('grade_date', dateFrom)

  if (gradeError) {
    console.error('Context grades error:', gradeError)
  }

  const grades = Array.isArray(gradeRows) ? gradeRows : []

  const gradesCount = grades.length

  const averageGrade =
    gradesCount > 0
      ? grades.reduce(
          (sum, row) => sum + Number(row.grade || 0),
          0,
        ) / gradesCount
      : null

  /* 3. Посещаемость за 30 дней */

  const { data: attendanceRows, error: attendanceError } =
    await adminClient
      .from('attendance_records')
      .select('status')
      .eq('student_id', userId)
      .gte('attendance_date', dateFrom)

  if (attendanceError) {
    console.error(
      'Context attendance error:',
      attendanceError,
    )
  }

  const attendance = Array.isArray(attendanceRows)
    ? attendanceRows
    : []

  const absences = attendance.filter(
    (row) => row.status === 'absent',
  ).length

  const late = attendance.filter(
    (row) => row.status === 'late',
  ).length

  const excused = attendance.filter(
    (row) => row.status === 'excused',
  ).length

  return {
    className,
    gradesCount,
    averageGrade,
    absences,
    late,
    excused,
    attendanceTotal: attendance.length,
  }
}


function buildSystemPrompt(context) {
  if (!context) {
    return SYSTEM_BASE
  }

  const lines = [SYSTEM_BASE, '', 'Безличный контекст ученика:']

  lines.push(
    `- Класс: ${context.className || 'не указан'}`,
  )

  if (context.gradesCount > 0) {
    lines.push(
      `- Средний балл за последние ${DAYS_WINDOW} дней: ${formatNumber(
        context.averageGrade,
      )} (на основе ${context.gradesCount} оценок)`,
    )
  } else {
    lines.push(
      `- Оценок за последние ${DAYS_WINDOW} дней нет`,
    )
  }

  if (context.attendanceTotal > 0) {
    lines.push(
      `- Пропусков за ${DAYS_WINDOW} дней: ${context.absences}`,
    )

    lines.push(
      `- Опозданий за ${DAYS_WINDOW} дней: ${context.late}`,
    )

    if (context.excused > 0) {
      lines.push(
        `- Уважительных пропусков: ${context.excused}`,
      )
    }
  } else {
    lines.push(
      `- Данных о посещаемости за ${DAYS_WINDOW} дней нет`,
    )
  }

  lines.push(
    '',
    'Используй контекст мягко: если у ученика низкий балл — поддержи и помоги разобраться, если высокий — можно опираться на это. Никогда не упоминай технические детали запроса.',
  )

  return lines.join('\n')
}


/* =========================================================
   DEEPSEEK
========================================================= */

async function askDeepSeek({
  apiKey,
  systemPrompt,
  message,
}) {
  const response = await fetch(
    'https://api.deepseek.com/chat/completions',
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },

      body: JSON.stringify({
        model: 'deepseek-chat',

        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },

          {
            role: 'user',
            content: message,
          },
        ],

        temperature: 0.7,
        max_tokens: 1000,
      }),
    },
  )

  const data = await response.json()

  return {
    ok: response.ok,
    status: response.status,
    data,
  }
}


/* =========================================================
   ENTRY POINT
========================================================= */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    /* 1. Валидация тела */

    const body = await req.json()

    const message = cleanText(body?.message)

    if (!message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Сообщение не указано',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      )
    }

    /* 2. Ключ DeepSeek */

    const apiKey = Deno.env.get('DEEPSEEK_API_KEY')

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'На сервере не настроен ключ DeepSeek',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      )
    }

    /* 3. Авторизация пользователя */

    const authHeader = req.headers.get('Authorization') || ''

    const accessToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : ''

    let studentContext = null

    if (accessToken) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')

      const serviceRoleKey = Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY',
      )

      if (supabaseUrl && serviceRoleKey) {
        try {
          const adminClient = createClient(
            supabaseUrl,
            serviceRoleKey,
            {
              auth: {
                persistSession: false,
                autoRefreshToken: false,
              },
            },
          )

          const {
            data: { user },
            error: userError,
          } = await adminClient.auth.getUser(accessToken)

          if (userError || !user) {
            console.error(
              'Context auth error:',
              userError,
            )
          } else {
            studentContext = await buildStudentContext(
              adminClient,
              user.id,
            )
          }
        } catch (contextError) {
          console.error(
            'Context builder error:',
            contextError,
          )
        }
      }
    }

    /* 4. Собираем промпт */

    const systemPrompt = buildSystemPrompt(
      studentContext,
    )

    /* 5. Запрос в DeepSeek */

    const { ok, status, data } = await askDeepSeek({
      apiKey,
      systemPrompt,
      message,
    })

    if (!ok) {
      console.error('DeepSeek error:', data)

      return new Response(
        JSON.stringify({
          success: false,
          error:
            data?.error?.message ||
            'Ошибка DeepSeek API',
        }),
        {
          status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        answer:
          data?.choices?.[0]?.message?.content ||
          'AI не дал ответ.',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Function error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Ошибка сервера AI',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  }
})