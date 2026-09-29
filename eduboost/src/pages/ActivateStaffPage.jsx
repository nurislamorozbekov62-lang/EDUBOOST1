import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  activateStaff,
  normalizeEduLogin,
  normalizeEtCode,
  previewStaffActivation,
} from '../services/staffActivationService'

import {
  sendRecoveryEmailVerification,
  verifyRecoveryEmailCode,
} from '../services/accountRecoveryService'


const EDU_PATTERN =
  /^EDU-[0-9]{6}$/

const ET_PATTERN =
  /^ET-[0-9]{6}$/


function ActivateStaffPage() {
  const {
    login,
  } = useAuth()

  const navigate =
    useNavigate()

  const [
    searchParams,
  ] = useSearchParams()


  const queryLogin =
    normalizeEduLogin(
      searchParams.get(
        'login',
      ),
    )

  const queryCode =
    normalizeEtCode(
      searchParams.get(
        'code',
      ),
    )


  /* ========================================
     STEP

     credentials
     password
     login-retry
     recovery-email
     recovery-code
     success
  ======================================== */

  const [
    step,
    setStep,
  ] = useState(
    'credentials',
  )


  /* ========================================
     ACTIVATION DATA
  ======================================== */

  const [
    eduLogin,
    setEduLogin,
  ] = useState(
    queryLogin,
  )

  const [
    code,
    setCode,
  ] = useState(
    queryCode,
  )

  const [
    staff,
    setStaff,
  ] = useState(null)

  const [
    activationResult,
    setActivationResult,
  ] = useState(null)


  /* ========================================
     PASSWORD
  ======================================== */

  const [
    password,
    setPassword,
  ] = useState('')

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('')


  /* ========================================
     RECOVERY EMAIL
  ======================================== */

  const [
    recoveryEmail,
    setRecoveryEmail,
  ] = useState('')

  const [
    emailCode,
    setEmailCode,
  ] = useState('')

  const [
    emailMasked,
    setEmailMasked,
  ] = useState('')

  const [
    resendCooldown,
    setResendCooldown,
  ] = useState(0)


  /* ========================================
     UI
  ======================================== */

  const [
    error,
    setError,
  ] = useState('')

  const [
    loading,
    setLoading,
  ] = useState(false)


  /* ========================================
     AUTO CHECK URL
  ======================================== */

  useEffect(() => {
    if (
      EDU_PATTERN.test(
        queryLogin,
      ) &&
      ET_PATTERN.test(
        queryCode,
      )
    ) {
      void checkCredentials(
        queryLogin,
        queryCode,
      )
    }
  }, [])


  /* ========================================
     RESEND COUNTDOWN
  ======================================== */

  useEffect(() => {
    if (
      resendCooldown <=
      0
    ) {
      return
    }


    const timer =
      window.setInterval(
        () => {
          setResendCooldown(
            (
              current,
            ) =>
              Math.max(
                0,
                current - 1,
              ),
          )
        },
        1000,
      )


    return () => {
      window.clearInterval(
        timer,
      )
    }
  }, [
    resendCooldown,
  ])


  /* ========================================
     CHECK EDU + ET
  ======================================== */

  async function checkCredentials(
    selectedLogin = eduLogin,
    selectedCode = code,
  ) {
    const normalizedLogin =
      normalizeEduLogin(
        selectedLogin,
      )

    const normalizedCode =
      normalizeEtCode(
        selectedCode,
      )


    setError('')
    setStaff(null)


    if (
      !EDU_PATTERN.test(
        normalizedLogin,
      )
    ) {
      setError(
        'Введите EDU-логин в формате EDU-123456.',
      )

      return
    }


    if (
      !ET_PATTERN.test(
        normalizedCode,
      )
    ) {
      setError(
        'Введите ET-код в формате ET-123456.',
      )

      return
    }


    try {
      setLoading(
        true,
      )


      const result =
        await previewStaffActivation({
          eduLogin:
            normalizedLogin,

          code:
            normalizedCode,
        })


      setEduLogin(
        normalizedLogin,
      )

      setCode(
        normalizedCode,
      )

      setStaff(
        result,
      )

      setStep(
        'password',
      )
    } catch (
      checkError
    ) {
      console.error(
        'Staff activation preview:',
        checkError,
      )


      setError(
        checkError?.message ||
          'Не удалось проверить EDU и ET.',
      )
    } finally {
      setLoading(
        false,
      )
    }
  }


  /* ========================================
     ACTIVATE ACCOUNT
  ======================================== */

  async function handleActivate(
    event,
  ) {
    event.preventDefault()

    setError('')


    if (
      password.length <
      8
    ) {
      setError(
        'Пароль должен содержать минимум 8 символов.',
      )

      return
    }


    if (
      password.length >
      72
    ) {
      setError(
        'Пароль слишком длинный. Максимум 72 символа.',
      )

      return
    }


    if (
      password !==
      confirmPassword
    ) {
      setError(
        'Пароли не совпадают.',
      )

      return
    }


    try {
      setLoading(
        true,
      )


      const result =
        await activateStaff({
          eduLogin,

          code,

          newPassword:
            password,
        })


      setActivationResult(
        result,
      )

      setStaff(
        (
          current,
        ) => ({
          ...current,
          ...result,
        }),
      )


      /*
        Внутренний technical email
        пользователю НЕ показываем.

        Используем его только для
        Supabase Auth signIn.
      */

      if (
        !result.internalEmail
      ) {
        throw new Error(
          'Сервер не вернул данные для входа.',
        )
      }


      try {
        await login(
          result.internalEmail,
          password,
        )


        /*
          НЕ уходим на главную.

          Теперь пользователь уже
          авторизован и может подтвердить
          настоящий recovery email.
        */

        setStep(
          'recovery-email',
        )
      } catch (
        loginError
      ) {
        console.error(
          'Staff auto login:',
          loginError,
        )


        setError(
          'Аккаунт активирован, но автоматический вход не сработал. Нажмите «Повторить вход».',
        )

        setStep(
          'login-retry',
        )
      }
    } catch (
      activationError
    ) {
      console.error(
        'Staff activation:',
        activationError,
      )


      setError(
        activationError?.message ||
          'Не удалось активировать аккаунт.',
      )
    } finally {
      setLoading(
        false,
      )
    }
  }


  /* ========================================
     RETRY LOGIN

     ET уже использован.
     Повторно activateStaff НЕ вызываем.
  ======================================== */

  async function retryLogin() {
    if (
      !activationResult
        ?.internalEmail
    ) {
      setError(
        'Не найдены данные аккаунта для входа.',
      )

      return
    }


    try {
      setLoading(
        true,
      )

      setError('')


      await login(
        activationResult.internalEmail,
        password,
      )


      setStep(
        'recovery-email',
      )
    } catch (
      loginError
    ) {
      console.error(
        'Staff retry login:',
        loginError,
      )


      setError(
        loginError?.message ||
          'Не удалось войти. Попробуйте ещё раз.',
      )
    } finally {
      setLoading(
        false,
      )
    }
  }


  /* ========================================
     SEND RECOVERY EMAIL CODE
  ======================================== */

  async function handleSendEmailCode(
    event,
  ) {
    event?.preventDefault()

    setError('')


    const normalizedEmail =
      String(
        recoveryEmail ||
        '',
      )
        .trim()
        .toLowerCase()


    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail,
      )
    ) {
      setError(
        'Введите корректный email.',
      )

      return
    }


    try {
      setLoading(
        true,
      )


      const result =
        await sendRecoveryEmailVerification(
          normalizedEmail,
        )


      setRecoveryEmail(
        normalizedEmail,
      )

      setEmailMasked(
        result.emailMasked ||
        normalizedEmail,
      )

      setEmailCode('')

      setResendCooldown(
        Number(
          result.resendCooldownSeconds ||
          60,
        ),
      )

      setStep(
        'recovery-code',
      )
    } catch (
      sendError
    ) {
      console.error(
        'Recovery email send:',
        sendError,
      )


      setError(
        sendError?.message ||
          'Не удалось отправить код на email.',
      )
    } finally {
      setLoading(
        false,
      )
    }
  }


  /* ========================================
     VERIFY RECOVERY EMAIL
  ======================================== */

  async function handleVerifyEmail(
    event,
  ) {
    event.preventDefault()

    setError('')


    const normalizedCode =
      String(
        emailCode ||
        '',
      )
        .replace(
          /[\s-]/g,
          '',
        )


    if (
      !/^[0-9]{6}$/.test(
        normalizedCode,
      )
    ) {
      setError(
        'Введите 6-значный код из письма.',
      )

      return
    }


    try {
      setLoading(
        true,
      )


      await verifyRecoveryEmailCode(
        normalizedCode,
      )


      setEmailCode(
        normalizedCode,
      )

      setStep(
        'success',
      )
    } catch (
      verifyError
    ) {
      console.error(
        'Recovery email verify:',
        verifyError,
      )


      setError(
        verifyError?.message ||
          'Не удалось подтвердить email.',
      )
    } finally {
      setLoading(
        false,
      )
    }
  }


  /* ========================================
     RESEND
  ======================================== */

  async function handleResend() {
    if (
      resendCooldown >
      0 ||
      loading
    ) {
      return
    }


    await handleSendEmailCode()
  }


  /* ========================================
     BACK TO CREDENTIALS
  ======================================== */

  function resetActivation() {
    setStaff(null)
    setPassword('')
    setConfirmPassword('')
    setRecoveryEmail('')
    setEmailCode('')
    setError('')

    setStep(
      'credentials',
    )
  }


  /* ========================================
     SUCCESS
  ======================================== */

  if (
    step ===
    'success'
  ) {
    return (
      <Page>
        <div
          style={
            successIconStyle
          }
        >
          <CheckCircle2
            size={35}
          />
        </div>


        <h1
          style={
            titleStyle
          }
        >
          Аккаунт защищён
        </h1>


        <p
          style={
            subtitleStyle
          }
        >
          Email подтверждён и будет
          использоваться для восстановления
          доступа к EduBoost.
        </p>


        <div
          style={
            successInfoStyle
          }
        >
          <InfoRow
            icon={
              UserRound
            }
            label="Учитель"
            value={
              staff?.fullName
            }
          />

          <InfoRow
            icon={
              KeyRound
            }
            label="Постоянный логин"
            value={
              staff?.eduLogin ||
              eduLogin
            }
          />

          <InfoRow
            icon={
              Mail
            }
            label="Email восстановления"
            value={
              recoveryEmail
            }
          />

          <InfoRow
            icon={
              Building2
            }
            label="Школа"
            value={
              staff?.schoolName
            }
            last
          />
        </div>


        <div
          style={
            safeNoticeStyle
          }
        >
          <ShieldCheck
            size={19}
          />

          <span>
            Если вы забудете пароль,
            восстановление будет доступно
            через подтверждённый email.
          </span>
        </div>


        <button
          type="button"
          onClick={() =>
            navigate(
              '/',
              {
                replace:
                  true,
              },
            )
          }
          style={
            primaryButtonStyle
          }
        >
          Перейти в EduBoost
        </button>
      </Page>
    )
  }


  /* ========================================
     LOGIN RETRY
  ======================================== */

  if (
    step ===
    'login-retry'
  ) {
    return (
      <Page>
        <div
          style={
            warningIconStyle
          }
        >
          <RefreshCw
            size={31}
          />
        </div>


        <h1
          style={
            titleStyle
          }
        >
          Аккаунт создан
        </h1>


        <p
          style={
            subtitleStyle
          }
        >
          Пароль уже сохранён.
          Осталось войти и добавить
          email для восстановления.
        </p>


        {error && (
          <div
            style={
              errorStyle
            }
          >
            {error}
          </div>
        )}


        <button
          type="button"
          onClick={() =>
            void retryLogin()
          }
          disabled={
            loading
          }
          style={{
            ...primaryButtonStyle,

            opacity:
              loading
                ? 0.7
                : 1,
          }}
        >
          {loading
            ? 'Входим...'
            : 'Повторить вход'}
        </button>
      </Page>
    )
  }


  /* ========================================
     RECOVERY EMAIL
  ======================================== */

  if (
    step ===
    'recovery-email'
  ) {
    return (
      <Page>
        <div
          style={
            mailIconStyle
          }
        >
          <Mail
            size={31}
          />
        </div>


        <div
          style={
            stepBadgeStyle
          }
        >
          Защита аккаунта
        </div>


        <h1
          style={
            titleStyle
          }
        >
          Добавьте email
        </h1>


        <p
          style={
            subtitleStyle
          }
        >
          На этот адрес EduBoost сможет
          отправить код, если вы забудете
          пароль.
        </p>


        <div
          style={
            accountMiniCardStyle
          }
        >
          <strong>
            {staff?.fullName}
          </strong>

          <span>
            {staff?.eduLogin ||
              eduLogin}
          </span>
        </div>


        <form
          onSubmit={
            handleSendEmailCode
          }
          style={
            formStyle
          }
        >
          <label
            style={
              labelStyle
            }
          >
            Email для восстановления

            <div
              style={
                fieldBoxStyle
              }
            >
              <Mail
                size={18}
              />

              <input
                type="email"
                value={
                  recoveryEmail
                }
                onChange={(
                  event,
                ) => {
                  setRecoveryEmail(
                    event.target.value,
                  )

                  setError('')
                }}
                placeholder="teacher@gmail.com"
                autoComplete="email"
                style={
                  fieldInputStyle
                }
                autoFocus
              />
            </div>
          </label>


          <div
            style={
              hintStyle
            }
          >
            <ShieldCheck
              size={18}
            />

            <span>
              Email не используется как
              публичный логин. Ваш вход
              остаётся через EDU-логин
              и пароль.
            </span>
          </div>


          {error && (
            <div
              style={
                errorStyle
              }
            >
              {error}
            </div>
          )}


          <button
            type="submit"
            disabled={
              loading
            }
            style={{
              ...primaryButtonStyle,

              opacity:
                loading
                  ? 0.7
                  : 1,
            }}
          >
            <Send
              size={17}
            />

            {loading
              ? 'Отправляем...'
              : 'Получить код'}
          </button>
        </form>
      </Page>
    )
  }


  /* ========================================
     RECOVERY CODE
  ======================================== */

  if (
    step ===
    'recovery-code'
  ) {
    return (
      <Page>
        <div
          style={
            mailIconStyle
          }
        >
          <KeyRound
            size={31}
          />
        </div>


        <div
          style={
            stepBadgeStyle
          }
        >
          Подтверждение email
        </div>


        <h1
          style={
            titleStyle
          }
        >
          Введите код
        </h1>


        <p
          style={
            subtitleStyle
          }
        >
          Мы отправили 6-значный код на
        </p>


        <div
          style={
            maskedEmailStyle
          }
        >
          {emailMasked ||
            recoveryEmail}
        </div>


        <form
          onSubmit={
            handleVerifyEmail
          }
          style={
            formStyle
          }
        >
          <label
            style={
              labelStyle
            }
          >
            Код из письма

            <div
              style={
                codeFieldStyle
              }
            >
              <input
                value={
                  emailCode
                }
                onChange={(
                  event,
                ) => {
                  const value =
                    event.target.value
                      .replace(
                        /\D/g,
                        '',
                      )
                      .slice(
                        0,
                        6,
                      )

                  setEmailCode(
                    value,
                  )

                  setError('')
                }}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                style={
                  codeInputStyle
                }
                autoFocus
              />
            </div>
          </label>


          <div
            style={
              hintStyle
            }
          >
            <ShieldCheck
              size={18}
            />

            <span>
              Код действует 10 минут.
              После 5 неправильных попыток
              проверка временно блокируется.
            </span>
          </div>


          {error && (
            <div
              style={
                errorStyle
              }
            >
              {error}
            </div>
          )}


          <button
            type="submit"
            disabled={
              loading
            }
            style={{
              ...primaryButtonStyle,

              opacity:
                loading
                  ? 0.7
                  : 1,
            }}
          >
            {loading
              ? 'Проверяем...'
              : 'Подтвердить email'}
          </button>


          <button
            type="button"
            onClick={() =>
              void handleResend()
            }
            disabled={
              resendCooldown >
                0 ||
              loading
            }
            style={{
              ...secondaryButtonStyle,

              opacity:
                (
                  resendCooldown >
                    0 ||
                  loading
                )
                  ? 0.6
                  : 1,
            }}
          >
            <RefreshCw
              size={16}
            />

            {resendCooldown > 0
              ? `Отправить повторно через ${resendCooldown} сек.`
              : 'Отправить код повторно'}
          </button>


          <button
            type="button"
            onClick={() => {
              setEmailCode('')
              setError('')

              setStep(
                'recovery-email',
              )
            }}
            style={
              linkButtonStyle
            }
          >
            Изменить email
          </button>
        </form>
      </Page>
    )
  }


  /* ========================================
     PASSWORD
  ======================================== */

  if (
    step ===
    'password'
  ) {
    return (
      <Page>
        <button
          type="button"
          onClick={
            resetActivation
          }
          style={
            backButtonStyle
          }
        >
          <ArrowLeft
            size={18}
          />

          Другой аккаунт
        </button>


        <div
          style={
            logoStyle
          }
        >
          <KeyRound
            size={30}
          />
        </div>


        <h1
          style={
            titleStyle
          }
        >
          Создайте пароль
        </h1>


        <p
          style={
            subtitleStyle
          }
        >
          Проверьте данные и придумайте
          пароль для своего аккаунта.
        </p>


        <div
          style={
            employeeCardStyle
          }
        >
          <InfoRow
            icon={
              UserRound
            }
            label="Учитель"
            value={
              staff?.fullName
            }
          />

          <InfoRow
            icon={
              KeyRound
            }
            label="EDU-логин"
            value={
              staff?.eduLogin ||
              eduLogin
            }
          />

          <InfoRow
            icon={
              Building2
            }
            label="Школа"
            value={
              staff?.schoolName
            }
            last
          />
        </div>


        <form
          onSubmit={
            handleActivate
          }
          style={
            formStyle
          }
        >
          <label
            style={
              labelStyle
            }
          >
            Придумайте пароль

            <div
              style={
                fieldBoxStyle
              }
            >
              <LockKeyhole
                size={18}
              />

              <input
                type="password"
                value={
                  password
                }
                onChange={(
                  event,
                ) => {
                  setPassword(
                    event.target.value,
                  )

                  setError('')
                }}
                placeholder="Минимум 8 символов"
                autoComplete="new-password"
                style={
                  fieldInputStyle
                }
              />
            </div>
          </label>


          <label
            style={
              labelStyle
            }
          >
            Повторите пароль

            <div
              style={
                fieldBoxStyle
              }
            >
              <LockKeyhole
                size={18}
              />

              <input
                type="password"
                value={
                  confirmPassword
                }
                onChange={(
                  event,
                ) => {
                  setConfirmPassword(
                    event.target.value,
                  )

                  setError('')
                }}
                placeholder="Повторите пароль"
                autoComplete="new-password"
                style={
                  fieldInputStyle
                }
              />
            </div>
          </label>


          <div
            style={
              passwordHintStyle
            }
          >
            Администратор школы не видит
            и не получает ваш пароль.
          </div>


          {error && (
            <div
              style={
                errorStyle
              }
            >
              {error}
            </div>
          )}


          <button
            type="submit"
            disabled={
              loading
            }
            style={{
              ...primaryButtonStyle,

              opacity:
                loading
                  ? 0.7
                  : 1,
            }}
          >
            {loading
              ? 'Создаём аккаунт...'
              : 'Создать пароль'}
          </button>
        </form>
      </Page>
    )
  }


  /* ========================================
     EDU + ET
  ======================================== */

  return (
    <Page>
      <button
        type="button"
        onClick={() =>
          navigate(
            '/login',
          )
        }
        style={
          backButtonStyle
        }
      >
        <ArrowLeft
          size={18}
        />

        Назад ко входу
      </button>


      <div
        style={
          logoStyle
        }
      >
        <KeyRound
          size={30}
        />
      </div>


      <h1
        style={
          titleStyle
        }
      >
        Первый вход учителя
      </h1>


      <p
        style={
          subtitleStyle
        }
      >
        Введите постоянный EDU-логин
        и одноразовый ET-код,
        полученные от школы.
      </p>


      <form
        onSubmit={(
          event,
        ) => {
          event.preventDefault()

          void checkCredentials()
        }}
        style={
          formStyle
        }
      >
        <label
          style={
            labelStyle
          }
        >
          EDU-логин

          <div
            style={
              fieldBoxStyle
            }
          >
            <UserRound
              size={18}
            />

            <input
              value={
                eduLogin
              }
              onChange={(
                event,
              ) => {
                setEduLogin(
                  event.target.value
                    .toUpperCase(),
                )

                setError('')
              }}
              placeholder="EDU-194392"
              autoComplete="username"
              style={
                fieldInputStyle
              }
              autoFocus
            />
          </div>

          <small
            style={
              fieldHintStyle
            }
          >
            Можно ввести только 6 цифр.
          </small>
        </label>


        <label
          style={
            labelStyle
          }
        >
          ET-код

          <div
            style={
              fieldBoxStyle
            }
          >
            <KeyRound
              size={18}
            />

            <input
              value={
                code
              }
              onChange={(
                event,
              ) => {
                setCode(
                  event.target.value
                    .toUpperCase(),
                )

                setError('')
              }}
              placeholder="ET-552266"
              autoComplete="one-time-code"
              style={
                fieldInputStyle
              }
            />
          </div>

          <small
            style={
              fieldHintStyle
            }
          >
            ET-код используется только
            для первого входа.
          </small>
        </label>


        <div
          style={
            hintStyle
          }
        >
          <ShieldCheck
            size={18}
          />

          <span>
            После проверки вы создадите
            собственный пароль и добавите
            email для восстановления.
          </span>
        </div>


        {error && (
          <div
            style={
              errorStyle
            }
          >
            {error}
          </div>
        )}


        <button
          type="submit"
          disabled={
            loading
          }
          style={{
            ...primaryButtonStyle,

            opacity:
              loading
                ? 0.7
                : 1,
          }}
        >
          {loading
            ? 'Проверяем...'
            : 'Продолжить'}
        </button>
      </form>
    </Page>
  )
}


