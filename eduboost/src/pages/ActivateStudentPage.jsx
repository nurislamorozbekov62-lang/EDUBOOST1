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
  BookOpen,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
  School,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

import {
  supabase,
} from '../lib/supabase'

import {
  sendRecoveryEmailVerification,
  verifyRecoveryEmailCode,
} from '../services/accountRecoveryService'


/* =========================================================
   CONSTANTS
========================================================= */

const EDU_SHORT_PATTERN =
  /^EDU-[0-9]{6}$/

const EDU_LEGACY_PATTERN =
  /^EDU-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/

const EB_SHORT_PATTERN =
  /^EB-[0-9]{6}$/

const EB_LEGACY_PATTERN =
  /^EB-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/


/* =========================================================
   NORMALIZATION
========================================================= */

function normalizeStudentLogin(
  value,
) {
  let result =
    String(
      value || '',
    )
      .trim()
      .toUpperCase()
      .replace(
        /\s+/g,
        '',
      )


  /*
    528284
    →
    EDU-528284
  */

  if (
    /^[0-9]{6}$/.test(
      result,
    )
  ) {
    result =
      `EDU-${result}`
  }


  /*
    EDU528284
    →
    EDU-528284
  */

  if (
    /^EDU[0-9]{6}$/.test(
      result,
    )
  ) {
    result =
      `EDU-${result.slice(
        3,
      )}`
  }


  return result
}


function normalizeActivationCode(
  value,
) {
  let result =
    String(
      value || '',
    )
      .trim()
      .toUpperCase()
      .replace(
        /\s+/g,
        '',
      )


  /*
    733875
    →
    EB-733875
  */

  if (
    /^[0-9]{6}$/.test(
      result,
    )
  ) {
    result =
      `EB-${result}`
  }


  /*
    EB733875
    →
    EB-733875
  */

  if (
    /^EB[0-9]{6}$/.test(
      result,
    )
  ) {
    result =
      `EB-${result.slice(
        2,
      )}`
  }


  return result
}


