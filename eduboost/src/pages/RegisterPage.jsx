import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router-dom'

import {
  useAuth,
} from '../context/AuthContext'

import {
  supabase,
} from '../lib/supabase'


function RegisterPage() {
  const navigate =
    useNavigate()


  const {
    register,
  } = useAuth()


  const [
    form,
    setForm,
  ] = useState({
    name: '',
    email: '',
    role: '',
    school: '',
    schoolId: '',
    className: '',
    password: '',
    passwordConfirmation: '',
  })


  const [
    schools,
    setSchools,
  ] = useState([])


  const [
    schoolsLoading,
    setSchoolsLoading,
  ] = useState(true)


  const [
    error,
    setError,
  ] = useState('')


  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false)


  useEffect(() => {
    void loadSchools()
  }, [])


  async function loadSchools() {
    try {
      setSchoolsLoading(true)


      const {
        data,
        error:
          schoolsError,
      } =
        await supabase
          .from('schools')
          .select(`
            id,
            name,
            short_name,
            city,
            status
          `)
          .eq(
            'status',
            'active',
          )
          .order(
            'name',
            {
              ascending:
                true,
            },
          )


      if (
        schoolsError
      ) {
        throw schoolsError
      }


      setSchools(
        Array.isArray(data)
          ? data
          : [],
      )
    } catch (
      loadError
    ) {
      console.error(
        'Ошибка загрузки школ:',
        loadError,
      )


      setSchools([])


      setError(
        'Не удалось загрузить список школ',
      )
    } finally {
      setSchoolsLoading(false)
    }
  }


  function handleChange(
    event,
  ) {
    const {
      name,
      value,
    } =
      event.target


    /*
      Школу обрабатываем отдельно,
      потому что нам нужны одновременно:

      school
      schoolId
    */
    if (
      name ===
      'schoolId'
    ) {
      const selectedSchool =
        schools.find(
          (school) =>
            String(
              school.id,
            ) ===
            String(
              value,
            ),
        )


      setForm(
        (
          previousForm,
        ) => ({
          ...previousForm,

          schoolId:
            value,

          school:
            selectedSchool
              ?.name ||
            '',
        }),
      )


      return
    }


    /*
      Если пользователь меняет роль
      с ученика на родителя,
      старый класс очищаем.
    */
    if (
      name ===
        'role' &&
      value !==
        'Ученик'
    ) {
      setForm(
        (
          previousForm,
        ) => ({
          ...previousForm,

          role:
            value,

          className:
            '',
        }),
      )


      return
    }


    setForm(
      (
        previousForm,
      ) => ({
        ...previousForm,

        [name]:
          value,
      }),
    )
  }


  async function handleSubmit(
    event,
  ) {
    event.preventDefault()


    setError('')


    if (
      ![
        'Ученик',
        'Родитель',
      ].includes(
        form.role,
      )
    ) {
      setError(
        'Выберите доступную роль',
      )

      return
    }


    if (
      !form.schoolId ||
      !form.school
    ) {
      setError(
        'Выберите школу',
      )

      return
    }


    if (
      form.password.length <
      6
    ) {
      setError(
        'Пароль должен содержать минимум 6 символов',
      )

      return
    }


    if (
      form.password !==
      form.passwordConfirmation
    ) {
      setError(
        'Пароли не совпадают',
      )

      return
    }


    if (
      form.role ===
        'Ученик' &&
      !form.className
    ) {
      setError(
        'Выберите класс',
      )

      return
    }


    try {
      setIsSubmitting(true)


      await register(
        form,
      )


      navigate('/')
    } catch (
      registerError
    ) {
      setError(
        registerError
          .message ||
          'Не удалось создать аккаунт',
      )
    } finally {
      setIsSubmitting(false)
    }
  }


  return (
    <div className="auth-page">
      <form
        className="auth-card"
        onSubmit={
          handleSubmit
        }
      >
        <h1 className="auth-logo">
          Edu
          <span>
            Boost
          </span>
        </h1>


        <h2>
          Регистрация
        </h2>


        <p className="auth-description">
          Создайте аккаунт
          ученика или родителя
        </p>


        <div
          style={{
            padding:
              '12px 14px',

            marginBottom:
              '18px',

            borderRadius:
              '14px',

            background:
              '#f4f8ff',

            color:
              '#49627f',

            fontSize:
              '13px',

            lineHeight:
              1.5,
          }}
        >
          Учителя, завучи,
          директора и другие
          сотрудники получают
          доступ через
          администрацию школы.
        </div>


        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}


        <label className="form-group">
          <span>
            Имя и фамилия
          </span>


          <input
            name="name"
            value={
              form.name
            }
            onChange={
              handleChange
            }
            required
            disabled={
              isSubmitting
            }
            autoComplete="name"
            placeholder="Например: Калматов Эрлан"
          />
        </label>


        <label className="form-group">
          <span>
            Электронная почта
          </span>


          <input
            type="email"
            name="email"
            value={
              form.email
            }
            onChange={
              handleChange
            }
            required
            disabled={
              isSubmitting
            }
            autoComplete="email"
            placeholder="example@gmail.com"
          />
        </label>


        <label className="form-group">
          <span>
            Кто вы?
          </span>


          <select
            name="role"
            value={
              form.role
            }
            onChange={
              handleChange
            }
            required
            disabled={
              isSubmitting
            }
          >
            <option value="">
              Выберите роль
            </option>


            <option value="Ученик">
              Ученик
            </option>


            <option value="Родитель">
              Родитель
            </option>
          </select>
        </label>


        <label className="form-group">
          <span>
            Школа
          </span>


          <select
            name="schoolId"
            value={
              form.schoolId
            }
            onChange={
              handleChange
            }
            required
            disabled={
              isSubmitting ||
              schoolsLoading
            }
          >
            <option value="">
              {schoolsLoading
                ? 'Загружаем школы...'
                : 'Выберите школу'}
            </option>


            {schools.map(
              (school) => (
                <option
                  key={
                    school.id
                  }
                  value={
                    school.id
                  }
                >
                  {school.name}

                  {school.city
                    ? ` · ${school.city}`
                    : ''}
                </option>
              ),
            )}
          </select>
        </label>


        {!schoolsLoading &&
          schools.length ===
            0 && (
            <div
              style={{
                marginTop:
                  '-8px',

                marginBottom:
                  '14px',

                color:
                  '#b91c1c',

                fontSize:
                  '13px',
              }}
            >
              Нет доступных школ.
              Обратитесь к
              администратору EduBoost.
            </div>
          )}


        {form.role ===
          'Ученик' && (
          <label className="form-group">
            <span>
              Класс
            </span>


            <select
              name="className"
              value={
                form.className
              }
              onChange={
                handleChange
              }
              required
              disabled={
                isSubmitting
              }
            >
              <option value="">
                Выберите класс
              </option>


              {[
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                8,
                9,
                10,
                11,
              ].map(
                (grade) => (
                  <option
                    key={
                      grade
                    }
                    value={`${grade} класс`}
                  >
                    {grade} класс
                  </option>
                ),
              )}
            </select>
          </label>
        )}


        <label className="form-group">
          <span>
            Пароль
          </span>


          <input
            type="password"
            name="password"
            value={
              form.password
            }
            onChange={
              handleChange
            }
            required
            minLength={6}
            disabled={
              isSubmitting
            }
            autoComplete="new-password"
          />
        </label>


        <label className="form-group">
          <span>
            Повторите пароль
          </span>


          <input
            type="password"
            name="passwordConfirmation"
            value={
              form
                .passwordConfirmation
            }
            onChange={
              handleChange
            }
            required
            minLength={6}
            disabled={
              isSubmitting
            }
            autoComplete="new-password"
          />
        </label>


        <button
          className="primary-button"
          type="submit"
          disabled={
            isSubmitting ||
            schoolsLoading ||
            schools.length ===
              0
          }
        >
          {isSubmitting
            ? 'Создаём аккаунт...'
            : 'Создать аккаунт'}
        </button>


        <p className="auth-footer">
          Уже есть аккаунт?{' '}

          <Link to="/login">
            Войти
          </Link>
        </p>
      </form>
    </div>
  )
}


export default RegisterPage