/* ========================================
   PAGE
======================================== */

function Page({
  children,
}) {
  return (
    <div
      style={
        pageStyle
      }
    >
      <main
        style={
          cardStyle
        }
      >
        {children}
      </main>
    </div>
  )
}


/* ========================================
   INFO ROW
======================================== */

function InfoRow({
  icon: Icon,
  label,
  value,
  last = false,
}) {
  return (
    <div
      style={{
        ...infoRowStyle,

        borderBottom:
          last
            ? 'none'
            : '1px solid #e7edf5',
      }}
    >
      <div
        style={
          infoIconStyle
        }
      >
        <Icon
          size={18}
        />
      </div>


      <div
        style={
          infoTextStyle
        }
      >
        <small
          style={
            smallStyle
          }
        >
          {label}
        </small>

        <strong
          style={
            valueStyle
          }
        >
          {value || '—'}
        </strong>
      </div>
    </div>
  )
}


/* ========================================
   STYLES
======================================== */

const pageStyle = {
  minHeight: '100dvh',
  padding: '18px',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f4f8ff',
}


const cardStyle = {
  width: '100%',
  maxWidth: '450px',
  padding: '27px',
  boxSizing: 'border-box',
  background: '#ffffff',
  border: '1px solid #dce7f5',
  borderRadius: '25px',
  boxShadow:
    '0 20px 60px rgba(29,78,216,.10)',
}


