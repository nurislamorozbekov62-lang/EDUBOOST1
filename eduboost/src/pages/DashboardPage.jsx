import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getLevelByXp } from '../data/levels'

function DashboardPage() {
  const {
    user,
    updateUser,
    refreshUser,
  } = useAuth()

  useEffect(() => {
    refreshUser()
  }, [])

  const level = getLevelByXp(user.xp)

  function buyFreeze() {
    const points = Number(user.points || 0)
    const freezes = Number(
      user.freezes || 0,
    )

    if (freezes >= 2) {
      alert(
        'Можно хранить максимум две заморозки',
      )
      return
    }

    if (points < 100) {
      alert(
        'Для покупки нужно 100 баллов',
      )
      return
    }

    const confirmed = window.confirm(
      'Купить заморозку серии за 100 баллов?',
    )

    if (!confirmed) {
      return
    }

    updateUser({
      points: points - 100,
      freezes: freezes + 1,
    })
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Главная</h1>

          <p>
            Образовательная платформа нового
            поколения
          </p>
        </div>
      </header>

      <section className="welcome-card">
        <div>
          <h2>
            Добро пожаловать, {user.name}!
          </h2>

          <p>
            {user.role}
            {user.className
              ? ` · ${user.className}`
              : ''}
          </p>

          {user.role === 'Ученик' && (
            <div className="welcome-level">
              {level.icon} Уровень:{' '}
              <strong>{level.name}</strong>
            </div>
          )}
        </div>

        {user.role === 'Ученик' && (
          <div className="streak-circle">
            <strong>{user.streak || 0}</strong>
            <span>дней 🔥</span>
          </div>
        )}
      </section>

      {user.role === 'Ученик' && (
        <>
          <section className="stats-grid">
            <div className="stat-card">
              <span>⭐</span>

              <strong>
                {Number(user.points || 0)}
              </strong>

              <p>Баллов</p>
            </div>

            <div className="stat-card">
              <span>⚡</span>

              <strong>
                {Number(user.xp || 0)}
              </strong>

              <p>Опыта</p>
            </div>

            <div className="stat-card">
              <span>🔥</span>

              <strong>
                {Number(user.streak || 0)}
              </strong>

              <p>Серия</p>
            </div>

            <div className="stat-card">
              <span>🧊</span>

              <strong>
                {Number(user.freezes || 0)}
              </strong>

              <p>Заморозки</p>
            </div>
          </section>

          <section className="content-card freeze-card">
            <div className="freeze-information">
              <div className="freeze-icon">
                🧊
              </div>

              <div>
                <h2>Заморозка серии</h2>

                <p>
                  Она автоматически спасёт
                  серию, если вы пропустите
                  обязательное задание.
                </p>

                <span>
                  Можно хранить максимум две
                  заморозки.
                </span>
              </div>
            </div>

            <div className="freeze-purchase">
              <strong>100 баллов</strong>

              <button
                className="primary-small-button"
                onClick={buyFreeze}
                disabled={
                  Number(user.freezes || 0) >=
                  2
                }
              >
                {Number(user.freezes || 0) >=
                2
                  ? 'Максимум куплен'
                  : 'Купить заморозку'}
              </button>
            </div>
          </section>
        </>
      )}

      {user.role === 'Учитель' && (
        <section className="stats-grid">
          <div className="stat-card">
            <span>🏫</span>
            <strong>6</strong>
            <p>Классов</p>
          </div>

          <div className="stat-card">
            <span>👨‍🎓</span>
            <strong>0</strong>
            <p>Учеников</p>
          </div>

          <div className="stat-card">
            <span>📝</span>
            <strong>0</strong>
            <p>Заданий</p>
          </div>

          <div className="stat-card">
            <span>⏳</span>
            <strong>0</strong>
            <p>На проверке</p>
          </div>
        </section>
      )}

      <section className="content-card">
        <h2>Последняя активность</h2>

        <div className="activity-item">
          <span>📝</span>

          <div>
            <strong>
              Система кабинета работает
            </strong>

            <p>
              Выполняйте задания, зарабатывайте
              опыт и поднимайтесь в рейтинге.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default DashboardPage