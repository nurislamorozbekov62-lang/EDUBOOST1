import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  LogIn,
  Mail,
  RefreshCcw,
  School,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  recoverStudentAccess,
} from '../services/studentRecoveryService'

import {
  resetPasswordWithEmailCode,
  sendPasswordRecoveryCode,
} from '../services/accountRecoveryService'


/* ========================================
   CODE FORMATS

   Поддерживаем новые короткие коды
   и старые legacy-коды, чтобы ничего
   существующее не сломать.
======================================== */

const EDU_SHORT_PATTERN =
  /^EDU-[0-9]{6}$/

const EDU_LEGACY_PATTERN =
  /^EDU-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/

const EB_SHORT_PATTERN =
  /^EB-[0-9]{6}$/

const EB_LEGACY_PATTERN =
  /^EB-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/

const ET_SHORT_PATTERN =
  /^ET-[0-9]{6}$/

const ET_LEGACY_PATTERN =
  /^ET-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/

const ER_PATTERN =
  /^ER-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/


function normalizeUpper(
  value,
) {
  return String(
    value || '',
  )
    .trim()
    .toUpperCase()
}


function normalizeEduLogin(
  value,
) {
  const normalized =
    normalizeUpper(
      value,
    )
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


  return normalized
}


function isEduLogin(
  value,
) {
  return (
    EDU_SHORT_PATTERN.test(
      value,
    ) ||
    EDU_LEGACY_PATTERN.test(
      value,
    )
  )
}


function isStudentActivationCode(
  value,
) {
  return (
    EB_SHORT_PATTERN.test(
      value,
    ) ||
    EB_LEGACY_PATTERN.test(
      value,
    )
  )
}


function isTeacherActivationCode(
  value,
) {
  return (
    ET_SHORT_PATTERN.test(
      value,
    ) ||
    ET_LEGACY_PATTERN.test(
      value,
    )
  )
}


/* ========================================
   PAGE
======================================== */