const backButtonStyle = {
  border: 'none',
  padding: 0,
  marginBottom: '4px',
  background: 'transparent',
  color: '#64748b',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontWeight: 700,
  cursor: 'pointer',
}


const logoStyle = {
  width: '64px',
  height: '64px',
  margin: '19px auto 15px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '19px',
  background: '#eaf3ff',
  color: '#1267e8',
}


const mailIconStyle = {
  ...logoStyle,
  background: '#eef6ff',
}


const successIconStyle = {
  ...logoStyle,
  background: '#dcfce7',
  color: '#047857',
}


const warningIconStyle = {
  ...logoStyle,
  background: '#fff7ed',
  color: '#c2410c',
}


const titleStyle = {
  margin: '0',
  color: '#102343',
  textAlign: 'center',
  fontSize: 'clamp(24px, 6vw, 27px)',
  lineHeight: 1.2,
}


const subtitleStyle = {
  margin: '9px 0 22px',
  color: '#718096',
  textAlign: 'center',
  lineHeight: 1.55,
  fontSize: '13px',
}


const stepBadgeStyle = {
  width: 'fit-content',
  margin: '0 auto 8px',
  padding: '5px 10px',
  borderRadius: '999px',
  background: '#eef6ff',
  color: '#1267e8',
  fontSize: '10px',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '.04em',
}


