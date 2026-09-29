// @ts-nocheck

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}


Deno.serve(async (req) => {
  /* CORS preflight */

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  try {
    const {
      message,
    } = await req.json()

    if (
      !message ||
      !String(message).trim()
    ) {
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

    const apiKey =
      Deno.env.get('DEEPSEEK_API_KEY')

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'На сервере не настроен ключ DeepSeek',
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

              content:
                'Ты AI-помощник образовательной платформы EduBoost. ' +
                'Помогай ученику понять материал, а не просто выдавай готовый ответ. ' +
                'Объясняй простыми словами и при необходимости давай подсказки.',
            },

            {
              role: 'user',
              content: String(message).trim(),
            },
          ],

          temperature: 0.7,
          max_tokens: 1000,
        }),
      },
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('DeepSeek error:', data)

      return new Response(
        JSON.stringify({
          success: false,
          error:
            data?.error?.message ||
            'Ошибка DeepSeek API',
        }),
        {
          status: response.status,
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