function isValidStudentLogin(
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


function isValidActivationCode(
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


function normalizeEmail(
  value,
) {
  return String(
    value || '',
  )
    .trim()
    .toLowerCase()
}


/* =========================================================
   PAGE
========================================================= */

function ActivateStudentPage() {
  const navigate =
    useNavigate()

  const [
    searchParams,
  ] = useSearchParams()


  /* =======================================================
     QUERY
  ======================================================= */

  const queryLogin =
    normalizeStudentLogin(
      searchParams.get(
        'login',
      ),
    )

  const queryCode =
    normalizeActivationCode(
      searchParams.get(
        'code',
      ),
    )


  /* =======================================================
     STEPS

     credentials
     password
     login-retry
     recovery-email
     recovery-code
     success
  ======================================================= */

  const [
    step,
    setStep,
  ] = useState(
    'credentials',
  )


  /* =======================================================
     ACTIVATION
  ======================================================= */

  const [
    studentLogin,
    setStudentLogin,
  ] = useState(
    isValidStudentLogin(
      queryLogin,
    )
      ? queryLogin
      : '',
  )

  const [
    activationCode,
    setActivationCode,
  ] = useState(
    isValidActivationCode(
      queryCode,
    )
      ? queryCode
      : '',
  )

  const [
    activationToken,
    setActivationToken,
  ] = useState('')

  const [
    student,
    setStudent,
  ] = useState(null)


  /* =======================================================
     PASSWORD
  ======================================================= */

  const [
    password,
    setPassword,
  ] = useState('')

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('')


  /* =======================================================
     INTERNAL AUTH

     Пользователь это НЕ видит.
  ======================================================= */

  const [
    internalEmail,
    setInternalEmail,
  ] = useState('')


  /* =======================================================
     RECOVERY EMAIL
  ======================================================= */

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


  /* =======================================================
     COMMON
  ======================================================= */

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')


  /* =======================================================
     AUTO CHECK QUERY

     Если URL содержит и EDU, и EB.
  ======================================================= */

  useEffect(() => {
    if (
      isValidStudentLogin(
        queryLogin,
      ) &&
      isValidActivationCode(
        queryCode,
      )
    ) {
      void checkStudent(
        queryLogin,
        queryCode,
      )
    }
  }, [])


  /* =======================================================
     RESEND TIMER
  ======================================================= */

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


  /* =======================================================
     CLEAR ERROR
  ======================================================= */

  function clearError() {
    setError('')
  }


  /* =======================================================
     STEP 1
     CHECK EDU + EB
  ======================================================= */

  async function checkStudent(
    selectedLogin =
      studentLogin,

    selectedCode =
      activationCode,
  ) {
    if (
      loading
    ) {
      return
    }


    clearError()

    setStudent(null)

    setActivationToken('')


    const normalizedLogin =
      normalizeStudentLogin(
        selectedLogin,
      )


    const normalizedCode =
      normalizeActivationCode(
        selectedCode,
      )


    if (
      !isValidStudentLogin(
        normalizedLogin,
      )
    ) {
      setError(
        'Проверьте EDU-логин. Например: EDU-528284.',
      )

      return
    }


    if (
      !isValidActivationCode(
        normalizedCode,
      )
    ) {
      setError(
        'Проверьте EB-код. Например: EB-733875.',
      )

      return
    }


    try {
      setLoading(
        true,
      )


      /*
        Сервер проверяет именно ПАРУ:

        EDU login
        +
        EB code
      */

      const {
        data,
        error:
          rpcError,
      } =
        await supabase
          .rpc(
            'prepare_student_activation',
            {
              p_login:
                normalizedLogin,

              p_code:
                normalizedCode,
            },
          )


      if (
        rpcError
      ) {
        console.error(
          'prepare_student_activation:',
          rpcError,
        )

        throw rpcError
      }


      const result =
        Array.isArray(
          data,
        )
          ? data[0]
          : data


      if (
        !result?.student_id ||
        !result?.activation_token
      ) {
        setError(
          'EDU-логин или EB-код неверный. Проверьте данные.',
        )

        return
      }


      setStudentLogin(
        normalizedLogin,
      )

      setActivationCode(
        normalizedCode,
      )

      setActivationToken(
        result.activation_token,
      )


      setStudent({
        id:
          result.student_id,

        fullName:
          result.full_name ||
          '',

        schoolName:
          result.school_name ||
          '',

        className:
          result.class_name ||
          '',

        academicYear:
          result.academic_year ||
          '',

        expiresAt:
          result.expires_at ||
          null,
      })


      setStep(
        'password',
      )
    } catch (
      checkError
    ) {
      console.error(
        'Student activation check:',
        checkError,
      )


      const message =
        String(
          checkError?.message ||
          '',
        )


      if (
        message.includes(
          'prepare_student_activation',
        )
      ) {
        setError(
          'Функция активации ученика не найдена в Supabase.',
        )

        return
      }


      setError(
        checkError?.message ||
          'Не удалось проверить данные ученика.',
      )
    } finally {
      setLoading(
        false,
      )
    }
  }


  async function handleCheckStudent(
    event,
  ) {
    event.preventDefault()

    await checkStudent()
  }


  /* =======================================================
     STEP 2
     CREATE PASSWORD + ACTIVATE
  ======================================================= */

  async function handleActivate(
    event,
  ) {
    event.preventDefault()

    if (
      loading
    ) {
      return
    }


    clearError()


    if (
      !student?.id ||
      !activationToken
    ) {
      setError(
        'Сессия активации устарела. Проверьте EDU и EB ещё раз.',
      )

      setStep(
        'credentials',
      )

      return
    }


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


      const {
        data,
        error:
          functionError,
      } =
        await supabase
          .functions
          .invoke(
            'activate-student',
            {
              body: {
                code:
                  activationToken,

                password,
              },
            },
          )


      if (
        functionError
      ) {
        console.error(
          'activate-student:',
          functionError,
        )

        throw new Error(
          functionError.message ||
            'Не удалось активировать аккаунт.',
        )
      }


      if (
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            'Не удалось активировать аккаунт.',
        )
      }


      if (
        !data?.internalEmail
      ) {
        throw new Error(
          'Аккаунт активирован, но система не получила данные для входа.',
        )
      }


      setInternalEmail(
        data.internalEmail,
      )


      /*
        Аккаунт уже активирован.

        Теперь пытаемся автоматически
        войти, чтобы подтвердить
        recovery email.
      */

      const {
        error:
          loginError,
      } =
        await supabase
          .auth
          .signInWithPassword({
            email:
              data.internalEmail,

            password,
          })


      if (
        loginError
      ) {
        console.error(
          'Student auto login:',
          loginError,
        )


        setError(
          'Аккаунт создан, но автоматический вход не сработал. Пароль уже сохранён.',
        )

        setStep(
          'login-retry',
        )

        return
      }


      setStep(
        'recovery-email',
      )
    } catch (
      activationError
    ) {
      console.error(
        'Student activation:',
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


  /* =======================================================
     RETRY LOGIN

     Повторно activate-student НЕ вызываем.
  ======================================================= */

  async function handleRetryLogin() {
    if (
      !internalEmail ||
      !password
    ) {
      setError(
        'Не удалось найти данные для входа.',
      )

      return
    }


    try {
      setLoading(
        true,
      )

      clearError()


      const {
        error:
          loginError,
      } =
        await supabase
          .auth
          .signInWithPassword({
            email:
              internalEmail,

            password,
          })


      if (
        loginError
      ) {
        throw loginError
      }


      setStep(
        'recovery-email',
      )
    } catch (
      loginError
    ) {
      console.error(
        'Retry student login:',
        loginError,
      )


      setError(
        'Не удалось войти автоматически. Перейдите на страницу входа и используйте EDU-логин и созданный пароль.',
      )
    } finally {
      setLoading(
        false,
      )
    }
  }


  /* =======================================================
     STEP 3
     SEND RECOVERY EMAIL
  ======================================================= */

  async function handleSendRecoveryEmail(
    event,
  ) {
    event?.preventDefault()

    if (
      loading
    ) {
      return
    }


    clearError()


    const normalizedEmail =
      normalizeEmail(
        recoveryEmail,
      )


    if (
      !EMAIL_PATTERN.test(
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
        'Student recovery email send:',
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


  /* =======================================================
     STEP 4
     VERIFY EMAIL CODE
  ======================================================= */

  async function handleVerifyRecoveryEmail(
    event,
  ) {
    event.preventDefault()

    if (
      loading
    ) {
      return
    }


    clearError()


    const normalizedCode =
      String(
        emailCode || '',
      )
        .replace(
          /\D/g,
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
        'Student recovery email verify:',
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


  /* =======================================================
     RESEND EMAIL
  ======================================================= */

  async function handleResendEmailCode() {
    if (
      loading ||
      resendCooldown >
        0
    ) {
      return
    }


    await handleSendRecoveryEmail()
  }


  /* =======================================================
     RESET BEFORE ACTIVATION
  ======================================================= */

  function backToCredentials() {
    if (
      loading
    ) {
      return
    }


    setStudent(null)

    setActivationToken('')

    setPassword('')

    setConfirmPassword('')

    clearError()

    setStep(
      'credentials',
    )
  }


  function restartActivation() {
    if (
      loading
    ) {
      return
    }


    setStudentLogin('')

    setActivationCode('')

    setActivationToken('')

    setStudent(null)

    setPassword('')

    setConfirmPassword('')

    setInternalEmail('')

    setRecoveryEmail('')

    setEmailCode('')

    setEmailMasked('')

    clearError()

    setStep(
      'credentials',
    )
  }


  /* =======================================================
     SKIP RECOVERY EMAIL

     Для ученика email не обязателен.
  ======================================================= */

  function skipRecoveryEmail() {
    navigate(
      '/',
      {
        replace:
          true,
      },
    )
  }


  /* =======================================================
     SUCCESS
  ======================================================= */

  if (
    step ===
    'success'
  ) {
    return (
      <Page>
        <Brand />


        <div
          style={
            successIconStyle
          }
        >
          <CheckCircle2
            size={35}
          />
        </div>


        <div
          style={
            titleBlockStyle
          }
        >
          <h1
            style={
              titleStyle
            }
          >
            Аккаунт готов
          </h1>

          <p
            style={
              textStyle
            }
          >
            Email подтверждён.
            Теперь через него можно
            восстановить пароль EduBoost.
          </p>
        </div>


        <div
          style={
            studentCardStyle
          }
        >
          <div
            style={
              studentAvatarStyle
            }
          >
            <GraduationCap
              size={27}
            />
          </div>


          <div
            style={
              studentInfoStyle
            }
          >
            <strong
              style={
                studentNameStyle
              }
            >
              {student?.fullName ||
                'Ученик'}
            </strong>

            <span
              style={
                studentMetaStyle
              }
            >
              {student?.className ||
                'Класс'}

              {student?.schoolName
                ? ` · ${student.schoolName}`
                : ''}
            </span>

            <span
              style={
                studentLoginStyle
              }
            >
              {studentLogin}
            </span>
          </div>
        </div>


        <InfoBox
          icon={
            Mail
          }
          label="Email восстановления"
          value={
            recoveryEmail
          }
        />


        <div
          style={
            successNoticeStyle
          }
        >
          <ShieldCheck
            size={19}
          />

          <span>
            Если пароль будет забыт,
            используйте «Забыли пароль?»
            на странице входа.
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


  /* =======================================================
     RECOVERY CODE
  ======================================================= */

  if (
    step ===
    'recovery-code'
  ) {
    return (
      <Page>
        <Brand />


        <div
          style={
            stepBadgeStyle
          }
        >
          Защита аккаунта
        </div>


        <div
          style={
            mainIconStyle
          }
        >
          <KeyRound
            size={29}
          />
        </div>


        <div
          style={
            titleBlockStyle
          }
        >
          <h1
            style={
              titleStyle
            }
          >
            Подтвердите email
          </h1>

          <p
            style={
              textStyle
            }
          >
            Мы отправили 6-значный
            код на
          </p>


          <strong
            style={
              maskedEmailStyle
            }
          >
            {emailMasked ||
              recoveryEmail}
          </strong>
        </div>


        <form
          onSubmit={
            handleVerifyRecoveryEmail
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
                codeInputWrapperStyle
              }
            >
              <input
                value={
                  emailCode
                }
                onChange={(
                  event,
                ) => {
                  setEmailCode(
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

                  clearError()
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
              securityNoteStyle
            }
          >
            <ShieldCheck
              size={17}
            />

            <span>
              Код действует 10 минут.
              После нескольких неправильных
              попыток проверка временно
              блокируется.
            </span>
          </div>


          {error && (
            <ErrorBox>
              {error}
            </ErrorBox>
          )}


          <button
            type="submit"
            disabled={
              loading
            }
            style={
              getPrimaryButtonStyle(
                loading,
              )
            }
          >
            {loading
              ? 'Проверяем...'
              : 'Подтвердить email'}
          </button>


          <button
            type="button"
            disabled={
              loading ||
              resendCooldown >
                0
            }
            onClick={() =>
              void handleResendEmailCode()
            }
            style={
              getSecondaryButtonStyle(
                loading ||
                resendCooldown >
                  0,
              )
            }
          >
            <RefreshCw
              size={16}
            />

            {resendCooldown > 0
              ? `Повторно через ${resendCooldown} сек.`
              : 'Отправить код повторно'}
          </button>


          <button
            type="button"
            disabled={
              loading
            }
            onClick={() => {
              setEmailCode('')

              clearError()

              setStep(
                'recovery-email',
              )
            }}
            style={
              textButtonStyle
            }
          >
            Изменить email
          </button>
        </form>
      </Page>
    )
  }


  /* =======================================================
     RECOVERY EMAIL
  ======================================================= */

  if (
    step ===
    'recovery-email'
  ) {
    return (
      <Page>
        <Brand />


        <div
          style={
            stepBadgeStyle
          }
        >
          Последний шаг
        </div>


        <div
          style={
            emailIconStyle
          }
        >
          <Mail
            size={29}
          />
        </div>


        <div
          style={
            titleBlockStyle
          }
        >
          <h1
            style={
              titleStyle
            }
          >
            Добавьте email
          </h1>

          <p
            style={
              textStyle
            }
          >
            Этот email понадобится,
            если вы забудете пароль.
            Можно использовать свой
            email или email родителя.
          </p>
        </div>


        <div
          style={
            studentCardStyle
          }
        >
          <div
            style={
              studentAvatarStyle
            }
          >
            <GraduationCap
              size={27}
            />
          </div>


          <div
            style={
              studentInfoStyle
            }
          >
            <strong
              style={
                studentNameStyle
              }
            >
              {student?.fullName}
            </strong>

            <span
              style={
                studentMetaStyle
              }
            >
              {student?.className}

              {student?.academicYear
                ? ` · ${student.academicYear}`
                : ''}
            </span>

            <span
              style={
                studentLoginStyle
              }
            >
              {studentLogin}
            </span>
          </div>
        </div>


        <form
          onSubmit={
            handleSendRecoveryEmail
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
                iconInputWrapperStyle
              }
            >
              <Mail
                size={19}
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

                  clearError()
                }}
                placeholder="student@gmail.com"
                autoComplete="email"
                style={
                  cleanInputStyle
                }
                autoFocus
              />
            </div>
          </label>


          <div
            style={
              securityNoteStyle
            }
          >
            <ShieldCheck
              size={17}
            />

            <span>
              Email не становится вашим
              логином. Вход остаётся через
              EDU-логин и пароль.
            </span>
          </div>


          {error && (
            <ErrorBox>
              {error}
            </ErrorBox>
          )}


          <button
            type="submit"
            disabled={
              loading
            }
            style={
              getPrimaryButtonStyle(
                loading,
              )
            }
          >
            <Mail
              size={17}
            />

            {loading
              ? 'Отправляем...'
              : 'Получить код'}
          </button>


          <button
            type="button"
            disabled={
              loading
            }
            onClick={
              skipRecoveryEmail
            }
            style={
              textButtonStyle
            }
          >
            Пропустить пока
          </button>
        </form>


        <p
          style={
            helpStyle
          }
        >
          Email можно будет добавить
          позже в настройках аккаунта.
        </p>
      </Page>
    )
  }


  /* =======================================================
     LOGIN RETRY
  ======================================================= */

  if (
    step ===
    'login-retry'
  ) {
    return (
      <Page>
        <Brand />


        <div
          style={
            warningIconStyle
          }
        >
          <RefreshCw
            size={30}
          />
        </div>


        <div
          style={
            titleBlockStyle
          }
        >
          <h1
            style={
              titleStyle
            }
          >
            Аккаунт создан
          </h1>

          <p
            style={
              textStyle
            }
          >
            Ваш пароль уже сохранён.
            Осталось выполнить вход.
          </p>
        </div>


        {error && (
          <ErrorBox>
            {error}
          </ErrorBox>
        )}


        <button
          type="button"
          disabled={
            loading
          }
          onClick={() =>
            void handleRetryLogin()
          }
          style={
            getPrimaryButtonStyle(
              loading,
            )
          }
        >
          {loading
            ? 'Входим...'
            : 'Повторить вход'}
        </button>


        <button
          type="button"
          disabled={
            loading
          }
          onClick={() =>
            navigate(
              '/login',
              {
                replace:
                  true,
              },
            )
          }
          style={
            secondaryButtonStyle
          }
        >
          Перейти на страницу входа
        </button>
      </Page>
    )
  }


  /* =======================================================
     PASSWORD
  ======================================================= */

  if (
    step ===
    'password'
  ) {
    return (
      <Page>
        <button
          type="button"
          disabled={
            loading
          }
          onClick={
            backToCredentials
          }
          style={
            backButtonStyle
          }
        >
          <ArrowLeft
            size={18}
          />

          Другие данные
        </button>


        <Brand />


        <div
          style={
            stepBadgeStyle
          }
        >
          Шаг 2
        </div>


        <div
          style={
            successIconStyle
          }
        >
          <CheckCircle2
            size={33}
          />
        </div>


        <div
          style={
            titleBlockStyle
          }
        >
          <h1
            style={
              titleStyle
            }
          >
            Проверьте данные
          </h1>

          <p
            style={
              textStyle
            }
          >
            Если всё верно,
            придумайте пароль для
            своего аккаунта.
          </p>
        </div>


        <div
          style={
            studentCardStyle
          }
        >
          <div
            style={
              studentAvatarStyle
            }
          >
            <UserRound
              size={27}
            />
          </div>


          <div
            style={
              studentInfoStyle
            }
          >
            <strong
              style={
                studentNameStyle
              }
            >
              {student?.fullName}
            </strong>

            <span
              style={
                studentMetaStyle
              }
            >
              {student?.className ||
                'Класс не указан'}

              {student?.academicYear
                ? ` · ${student.academicYear}`
                : ''}
            </span>

            <span
              style={
                studentLoginStyle
              }
            >
              {studentLogin}
            </span>
          </div>
        </div>


        <InfoBox
          icon={
            School
          }
          label="Школа"
          value={
            student?.schoolName ||
            'Школа'
          }
        />


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
                iconInputWrapperStyle
              }
            >
              <LockKeyhole
                size={19}
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

                  clearError()
                }}
                placeholder="Минимум 8 символов"
                autoComplete="new-password"
                style={
                  cleanInputStyle
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
            Повторите пароль

            <div
              style={
                iconInputWrapperStyle
              }
            >
              <LockKeyhole
                size={19}
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

                  clearError()
                }}
                placeholder="Введите пароль ещё раз"
                autoComplete="new-password"
                style={
                  cleanInputStyle
                }
              />
            </div>
          </label>


          <PasswordHint
            password={
              password
            }
            confirmPassword={
              confirmPassword
            }
          />


          {error && (
            <ErrorBox>
              {error}
            </ErrorBox>
          )}


          <button
            type="submit"
            disabled={
              loading
            }
            style={
              getPrimaryButtonStyle(
                loading,
              )
            }
          >
            {loading
              ? 'Создаём аккаунт...'
              : 'Создать аккаунт'}
          </button>


          <button
            type="button"
            disabled={
              loading
            }
            onClick={
              backToCredentials
            }
            style={
              secondaryButtonStyle
            }
          >
            Это не я
          </button>
        </form>
      </Page>
    )
  }


  /* =======================================================
     CREDENTIALS
  ======================================================= */

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


      <Brand />


      <div
        style={
          stepBadgeStyle
        }
      >
        Шаг 1
      </div>


      <div
        style={
          mainIconStyle
        }
      >
        <KeyRound
          size={29}
        />
      </div>


      <div
        style={
          titleBlockStyle
        }
      >
        <h1
          style={
            titleStyle
          }
        >
          Первый вход ученика
        </h1>

        <p
          style={
            textStyle
          }
        >
          Введите постоянный EDU-логин
          и одноразовый EB-код,
          полученные в школе.
        </p>
      </div>


      <form
        onSubmit={
          handleCheckStudent
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
              iconInputWrapperStyle
            }
          >
            <UserRound
              size={19}
            />

            <input
              value={
                studentLogin
              }
              onChange={(
                event,
              ) => {
                setStudentLogin(
                  event.target.value
                    .toUpperCase(),
                )

                clearError()
              }}
              placeholder="EDU-528284"
              autoComplete="username"
              autoCapitalize="characters"
              spellCheck={false}
              style={
                cleanInputStyle
              }
              autoFocus
            />
          </div>

          <small
            style={
              fieldHelpStyle
            }
          >
            Можно ввести только 6 цифр:
            528284
          </small>
        </label>


        <label
          style={
            labelStyle
          }
        >
          EB-код первого входа

          <div
            style={
              iconInputWrapperStyle
            }
          >
            <KeyRound
              size={19}
            />

            <input
              value={
                activationCode
              }
              onChange={(
                event,
              ) => {
                setActivationCode(
                  event.target.value
                    .toUpperCase(),
                )

                clearError()
              }}
              placeholder="EB-733875"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              style={
                cleanInputStyle
              }
            />
          </div>

          <small
            style={
              fieldHelpStyle
            }
          >
            Можно ввести только 6 цифр:
            733875
          </small>
        </label>


        <div
          style={
            securityNoteStyle
          }
        >
          <ShieldCheck
            size={17}
          />

          <span>
            EDU-логин и EB-код должны
            принадлежать одному ученику.
            EB используется только один раз.
          </span>
        </div>


        {error && (
          <ErrorBox>
            {error}
          </ErrorBox>
        )}


        <button
          type="submit"
          disabled={
            loading
          }
          style={
            getPrimaryButtonStyle(
              loading,
            )
          }
        >
          {loading
            ? 'Проверяем...'
            : 'Продолжить'}
        </button>
      </form>


      <p
        style={
          helpStyle
        }
      >
        Потеряли данные первого входа?
        Обратитесь к администратору школы.
      </p>
    </Page>
  )
}


/* =========================================================
   PAGE
========================================================= */

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


/* =========================================================
   BRAND
========================================================= */

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


/* =========================================================
   INFO BOX
========================================================= */

function InfoBox({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div
      style={
        infoBoxStyle
      }
    >
      <div
        style={
          infoIconStyle
        }
      >
        <Icon
          size={19}
        />
      </div>

      <div
        style={
          infoTextStyle
        }
      >
        <span
          style={
            infoLabelStyle
          }
        >
          {label}
        </span>

        <strong
          style={
            infoValueStyle
          }
        >
          {value || '—'}
        </strong>
      </div>
    </div>
  )
}


/* =========================================================
   ERROR
========================================================= */

function ErrorBox({
  children,
}) {
  return (
    <div
      style={
        errorStyle
      }
    >
      {children}
    </div>
  )
}


/* =========================================================
   PASSWORD HINT
========================================================= */

function PasswordHint({
  password,
  confirmPassword,
}) {
  const enough =
    password.length >=
    8

  const validLength =
    password.length <=
    72

  const matches =
    password.length >
      0 &&
    confirmPassword.length >
      0 &&
    password ===
      confirmPassword


  return (
    <div
      style={
        passwordHintWrapperStyle
      }
    >
      <HintRow
        active={
          enough
        }
      >
        Минимум 8 символов
      </HintRow>

      <HintRow
        active={
          validLength
        }
      >
        Не больше 72 символов
      </HintRow>

      <HintRow
        active={
          matches
        }
      >
        Пароли совпадают
      </HintRow>
    </div>
  )
}


function HintRow({
  active,
  children,
}) {
  return (
    <div
      style={
        passwordHintRowStyle
      }
    >
      <span
        style={{
          ...statusDotStyle,

          background:
            active
              ? '#10b981'
              : '#cbd5e1',
        }}
      />

      {children}
    </div>
  )
}


/* =========================================================
   BUTTON STYLES
========================================================= */

function getPrimaryButtonStyle(
  disabled,
) {
  return {
    ...primaryButtonStyle,

    opacity:
      disabled
        ? 0.65
        : 1,

    cursor:
      disabled
        ? 'wait'
        : 'pointer',
  }
}


function getSecondaryButtonStyle(
  disabled,
) {
  return {
    ...secondaryButtonStyle,

    opacity:
      disabled
        ? 0.6
        : 1,

    cursor:
      disabled
        ? 'not-allowed'
        : 'pointer',
  }
}


/* =========================================================
   STYLES
========================================================= */

const pageStyle = {
  minHeight:
    '100dvh',

  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'center',

  padding:
    '18px',

  boxSizing:
    'border-box',

  background:
    '#f4f8ff',
}


const cardStyle = {
  width:
    '100%',

  maxWidth:
    '450px',

  padding:
    '26px',

  boxSizing:
    'border-box',

  background:
    '#ffffff',

  border:
    '1px solid #dbe7f5',

  borderRadius:
    '25px',

  boxShadow:
    '0 18px 55px rgba(30,64,175,.10)',
}


const backButtonStyle = {
  display:
    'inline-flex',

  alignItems:
    'center',

  gap:
    '6px',

  marginBottom:
    '18px',

  padding:
    0,

  color:
    '#64748b',

  fontSize:
    '13px',

  fontWeight:
    700,

  background:
    'transparent',

  border:
    'none',

  cursor:
    'pointer',
}


const brandStyle = {
  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'center',

  gap:
    '10px',

  marginBottom:
    '22px',

  color:
    '#1267e8',

  fontSize:
    '22px',
}


const brandIconStyle = {
  width:
    '44px',

  height:
    '44px',

  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'center',

  color:
    '#ffffff',

  background:
    '#1267e8',

  borderRadius:
    '14px',
}


const stepBadgeStyle = {
  width:
    'fit-content',

  margin:
    '0 auto 13px',

  padding:
    '6px 11px',

  color:
    '#1267e8',

  fontSize:
    '10px',

  fontWeight:
    800,

  textTransform:
    'uppercase',

  letterSpacing:
    '.04em',

  background:
    '#edf5ff',

  borderRadius:
    '999px',
}


const mainIconStyle = {
  width:
    '62px',

  height:
    '62px',

  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'center',

  margin:
    '0 auto 14px',

  color:
    '#1267e8',

  background:
    '#eaf3ff',

  borderRadius:
    '19px',
}


const emailIconStyle = {
  ...mainIconStyle,

  color:
    '#7c3aed',

  background:
    '#f3e8ff',
}


const successIconStyle = {
  ...mainIconStyle,

  color:
    '#059669',

  background:
    '#dcfce7',
}


const warningIconStyle = {
  ...mainIconStyle,

  color:
    '#d97706',

  background:
    '#fff7ed',
}


const titleBlockStyle = {
  marginBottom:
    '22px',

  textAlign:
    'center',
}


const titleStyle = {
  margin:
    '0 0 8px',

  color:
    '#102343',

  fontSize:
    '26px',

  lineHeight:
    1.2,

  textAlign:
    'center',
}


const textStyle = {
  maxWidth:
    '350px',

  margin:
    '0 auto',

  color:
    '#64748b',

  fontSize:
    '13px',

  lineHeight:
    1.55,

  textAlign:
    'center',
}


const formStyle = {
  display:
    'grid',

  gap:
    '14px',
}


const labelStyle = {
  display:
    'grid',

  gap:
    '7px',

  color:
    '#223b63',

  fontSize:
    '13px',

  fontWeight:
    700,
}


const iconInputWrapperStyle = {
  width:
    '100%',

  minHeight:
    '52px',

  display:
    'flex',

  alignItems:
    'center',

  gap:
    '10px',

  padding:
    '0 14px',

  boxSizing:
    'border-box',

  color:
    '#7890ad',

  background:
    '#ffffff',

  border:
    '1px solid #d7e2ef',

  borderRadius:
    '14px',
}


const cleanInputStyle = {
  flex:
    1,

  minWidth:
    0,

  width:
    '100%',

  color:
    '#102343',

  fontSize:
    '15px',

  fontWeight:
    600,

  background:
    'transparent',

  border:
    'none',

  outline:
    'none',
}


const codeInputWrapperStyle = {
  minHeight:
    '63px',

  display:
    'flex',

  alignItems:
    'center',

  padding:
    '0 14px',

  background:
    '#f8fbff',

  border:
    '2px solid #bdd9ff',

  borderRadius:
    '15px',
}


const codeInputStyle = {
  width:
    '100%',

  border:
    'none',

  outline:
    'none',

  color:
    '#102343',

  background:
    'transparent',

  textAlign:
    'center',

  fontSize:
    '30px',

  fontWeight:
    800,

  letterSpacing:
    '9px',
}


const fieldHelpStyle = {
  color:
    '#94a3b8',

  fontSize:
    '10px',

  fontWeight:
    500,
}


const primaryButtonStyle = {
  width:
    '100%',

  minHeight:
    '52px',

  padding:
    '0 16px',

  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'center',

  gap:
    '7px',

  color:
    '#ffffff',

  fontSize:
    '14px',

  fontWeight:
    800,

  background:
    '#1267e8',

  border:
    'none',

  borderRadius:
    '14px',

  cursor:
    'pointer',
}


const secondaryButtonStyle = {
  width:
    '100%',

  minHeight:
    '49px',

  padding:
    '0 14px',

  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'center',

  gap:
    '7px',

  color:
    '#52657d',

  fontSize:
    '13px',

  fontWeight:
    700,

  background:
    '#ffffff',

  border:
    '1px solid #d7e2ef',

  borderRadius:
    '14px',

  cursor:
    'pointer',
}


const textButtonStyle = {
  justifySelf:
    'center',

  padding:
    '4px',

  color:
    '#64748b',

  fontSize:
    '12px',

  fontWeight:
    700,

  background:
    'transparent',

  border:
    'none',

  cursor:
    'pointer',
}


const errorStyle = {
  padding:
    '12px 13px',

  color:
    '#be123c',

  fontSize:
    '12px',

  lineHeight:
    1.5,

  background:
    '#fff1f2',

  border:
    '1px solid #ffe0e5',

  borderRadius:
    '12px',
}


const securityNoteStyle = {
  display:
    'flex',

  alignItems:
    'flex-start',

  gap:
    '8px',

  padding:
    '11px 12px',

  color:
    '#52657d',

  fontSize:
    '11px',

  lineHeight:
    1.5,

  background:
    '#f7faff',

  borderRadius:
    '12px',
}


const successNoticeStyle = {
  ...securityNoteStyle,

  margin:
    '15px 0',

  color:
    '#047857',

  background:
    '#ecfdf5',
}


const helpStyle = {
  margin:
    '17px 0 0',

  color:
    '#94a3b8',

  fontSize:
    '11px',

  lineHeight:
    1.5,

  textAlign:
    'center',
}


const studentCardStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    '13px',

  marginBottom:
    '13px',

  padding:
    '14px',

  background:
    '#f0f6ff',

  border:
    '1px solid #dfebfb',

  borderRadius:
    '17px',
}


const studentAvatarStyle = {
  width:
    '50px',

  height:
    '50px',

  flexShrink:
    0,

  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'center',

  color:
    '#ffffff',

  background:
    '#1267e8',

  borderRadius:
    '15px',
}


const studentInfoStyle = {
  minWidth:
    0,

  display:
    'grid',

  gap:
    '3px',
}


const studentNameStyle = {
  display:
    'block',

  overflow:
    'hidden',

  color:
    '#102343',

  fontSize:
    '15px',

  textOverflow:
    'ellipsis',

  whiteSpace:
    'nowrap',
}


const studentMetaStyle = {
  color:
    '#64748b',

  fontSize:
    '11px',
}


const studentLoginStyle = {
  marginTop:
    '2px',

  color:
    '#1267e8',

  fontSize:
    '11px',

  fontWeight:
    800,
}


const infoBoxStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    '10px',

  marginBottom:
    '18px',

  padding:
    '12px 14px',

  background:
    '#f8fafc',

  border:
    '1px solid #e5edf6',

  borderRadius:
    '14px',
}


const infoIconStyle = {
  width:
    '38px',

  height:
    '38px',

  flexShrink:
    0,

  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'center',

  color:
    '#1267e8',

  background:
    '#eaf3ff',

  borderRadius:
    '11px',
}


const infoTextStyle = {
  minWidth:
    0,

  display:
    'grid',

  gap:
    '2px',
}


const infoLabelStyle = {
  color:
    '#8292a8',

  fontSize:
    '10px',
}


const infoValueStyle = {
  overflowWrap:
    'anywhere',

  color:
    '#102343',

  fontSize:
    '12px',
}


const maskedEmailStyle = {
  display:
    'block',

  marginTop:
    '8px',

  color:
    '#1267e8',

  fontSize:
    '14px',

  fontWeight:
    800,
}


const passwordHintWrapperStyle = {
  display:
    'grid',

  gap:
    '6px',

  padding:
    '10px 12px',

  color:
    '#64748b',

  fontSize:
    '11px',

  background:
    '#f8fafc',

  borderRadius:
    '11px',
}


const passwordHintRowStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    '7px',
}


const statusDotStyle = {
  width:
    '7px',

  height:
    '7px',

  flexShrink:
    0,

  borderRadius:
    '999px',
}


export default ActivateStudentPage