const formStyle = {
  display: 'grid',
  gap: '14px',
}


const labelStyle = {
  display: 'grid',
  gap: '7px',
  color: '#223b63',
  fontSize: '13px',
  fontWeight: 700,
}


const fieldBoxStyle = {
  minHeight: '51px',
  padding: '0 13px',
  display: 'flex',
  alignItems: 'center',
  gap: '9px',
  border: '1px solid #d8e3ef',
  borderRadius: '13px',
  color: '#8ba0bb',
  background: '#ffffff',
}


const fieldInputStyle = {
  width: '100%',
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: '#102343',
  fontSize: '15px',
}


const codeFieldStyle = {
  minHeight: '62px',
  padding: '0 14px',
  display: 'flex',
  alignItems: 'center',
  border: '2px solid #bcd8ff',
  borderRadius: '15px',
  background: '#f8fbff',
}


const codeInputStyle = {
  width: '100%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: '#102343',
  textAlign: 'center',
  fontSize: '30px',
  fontWeight: 800,
  letterSpacing: '9px',
}


const fieldHintStyle = {
  color: '#94a3b8',
  fontSize: '10px',
  fontWeight: 500,
}


const hintStyle = {
  padding: '11px',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px',
  borderRadius: '11px',
  background: '#f8fafc',
  color: '#64748b',
  fontSize: '11px',
  lineHeight: 1.5,
}


