import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useAuth,
} from './AuthContext'

import {
  supabase,
} from '../lib/supabase'

import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  translations,
} from '../i18n/translations'


const LanguageContext =
  createContext(null)


function normalizeLanguage(
  value,
) {
  return SUPPORTED_LANGUAGES.includes(
    value,
  )
    ? value
    : DEFAULT_LANGUAGE
}


function getTranslation(
  source,
  path,
) {
  if (!source || !path) {
    return undefined
  }

  return String(path)
    .split('.')
    .reduce(
      (
        current,
        key,
      ) => {
        if (
          current &&
          typeof current ===
            'object' &&
          key in current
        ) {
          return current[key]
        }

        return undefined
      },
      source,
    )
}


function replaceVariables(
  text,
  variables,
) {
  if (
    typeof text !==
    'string'
  ) {
    return text
  }

  if (
    !variables ||
    typeof variables !==
      'object'
  ) {
    return text
  }

  return Object.entries(
    variables,
  ).reduce(
    (
      result,
      [
        key,
        value,
      ],
    ) =>
      result.replaceAll(
        `{${key}}`,
        String(value),
      ),
    text,
  )
}


export function LanguageProvider({
  children,
}) {
  const {
    user,
  } = useAuth()

  const [
    language,
    setLanguageState,
  ] = useState(
    DEFAULT_LANGUAGE,
  )

  const [
    loading,
    setLoading,
  ] = useState(true)


  /* ========================================
     LOAD LANGUAGE
  ======================================== */

  useEffect(() => {
    let cancelled =
      false

    async function loadLanguage() {
      if (!user?.id) {
        setLanguageState(
          DEFAULT_LANGUAGE,
        )

        setLoading(false)

        return
      }

      try {
        setLoading(true)

        const {
          data,
          error,
        } =
          await supabase
            .from(
              'profiles',
            )
            .select(
              'interface_language',
            )
            .eq(
              'id',
              user.id,
            )
            .single()

        if (error) {
          throw error
        }

        if (cancelled) {
          return
        }

        setLanguageState(
          normalizeLanguage(
            data
              ?.interface_language,
          ),
        )
      } catch (
        error
      ) {
        console.error(
          'Не удалось загрузить язык:',
          error,
        )

        if (!cancelled) {
          setLanguageState(
            DEFAULT_LANGUAGE,
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadLanguage()

    return () => {
      cancelled =
        true
    }
  }, [
    user?.id,
  ])


  /* ========================================
     REALTIME LANGUAGE UPDATE

     Если SettingsPage изменит
     interface_language напрямую
     через Supabase, весь интерфейс
     тоже обновится.
  ======================================== */

  useEffect(() => {
    if (!user?.id) {
      return undefined
    }

    const channel =
      supabase
        .channel(
          `profile-language-${user.id}`,
        )
        .on(
          'postgres_changes',
          {
            event:
              'UPDATE',

            schema:
              'public',

            table:
              'profiles',

            filter:
              `id=eq.${user.id}`,
          },
          (
            payload,
          ) => {
            const nextLanguage =
              normalizeLanguage(
                payload
                  ?.new
                  ?.interface_language,
              )

            setLanguageState(
              nextLanguage,
            )
          },
        )
        .subscribe()

    return () => {
      void supabase
        .removeChannel(
          channel,
        )
    }
  }, [
    user?.id,
  ])


  /* ========================================
     HTML LANG
  ======================================== */

  useEffect(() => {
    if (
      typeof document ===
      'undefined'
    ) {
      return
    }

    document.documentElement.lang =
      language === 'ky'
        ? 'ky'
        : 'ru'
  }, [
    language,
  ])


  /* ========================================
     CHANGE LANGUAGE
  ======================================== */

  const changeLanguage =
    useCallback(
      async (
        nextLanguage,
        options = {},
      ) => {
        const {
          persist = true,
        } = options

        const normalized =
          normalizeLanguage(
            nextLanguage,
          )

        const previousLanguage =
          language

        /*
          Меняем сразу.
          Пользователю не нужно
          обновлять страницу.
        */
        setLanguageState(
          normalized,
        )

        if (
          !persist ||
          !user?.id
        ) {
          return normalized
        }

        const {
          error,
        } =
          await supabase
            .from(
              'profiles',
            )
            .update({
              interface_language:
                normalized,
            })
            .eq(
              'id',
              user.id,
            )

        if (error) {
          /*
            Если Supabase
            не сохранил язык,
            возвращаем старый.
          */
          setLanguageState(
            previousLanguage,
          )

          throw new Error(
            'Не удалось сохранить язык интерфейса',
          )
        }

        return normalized
      },
      [
        language,
        user?.id,
      ],
    )


  /* ========================================
     TRANSLATE
  ======================================== */

  const t =
    useCallback(
      (
        key,
        variables,
      ) => {
        const selected =
          getTranslation(
            translations[
              language
            ],
            key,
          )

        const fallback =
          getTranslation(
            translations.ru,
            key,
          )

        const result =
          selected ??
          fallback ??
          key

        return replaceVariables(
          result,
          variables,
        )
      },
      [
        language,
      ],
    )


  const value =
    useMemo(
      () => ({
        language,

        loading,

        isRussian:
          language ===
          'ru',

        isKyrgyz:
          language ===
          'ky',

        t,

        changeLanguage,

        setLanguage:
          changeLanguage,
      }),
      [
        language,
        loading,
        t,
        changeLanguage,
      ],
    )


  return (
    <LanguageContext.Provider
      value={
        value
      }
    >
      {children}
    </LanguageContext.Provider>
  )
}


export function useLanguage() {
  const context =
    useContext(
      LanguageContext,
    )

  if (!context) {
    throw new Error(
      'useLanguage должен использоваться внутри LanguageProvider',
    )
  }

  return context
}


export default LanguageContext