function LoginPage() {
  const {
    login,
  } = useAuth()

  const navigate =
    useNavigate()


  /* ========================================
     MODES

     login
     email-recovery
     student-er-recovery
  ======================================== */

  const [
    mode,
    setMode,
  ] = useState(
    'login',
  )


  /* ========================================
     LOGIN
  ======================================== */

  const [
    identifier,
    setIdentifier,
  ] = useState('')

  const [
    password,
    setPassword,
  ] = useState('')


  /* ========================================
     EMAIL RECOVERY
  ======================================== */

  const [
    recoveryStage,
    setRecoveryStage,
  ] = useState(
    'request',
  )

  const [
    recoveryLogin,
    setRecoveryLogin,
  ] = useState('')

  const [
    emailRecoveryCode,
    setEmailRecoveryCode,
  ] = useState('')

  const [
    newPassword,
    setNewPassword,
  ] = useState('')

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('')

  const [
    resendCooldown,
    setResendCooldown,
  ] = useState(0)


  /* ========================================
     LEGACY STUDENT ER RECOVERY
  ======================================== */

  const [
    erRecoveryLogin,
    setErRecoveryLogin,
  ] = useState('')

  const [
    erRecoveryCode,
    setErRecoveryCode,
  ] = useState('')

  const [
    erNewPassword,
    setErNewPassword,
  ] = useState('')

  const [
    erConfirmPassword,
    setErConfirmPassword,
  ] = useState('')


  /* ========================================
     COMMON
  ======================================== */

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    success,
    setSuccess,
  ] = useState('')


  /* ========================================
     RESEND TIMER
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
     CLEAR MESSAGES
  ======================================== */

  function clearMessages() {
    setError('')
    setSuccess('')
  }


  /* ========================================
     LOGIN IDENTIFIER
  ======================================== */

  function handleIdentifierChange(
    event,
  ) {
    const value =
      event.target.value


    const upper =
      value
        .trim()
        .toUpperCase()


    if (
      upper.startsWith(
        'EDU-',
      ) ||
      upper.startsWith(
        'EB-',
      ) ||
      upper.startsWith(
        'ET-',
      )
    ) {
      setIdentifier(
        value.toUpperCase(),
      )
    } else {
      setIdentifier(
        value,
      )
    }


    clearMessages()
  }


  /* ========================================
     EDU LOGIN

     Учитель:
     edu-123456@teachers.eduboost.local

     Ученик:
     edu-123456@students.eduboost.local

     Пользователь technical email
     вообще не видит.
  ======================================== */

  async function loginWithEdu(
    eduLogin,
    selectedPassword,
  ) {
    const normalized =
      normalizeEduLogin(
        eduLogin,
      )


    /*
      Сначала пробуем teacher identity.
    */

    try {
      await login(
        `${normalized.toLowerCase()}@teachers.eduboost.local`,
        selectedPassword,
      )

      return {
        roleType:
          'teacher',
      }
    } catch (
      teacherError
    ) {
      /*
        Это нормально:
        EDU может принадлежать ученику.
      */
    }


    /*
      Потом student identity.
    */

    await login(
      `${normalized.toLowerCase()}@students.eduboost.local`,
      selectedPassword,
    )


    return {
      roleType:
        'student',
    }
  }


  /* ========================================
     NORMAL LOGIN
  ======================================== */

  async function handleLogin(
    event,
  ) {
    event.preventDefault()

    clearMessages()


    const rawIdentifier =
      String(
        identifier || '',
      ).trim()


    const upperIdentifier =
      normalizeUpper(
        rawIdentifier,
      )


    if (
      !rawIdentifier
    ) {
      setError(
        'Введите EDU-логин, email или код первого входа.',
      )

      return
    }


    /* ========================================
       STUDENT FIRST LOGIN
    ======================================== */

    if (
      isStudentActivationCode(
        upperIdentifier,
      )
    ) {
      navigate(
        `/activate?code=${encodeURIComponent(
          upperIdentifier,
        )}`,
      )

      return
    }


    if (
      upperIdentifier.startsWith(
        'EB-',
      )
    ) {
      setError(
        'Проверьте EB-код. Формат кода неверный.',
      )

      return
    }


    /* ========================================
       TEACHER FIRST LOGIN
    ======================================== */

    if (
      isTeacherActivationCode(
        upperIdentifier,
      )
    ) {
      navigate(
        `/staff-activate?code=${encodeURIComponent(
          upperIdentifier,
        )}`,
      )

      return
    }


    if (
      upperIdentifier.startsWith(
        'ET-',
      )
    ) {
      setError(
        'Проверьте ET-код. Формат кода неверный.',
      )

      return
    }


    if (
      !password
    ) {
      setError(
        'Введите пароль.',
      )

      return
    }


    try {
      setLoading(
        true,
      )


      const normalizedEdu =
        normalizeEduLogin(
          rawIdentifier,
        )


      if (
        isEduLogin(
          normalizedEdu,
        )
      ) {
        await loginWithEdu(
          normalizedEdu,
          password,
        )
      } else {
        /*
          Оставляем обычный email-вход
          для старых/admin аккаунтов.
        */

        await login(
          rawIdentifier,
          password,
        )
      }


      navigate(
        '/',
        {
          replace:
            true,
        },
      )
    } catch (
      loginError
    ) {
      console.error(
        'Login:',
        loginError,
      )


      setError(
        'Неверный EDU-логин, email или пароль.',
      )
    } finally {
      setLoading(
        false,
      )
    }
  }


  /* ========================================
     FIRST STUDENT LOGIN
  ======================================== */

  function openStudentActivation() {
    clearMessages()


    const value =
      normalizeUpper(
        identifier,
      )


    if (
      isStudentActivationCode(
        value,
      )
    ) {
      navigate(
        `/activate?code=${encodeURIComponent(
          value,
        )}`,
      )

      return
    }


    navigate(
      '/activate',
    )
  }


  /* ========================================
     FIRST STAFF LOGIN
  ======================================== */

  function openStaffActivation() {
    clearMessages()


    const value =
      normalizeUpper(
        identifier,
      )


    if (
      isTeacherActivationCode(
        value,
      )
    ) {
      navigate(
        `/staff-activate?code=${encodeURIComponent(
          value,
        )}`,
      )

      return
    }


    navigate(
      '/staff-activate',
    )
  }


  /* ========================================
     OPEN EMAIL RECOVERY
  ======================================== */

  function openEmailRecovery() {
    clearMessages()


    const possibleLogin =
      normalizeEduLogin(
        identifier,
      )


    if (
      EDU_SHORT_PATTERN.test(
        possibleLogin,
      )
    ) {
      setRecoveryLogin(
        possibleLogin,
      )
    }


    setEmailRecoveryCode('')
    setNewPassword('')
    setConfirmPassword('')

    setRecoveryStage(
      'request',
    )

    setMode(
      'email-recovery',
    )
  }


  /* ========================================
     SEND PASSWORD RECOVERY CODE
  ======================================== */

  async function handleSendRecoveryCode(
    event,
  ) {
    event?.preventDefault()

    clearMessages()


    const normalizedLogin =
      normalizeEduLogin(
        recoveryLogin,
      )


    /*
      Новый email recovery работает
      с новым коротким EDU.
    */

    if (
      !EDU_SHORT_PATTERN.test(
        normalizedLogin,
      )
    ) {
      setError(
        'Введите EDU-логин в формате EDU-123456.',
      )

      return
    }


    try {
      setLoading(
        true,
      )


      await sendPasswordRecoveryCode(
        normalizedLogin,
      )


      setRecoveryLogin(
        normalizedLogin,
      )

      setRecoveryStage(
        'reset',
      )

      setResendCooldown(
        60,
      )


      /*
        Намеренно generic message:
        нельзя раскрывать существование аккаунта.
      */

      setSuccess(
        'Если для этого аккаунта настроено восстановление, код отправлен на подтверждённый email.',
      )
    } catch (
      recoveryError
    ) {
      console.error(
        'Send recovery code:',
        recoveryError,
      )


      setError(
        recoveryError?.message ||
          'Не удалось отправить код восстановления.',
      )
    } finally {
      setLoading(
        false,
      )
    }
  }


  /* ========================================
     RESET PASSWORD BY EMAIL OTP
  ======================================== */

  async function handleEmailPasswordReset(
    event,
  ) {
    event.preventDefault()

    clearMessages()


    const normalizedLogin =
      normalizeEduLogin(
        recoveryLogin,
      )


    const normalizedCode =
      String(
        emailRecoveryCode ||
        '',
      )
        .replace(
          /\D/g,
          '',
        )


    if (
      !EDU_SHORT_PATTERN.test(
        normalizedLogin,
      )
    ) {
      setError(
        'Введите корректный EDU-логин.',
      )

      return
    }


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


    if (
      newPassword.length <
      8
    ) {
      setError(
        'Пароль должен содержать минимум 8 символов.',
      )

      return
    }


    if (
      newPassword.length >
      72
    ) {
      setError(
        'Пароль слишком длинный. Максимум 72 символа.',
      )

      return
    }


    if (
      newPassword !==
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


      await resetPasswordWithEmailCode({
        eduLogin:
          normalizedLogin,

        code:
          normalizedCode,

        newPassword,
      })


      /*
        Пароль уже изменён.

        Пробуем войти автоматически.
      */

      try {
        await loginWithEdu(
          normalizedLogin,
          newPassword,
        )


        navigate(
          '/',
          {
            replace:
              true,
          },
        )


        return
      } catch (
        autoLoginError
      ) {
        console.error(
          'Auto login after email recovery:',
          autoLoginError,
        )
      }


      /*
        Даже если auto-login не прошёл,
        пароль уже успешно изменён.
      */

      setIdentifier(
        normalizedLogin,
      )

      setPassword('')

      setRecoveryLogin('')
      setEmailRecoveryCode('')
      setNewPassword('')
      setConfirmPassword('')

      setMode(
        'login',
      )


      setSuccess(
        'Пароль изменён. Теперь войдите с EDU-логином и новым паролем.',
      )
    } catch (
      recoveryError
    ) {
      console.error(
        'Email password recovery:',
        recoveryError,
      )


      setError(
        recoveryError?.message ||
          'Не удалось изменить пароль.',
      )
    } finally {
      setLoading(
        false,
      )
    }
  }


  /* ========================================
     RESEND EMAIL CODE
  ======================================== */

  async function handleResendRecoveryCode() {
    if (
      loading ||
      resendCooldown >
        0
    ) {
      return
    }


    await handleSendRecoveryCode()
  }


  /* ========================================
     OPEN LEGACY STUDENT RECOVERY
  ======================================== */

  function openStudentErRecovery() {
    clearMessages()


    const value =
      normalizeUpper(
        identifier,
      )


    if (
      EDU_LEGACY_PATTERN.test(
        value,
      )
    ) {
      setErRecoveryLogin(
        value,
      )
    }


    setMode(
      'student-er-recovery',
    )
  }


  /* ========================================
     LEGACY STUDENT RECOVERY

     Не удаляем рабочий ER flow.
  ======================================== */

  async function handleStudentErRecovery(
    event,
  ) {
    event.preventDefault()

    clearMessages()


    const studentLogin =
      normalizeUpper(
        erRecoveryLogin,
      )


    const erCode =
      normalizeUpper(
        erRecoveryCode,
      )


    if (
      !EDU_LEGACY_PATTERN.test(
        studentLogin,
      )
    ) {
      setError(
        'Введите EDU-логин ученика старого формата.',
      )

      return
    }


    if (
      !ER_PATTERN.test(
        erCode,
      )
    ) {
      setError(
        'Введите корректный ER-код.',
      )

      return
    }


    if (
      erNewPassword.length <
      8
    ) {
      setError(
        'Пароль должен содержать минимум 8 символов.',
      )

      return
    }


    if (
      erNewPassword.length >
      72
    ) {
      setError(
        'Пароль слишком длинный. Максимум 72 символа.',
      )

      return
    }


    if (
      erNewPassword !==
      erConfirmPassword
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


      await recoverStudentAccess({
        studentLogin,

        recoveryCode:
          erCode,

        newPassword:
          erNewPassword,
      })


      try {
        await login(
          `${studentLogin.toLowerCase()}@students.eduboost.local`,
          erNewPassword,
        )


        navigate(
          '/',
          {
            replace:
              true,
          },
        )


        return
      } catch (
        autoLoginError
      ) {
        console.error(
          'Legacy recovery auto login:',
          autoLoginError,
        )
      }


      setIdentifier(
        studentLogin,
      )

      setPassword('')

      setMode(
        'login',
      )


      setSuccess(
        'Пароль изменён. Теперь войдите с EDU-логином.',
      )
    } catch (
      recoveryError
    ) {
      console.error(
        'Legacy student recovery:',
        recoveryError,
      )


      setError(
        recoveryError?.message ||
          'Не удалось восстановить доступ.',
      )
    } finally {
      setLoading(
        false,
      )
    }
  }


  /* ========================================
     BACK
  ======================================== */

  function backToLogin() {
    clearMessages()

    setMode(
      'login',
    )

    setRecoveryStage(
      'request',
    )

    setEmailRecoveryCode('')
    setNewPassword('')
    setConfirmPassword('')
  }


  /* ========================================
     LOGIN SCREEN
  ======================================== */

  if (
    mode ===
    'login'
  ) {
    return (
      <Page>
        <Brand />


        <div
          style={
            headingStyle
          }
        >
          <h1
            style={
              titleStyle
            }
          >
            Вход
          </h1>

          <p
            style={
              subtitleStyle
            }
          >
            Войдите в свой аккаунт EduBoost
          </p>
        </div>


        <form
          onSubmit={
            handleLogin
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
            EDU-логин или email

            <div
              style={
                fieldStyle
              }
            >
              <UserRound
                size={18}
              />

              <input
                value={
                  identifier
                }
                onChange={
                  handleIdentifierChange
                }
                placeholder="EDU-194392"
                autoComplete="username"
                style={
                  inputStyle
                }
              />
            </div>
          </label>


          <label
            style={
              labelStyle
            }
          >
            Пароль

            <div
              style={
                fieldStyle
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

                  clearMessages()
                }}
                placeholder="Введите пароль"
                autoComplete="current-password"
                style={
                  inputStyle
                }
              />
            </div>
          </label>


          <button
            type="button"
            onClick={
              openEmailRecovery
            }
            style={
              forgotStyle
            }
          >
            Забыли пароль?
          </button>


          {success && (
            <div
              style={
                successStyle
              }
            >
              {success}
            </div>
          )}


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
            <LogIn
              size={18}
            />

            {loading
              ? 'Входим...'
              : 'Войти'}
          </button>
        </form>


        <div
          style={
            dividerStyle
          }
        >
          <span
            style={
              dividerLineStyle
            }
          />

          <small>
            Первый вход
          </small>

          <span
            style={
              dividerLineStyle
            }
          />
        </div>


        <button
          type="button"
          onClick={
            openStudentActivation
          }
          style={
            activationButtonStyle
          }
        >
          <div
            style={
              studentIconStyle
            }
          >
            <GraduationCap
              size={22}
            />
          </div>

          <div
            style={
              activationTextStyle
            }
          >
            <strong>
              Первый вход ученика
            </strong>

            <span>
              У меня есть код EB
            </span>
          </div>

          <ArrowRight
            size={18}
          />
        </button>


        <button
          type="button"
          onClick={
            openStaffActivation
          }
          style={
            activationButtonStyle
          }
        >
          <div
            style={
              teacherIconStyle
            }
          >
            <School
              size={22}
            />
          </div>

          <div
            style={
              activationTextStyle
            }
          >
            <strong>
              Первый вход учителя
            </strong>

            <span>
              У меня есть код ET
            </span>
          </div>

          <ArrowRight
            size={18}
          />
        </button>


        <div
          style={
            schoolHintStyle
          }
        >
          <strong>
            Нет данных для входа?
          </strong>

          <span>
            Ученик или сотрудник получает
            доступ через администрацию своей школы.
          </span>
        </div>
      </Page>
    )
  }


  /* ========================================
     EMAIL RECOVERY — REQUEST
  ======================================== */

  if (
    mode ===
      'email-recovery' &&
    recoveryStage ===
      'request'
  ) {
    return (
      <Page>
        <button
          type="button"
          onClick={
            backToLogin
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
            recoveryIconStyle
          }
        >
          <Mail
            size={28}
          />
        </div>


        <h1
          style={
            titleStyle
          }
        >
          Забыли пароль?
        </h1>


        <p
          style={
            recoverySubtitleStyle
          }
        >
          Введите свой EDU-логин.
          Если к аккаунту привязан
          подтверждённый email,
          мы отправим на него код.
        </p>


        <form
          onSubmit={
            handleSendRecoveryCode
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
            EDU-логин

            <div
              style={
                fieldStyle
              }
            >
              <UserRound
                size={18}
              />

              <input
                value={
                  recoveryLogin
                }
                onChange={(
                  event,
                ) => {
                  setRecoveryLogin(
                    event.target.value
                      .toUpperCase(),
                  )

                  clearMessages()
                }}
                placeholder="EDU-194392"
                autoComplete="username"
                style={
                  inputStyle
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


          <div
            style={
              recoveryHintStyle
            }
          >
            <ShieldCheck
              size={18}
            />

            <span>
              В целях безопасности EduBoost
              не сообщает, существует ли
              введённый аккаунт.
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
            <Mail
              size={18}
            />

            {loading
              ? 'Отправляем...'
              : 'Отправить код'}
          </button>


          <button
            type="button"
            onClick={
              openStudentErRecovery
            }
            style={
              secondaryTextButtonStyle
            }
          >
            У ученика есть ER-код
          </button>
        </form>
      </Page>
    )
  }


  /* ========================================
     EMAIL RECOVERY — CODE + PASSWORD
  ======================================== */

  if (
    mode ===
      'email-recovery'
  ) {
    return (
      <Page>
        <button
          type="button"
          onClick={() => {
            clearMessages()

            setRecoveryStage(
              'request',
            )
          }}
          style={
            backButtonStyle
          }
        >
          <ArrowLeft
            size={18}
          />

          Изменить EDU-логин
        </button>


        <div
          style={
            recoveryIconStyle
          }
        >
          <KeyRound
            size={28}
          />
        </div>


        <h1
          style={
            titleStyle
          }
        >
          Создайте новый пароль
        </h1>


        <p
          style={
            recoverySubtitleStyle
          }
        >
          Код действует 10 минут.
          Введите 6 цифр из письма
          и новый пароль.
        </p>


        {success && (
          <div
            style={
              neutralNoticeStyle
            }
          >
            {success}
          </div>
        )}


        <form
          onSubmit={
            handleEmailPasswordReset
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
            EDU-логин

            <div
              style={
                readonlyFieldStyle
              }
            >
              <UserRound
                size={18}
              />

              <strong>
                {recoveryLogin}
              </strong>
            </div>
          </label>


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
                  emailRecoveryCode
                }
                onChange={(
                  event,
                ) => {
                  setEmailRecoveryCode(
                    event.target.value
                      .replace(
                        /\D/g,
                        '',
                      )
                      .slice(
                        0,
                        6,
                      ),
                  )

                  clearMessages()
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


          <label
            style={
              labelStyle
            }
          >
            Новый пароль

            <div
              style={
                fieldStyle
              }
            >
              <LockKeyhole
                size={18}
              />

              <input
                type="password"
                value={
                  newPassword
                }
                onChange={(
                  event,
                ) => {
                  setNewPassword(
                    event.target.value,
                  )

                  clearMessages()
                }}
                placeholder="Минимум 8 символов"
                autoComplete="new-password"
                style={
                  inputStyle
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
                fieldStyle
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

                  clearMessages()
                }}
                placeholder="Повторите новый пароль"
                autoComplete="new-password"
                style={
                  inputStyle
                }
              />
            </div>
          </label>


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
            <RefreshCcw
              size={18}
            />

            {loading
              ? 'Меняем пароль...'
              : 'Сохранить новый пароль'}
          </button>


          <button
            type="button"
            onClick={() =>
              void handleResendRecoveryCode()
            }
            disabled={
              loading ||
              resendCooldown >
                0
            }
            style={{
              ...secondaryButtonStyle,

              opacity:
                (
                  loading ||
                  resendCooldown >
                    0
                )
                  ? 0.6
                  : 1,
            }}
          >
            <Mail
              size={16}
            />

            {resendCooldown > 0
              ? `Повторно через ${resendCooldown} сек.`
              : 'Отправить код повторно'}
          </button>
        </form>
      </Page>
    )
  }


  /* ========================================
     LEGACY STUDENT ER RECOVERY
  ======================================== */

  return (
    <Page>
      <button
        type="button"
        onClick={
          backToLogin
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
          recoveryIconStyle
        }
      >
        <RefreshCcw
          size={27}
        />
      </div>


      <h1
        style={
          titleStyle
        }
      >
        Восстановление ученика
      </h1>


      <p
        style={
          recoverySubtitleStyle
        }
      >
        Резервное восстановление через
        EDU-логин и ER-код администратора.
      </p>


      <form
        onSubmit={
          handleStudentErRecovery
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
          EDU-логин

          <div
            style={
              fieldStyle
            }
          >
            <UserRound
              size={18}
            />

            <input
              value={
                erRecoveryLogin
              }
              onChange={(
                event,
              ) =>
                setErRecoveryLogin(
                  event.target.value
                    .toUpperCase(),
                )
              }
              placeholder="EDU-XXXX-XXXX-XXXX"
              style={
                inputStyle
              }
            />
          </div>
        </label>


        <label
          style={
            labelStyle
          }
        >
          ER-код

          <div
            style={
              fieldStyle
            }
          >
            <KeyRound
              size={18}
            />

            <input
              value={
                erRecoveryCode
              }
              onChange={(
                event,
              ) =>
                setErRecoveryCode(
                  event.target.value
                    .toUpperCase(),
                )
              }
              placeholder="ER-XXXX-XXXX-XXXX"
              style={
                inputStyle
              }
            />
          </div>
        </label>


        <label
          style={
            labelStyle
          }
        >
          Новый пароль

          <div
            style={
              fieldStyle
            }
          >
            <LockKeyhole
              size={18}
            />

            <input
              type="password"
              value={
                erNewPassword
              }
              onChange={(
                event,
              ) =>
                setErNewPassword(
                  event.target.value,
                )
              }
              placeholder="Минимум 8 символов"
              style={
                inputStyle
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
              fieldStyle
            }
          >
            <LockKeyhole
              size={18}
            />

            <input
              type="password"
              value={
                erConfirmPassword
              }
              onChange={(
                event,
              ) =>
                setErConfirmPassword(
                  event.target.value,
                )
              }
              placeholder="Повторите пароль"
              style={
                inputStyle
              }
            />
          </div>
        </label>


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
          style={
            primaryButtonStyle
          }
        >
          <RefreshCcw
            size={18}
          />

          {loading
            ? 'Восстанавливаем...'
            : 'Создать новый пароль'}
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
   BRAND
======================================== */

function Brand() {
  return (
    <div
      style={
        brandStyle
      }
    >
      <div
        style={
          brandIconStyle
        }
      >
        <BookOpen
          size={24}
        />
      </div>

      <strong>
        EduBoost
      </strong>
    </div>
  )
}


/* ========================================
   STYLES
======================================== */

const pageStyle = {
  minHeight: '100dvh',
  padding: '18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f4f8ff',
  boxSizing: 'border-box',
}


const cardStyle = {
  width: '100%',
  maxWidth: '455px',
  padding: '28px',
  boxSizing: 'border-box',
  background: '#ffffff',
  border: '1px solid #dce7f5',
  borderRadius: '25px',
  boxShadow:
    '0 20px 60px rgba(29,78,216,.10)',
}


const brandStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '25px',
  color: '#1267e8',
  fontSize: '24px',
}


const brandIconStyle = {
  width: '46px',
  height: '46px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '14px',
  background: '#1267e8',
  color: '#ffffff',
}


const headingStyle = {
  marginBottom: '22px',
}


const titleStyle = {
  margin: 0,
  color: '#102343',
  fontSize: '27px',
  textAlign: 'center',
}


const subtitleStyle = {
  margin: '8px 0 0',
  color: '#718096',
  fontSize: '13px',
  lineHeight: 1.55,
  textAlign: 'center',
}


const recoverySubtitleStyle = {
  ...subtitleStyle,
  margin: '9px 0 22px',
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


const fieldStyle = {
  minHeight: '51px',
  padding: '0 13px',
  display: 'flex',
  alignItems: 'center',
  gap: '9px',
  border: '1px solid #d8e3ef',
  borderRadius: '13px',
  background: '#ffffff',
  color: '#8ba0bb',
}


const readonlyFieldStyle = {
  ...fieldStyle,
  background: '#f8fafc',
  color: '#1267e8',
}


const inputStyle = {
  width: '100%',
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: '#102343',
  fontSize: '14px',
}


const codeFieldStyle = {
  minHeight: '62px',
  padding: '0 13px',
  display: 'flex',
  alignItems: 'center',
  border: '2px solid #bdd9ff',
  borderRadius: '14px',
  background: '#f8fbff',
}


const codeInputStyle = {
  width: '100%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  textAlign: 'center',
  color: '#102343',
  fontSize: '29px',
  fontWeight: 800,
  letterSpacing: '8px',
}


const fieldHintStyle = {
  color: '#94a3b8',
  fontSize: '10px',
  fontWeight: 500,
}


const forgotStyle = {
  justifySelf: 'end',
  marginTop: '-5px',
  padding: '2px 0',
  border: 'none',
  background: 'transparent',
  color: '#1267e8',
  fontWeight: 700,
  cursor: 'pointer',
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
  minHeight: '47px',
  padding: '0 14px',
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


const secondaryTextButtonStyle = {
  justifySelf: 'center',
  border: 'none',
  padding: '3px',
  background: 'transparent',
  color: '#64748b',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
}


const errorStyle = {
  padding: '11px 13px',
  borderRadius: '11px',
  background: '#fff1f2',
  color: '#be123c',
  fontSize: '12px',
  lineHeight: 1.5,
}


const successStyle = {
  padding: '11px 13px',
  borderRadius: '11px',
  background: '#ecfdf5',
  color: '#047857',
  fontSize: '12px',
  lineHeight: 1.5,
}


const neutralNoticeStyle = {
  marginBottom: '15px',
  padding: '11px 13px',
  borderRadius: '11px',
  background: '#eef6ff',
  color: '#315d95',
  fontSize: '11px',
  lineHeight: 1.5,
}


const dividerStyle = {
  margin: '23px 0 13px',
  display: 'grid',
  gridTemplateColumns:
    '1fr auto 1fr',
  gap: '10px',
  alignItems: 'center',
  color: '#94a3b8',
}


const dividerLineStyle = {
  height: '1px',
  background: '#e2e8f0',
}


const activationButtonStyle = {
  width: '100%',
  minHeight: '72px',
  padding: '11px',
  marginBottom: '9px',
  display: 'flex',
  alignItems: 'center',
  gap: '11px',
  border: '1px solid #d8e6f7',
  borderRadius: '15px',
  background: '#f8fbff',
  color: '#102343',
  textAlign: 'left',
  cursor: 'pointer',
}


const studentIconStyle = {
  width: '45px',
  height: '45px',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '13px',
  background: '#eaf3ff',
  color: '#1267e8',
}


const teacherIconStyle = {
  ...studentIconStyle,
  background: '#ecfdf5',
  color: '#059669',
}


const activationTextStyle = {
  flex: 1,
  display: 'grid',
  gap: '3px',
}


const schoolHintStyle = {
  marginTop: '13px',
  padding: '11px 13px',
  display: 'grid',
  gap: '3px',
  borderRadius: '11px',
  background: '#f8fafc',
  color: '#718096',
  fontSize: '11px',
  lineHeight: 1.5,
}


const backButtonStyle = {
  padding: 0,
  marginBottom: '18px',
  border: 'none',
  background: 'transparent',
  color: '#64748b',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontWeight: 700,
  cursor: 'pointer',
}


const recoveryIconStyle = {
  width: '60px',
  height: '60px',
  margin: '0 auto 14px',
  borderRadius: '18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#e8f8ef',
  color: '#059669',
}


const recoveryHintStyle = {
  padding: '10px 11px',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px',
  borderRadius: '10px',
  background: '#f8fafc',
  color: '#718096',
  fontSize: '11px',
  lineHeight: 1.5,
}


export default LoginPage