import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [form, setForm] = useState({
    name: '',
    email: '',
    role: '',
    school: '',
    className: '',
    password: '',
    passwordConfirmation: '',
  })

  const [error, setError] = useState('')

  function handleChange(event) {
    const { name, value } = event.target

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (form.password.length < 6) {
      setError(
        'Пароль должен содержать минимум 6 символов',
      )
      return
    }

    if (
      form.password !== form.passwordConfirmation
    ) {
      setError('Пароли не совпадают')
      return
    }

    if (
      form.role === 'Ученик' &&
      !form.className
    ) {
      setError('Выберите класс')
      return
    }

    try {
      register(form)
      navigate('/')
    } catch (registerError) {
      setError(registerError.message)
    }
  }

  return (
    <div className="auth-page">
      <form
        className="auth-card"
        onSubmit={handleSubmit}
      >
        <h1 className="auth-logo">
          Edu<span>Boost</span>
        </h1>

        <h2>Регистрация</h2>

        <p className="auth-description">
          Создайте аккаунт EduBoost
        </p>

        {error && (
          <div className="auth-error">{error}</div>
        )}

        <label className="form-group">
          <span>Имя и фамилия</span>

          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </label>

        <label className="form-group">
          <span>Электронная почта</span>

          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>

        <label className="form-group">
          <span>Роль</span>

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            required
          >
            <option value="">
              Выберите роль
            </option>
            <option value="Ученик">
              Ученик
            </option>
            <option value="Учитель">
              Учитель
            </option>
            <option value="Родитель">
              Родитель
            </option>
          </select>
        </label>

        <label className="form-group">
          <span>Школа</span>

          <input
            name="school"
            value={form.school}
            onChange={handleChange}
            placeholder="Например: Школа №1"
            required
          />
        </label>

        {form.role === 'Ученик' && (
          <label className="form-group">
            <span>Класс</span>

            <select
              name="className"
              value={form.className}
              onChange={handleChange}
              required
            >
              <option value="">
                Выберите класс
              </option>
              <option value="6 класс">
                6 класс
              </option>
              <option value="7 класс">
                7 класс
              </option>
              <option value="8 класс">
                8 класс
              </option>
              <option value="9 класс">
                9 класс
              </option>
              <option value="10 класс">
                10 класс
              </option>
              <option value="11 класс">
                11 класс
              </option>
            </select>
          </label>
        )}

        <label className="form-group">
          <span>Пароль</span>

          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>

        <label className="form-group">
          <span>Повторите пароль</span>

          <input
            type="password"
            name="passwordConfirmation"
            value={form.passwordConfirmation}
            onChange={handleChange}
            required
          />
        </label>

        <button
          className="primary-button"
          type="submit"
        >
          Создать аккаунт
        </button>

        <p className="auth-footer">
          Уже есть аккаунт?{' '}
          <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  )
}

export default RegisterPage