const passwordHintStyle = {
  marginTop: '-4px',
  color: '#8292a8',
  fontSize: '10px',
  lineHeight: 1.5,
}


const employeeCardStyle = {
  marginBottom: '16px',
  padding: '5px 13px',
  background: '#f8fafc',
  border: '1px solid #e5edf6',
  borderRadius: '15px',
}


const accountMiniCardStyle = {
  marginBottom: '18px',
  padding: '13px 15px',
  display: 'grid',
  gap: '3px',
  borderRadius: '13px',
  background: '#f8fafc',
  color: '#102343',
  fontSize: '13px',
}


const infoRowStyle = {
  minHeight: '66px',
  display: 'flex',
  alignItems: 'center',
  gap: '11px',
}


const infoIconStyle = {
  width: '39px',
  height: '39px',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '11px',
  color: '#1267e8',
  background: '#eaf3ff',
}


const infoTextStyle = {
  minWidth: 0,
  display: 'grid',
  gap: '3px',
}


const smallStyle = {
  color: '#8292a8',
  fontSize: '10px',
}


const valueStyle = {
  color: '#102343',
  fontSize: '13px',
  overflowWrap: 'anywhere',
}


const errorStyle = {
  padding: '11px 13px',
  borderRadius: '11px',
  background: '#fff1f2',
  color: '#be123c',
  fontSize: '12px',
  lineHeight: 1.45,
}


