import {
  supabase,
} from '../lib/supabase'


const EDU_PATTERN =
  /^EDU-[0-9]{6}$/

const ET_PATTERN =
  /^ET-[0-9]{6}$/


function cleanText(
  value,
) {
  return String(
    value || '',
  ).trim()
}


export function normalizeEduLogin(
  value,
) {
  const normalized =
    cleanText(
      value,
    )
      .toUpperCase()
      .replaceAll(
        ' ',
        '',
      )

  if (
    /^[0-9]{6}$/.test(
      normalized,
    )
  ) {
    return `EDU-${normalized}`
  }

  return normalized
}


export function normalizeEtCode(
  value,
) {
  const normalized =
    cleanText(
      value,
    )
      .toUpperCase()
      .replaceAll(
        ' ',
        '',
      )

  if (
    /^[0-9]{6}$/.test(
      normalized,
    )
  ) {
    return `ET-${normalized}`
  }

  return normalized
}


async function getFunctionError(
  error,
  fallback,
) {
  try {
    if (
      error?.context &&
      typeof error.context.json ===
        'function'
    ) {
      const body =
        await error.context.json()

      if (
        body?.error
      ) {
        return body.error
      }
    }
  } catch (
    parseError
  ) {
    console.error(
      'Function error parse:',
      parseError,
    )
  }

  return (
    error?.message ||
    fallback
  )
}


/* ========================================
   VALIDATE
======================================== */

function validateCredentials(
  eduLogin,
  code,
) {
  const normalizedLogin =
    normalizeEduLogin(
      eduLogin,
    )

  const normalizedCode =
    normalizeEtCode(
      code,
    )


  if (
    !EDU_PATTERN.test(
      normalizedLogin,
    )
  ) {
    throw new Error(
      'Введите корректный EDU-логин.',
    )
  }


  if (
    !ET_PATTERN.test(
      normalizedCode,
    )
  ) {
    throw new Error(
      'Введите корректный ET-код.',
    )
  }


  return {
    eduLogin:
      normalizedLogin,

    code:
      normalizedCode,
  }
}


/* ========================================
   PREVIEW
======================================== */

export async function previewStaffActivation({
  eduLogin,
  code,
}) {
  const normalized =
    validateCredentials(
      eduLogin,
      code,
    )


  const {
    data,
    error,
  } =
    await supabase
      .functions
      .invoke(
        'activate-staff',
        {
          body: {
            action:
              'preview',

            eduLogin:
              normalized.eduLogin,

            code:
              normalized.code,
          },
        },
      )


  if (
    error
  ) {
    throw new Error(
      await getFunctionError(
        error,
        'Не удалось проверить данные.',
      ),
    )
  }


  if (
    data?.error
  ) {
    throw new Error(
      data.error,
    )
  }


  if (
    !data?.success ||
    !data?.eduLogin ||
    !data?.fullName
  ) {
    throw new Error(
      'Сервер вернул неполные данные.',
    )
  }


  return data
}


/* ========================================
   ACTIVATE
======================================== */

export async function activateStaff({
  eduLogin,
  code,
  newPassword,
}) {
  const normalized =
    validateCredentials(
      eduLogin,
      code,
    )


  const password =
    String(
      newPassword ||
      '',
    )


  if (
    password.length <
    8
  ) {
    throw new Error(
      'Пароль должен содержать минимум 8 символов.',
    )
  }


  if (
    password.length >
    72
  ) {
    throw new Error(
      'Пароль слишком длинный. Максимум 72 символа.',
    )
  }


  const {
    data,
    error,
  } =
    await supabase
      .functions
      .invoke(
        'activate-staff',
        {
          body: {
            action:
              'activate',

            eduLogin:
              normalized.eduLogin,

            code:
              normalized.code,

            newPassword:
              password,
          },
        },
      )


  if (
    error
  ) {
    throw new Error(
      await getFunctionError(
        error,
        'Не удалось активировать аккаунт.',
      ),
    )
  }


  if (
    data?.error
  ) {
    throw new Error(
      data.error,
    )
  }


  if (
    !data?.success ||
    !data?.eduLogin
  ) {
    throw new Error(
      'Сервер вернул неполные данные.',
    )
  }


  return data
}