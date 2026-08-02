import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({
    email: '',
    password: '',
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

    try {
      login(form.email, form.password)
      navigate('/')
    } catch (loginError) {
      setError(loginError.message)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-logo">
          Edu<span>Boost</span>
        </h1>

        <h2>Вход</h2>

        <p className="auth-description">
          Войдите в свой аккаунт
        </p>

        {error && (
          <div className="auth-error">{error}</div>
        )}

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
          <span>Пароль</span>

          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>

        <button className="primary-button" type="submit">
          Войти
        </button>

        <p className="auth-footer">
          Нет аккаунта?{' '}
          <Link to="/register">
            Зарегистрироваться
          </Link>
        </p>
      </form>
    </div>
  )
}

export default LoginPage