const safeNoticeStyle = {
  margin: '16px 0',
  padding: '12px',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px',
  borderRadius: '12px',
  background: '#ecfdf5',
  color: '#047857',
  fontSize: '11px',
  lineHeight: 1.5,
}


const successInfoStyle = {
  margin: '20px 0',
  padding: '4px 13px',
  borderRadius: '14px',
  background: '#f8fafc',
}


const maskedEmailStyle = {
  margin: '-11px 0 20px',
  color: '#1267e8',
  textAlign: 'center',
  fontSize: '15px',
  fontWeight: 800,
}


const primaryButtonStyle = {
  width: '100%',
  minHeight: '51px',
  padding: '0 15px',
  border: 'none',
  borderRadius: '13px',
  background: '#1267e8',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '7px',
  fontSize: '14px',
  fontWeight: 800,
  cursor: 'pointer',
}


const secondaryButtonStyle = {
  width: '100%',
  minHeight: '49px',
  padding: '0 15px',
  border: '1px solid #d8e3ef',
  borderRadius: '13px',
  background: '#ffffff',
  color: '#526b8a',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '7px',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
}


const linkButtonStyle = {
  justifySelf: 'center',
  border: 'none',
  padding: '4px',
  background: 'transparent',
  color: '#1267e8',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
}


export default ActivateStaffPage