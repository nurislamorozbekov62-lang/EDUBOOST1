import {
  getStudentCode,
} from '../services/parentService'
import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { getLevelByXp } from '../data/levels'
import {
  achievements,
  getUnlockedAchievements,
} from '../data/achievements'

function ProfilePage() {
  const { user, updateUser } = useAuth()

  const level = getLevelByXp(user.xp)

  const unlockedAchievements =
    getUnlockedAchievements(user)

  const ownedRewards = useMemo(
    () => user.ownedRewards || [],
    [user.ownedRewards],
  )

  const availableFrames = [
    {
      id: 'default',
      name: 'Обычная рамка',
      className: 'profile-frame-default',
      owned: true,
    },
    {
      id: 'blue-frame',
      name: 'Синяя рамка',
      className: 'profile-frame-blue',
      owned: ownedRewards.includes(
        'blue-frame',
      ),
    },
    {
      id: 'gold-frame',
      name: 'Золотая рамка',
      className: 'profile-frame-gold',
      owned: ownedRewards.includes(
        'gold-frame',
      ),
    },
  ]

  const availableBackgrounds = [
    {
      id: 'default',
      name: 'Обычный фон',
      className: 'profile-background-default',
      owned: true,
    },
    {
      id: 'profile-background',
      name: 'Фиолетовый фон',
      className: 'profile-background-purple',
      owned: ownedRewards.includes(
        'profile-background',
      ),
    },
  ]

  const activeFrame =
    user.activeFrame || 'default'

  const activeBackground =
    user.activeBackground || 'default'

  const currentFrame =
    availableFrames.find(
      (frame) => frame.id === activeFrame,
    ) || availableFrames[0]

  const currentBackground =
    availableBackgrounds.find(
      (background) =>
        background.id === activeBackground,
    ) || availableBackgrounds[0]

  function selectFrame(frame) {
    if (!frame.owned) {
      alert(
        'Сначала купите эту рамку в магазине наград',
      )
      return
    }

    updateUser({
      activeFrame: frame.id,
    })
  }

  function selectBackground(background) {
    if (!background.owned) {
      alert(
        'Сначала купите этот фон в магазине наград',
      )
      return
    }

    updateUser({
      activeBackground: background.id,
    })
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Мой профиль</h1>

          <p>
            Статистика, достижения и оформление
            профиля
          </p>
        </div>
      </header>

      <section
        className={`profile-hero ${currentBackground.className}`}
      >
        <div
          className={`profile-main-avatar ${currentFrame.className}`}
        >
          {user.name
            .charAt(0)
            .toUpperCase()}
        </div>

        <div className="profile-main-info">
          <span className="profile-role">
            {user.role}
          </span>

          <h2>{user.name}</h2>

          <p>
            {user.school}
            {user.className
              ? ` · ${user.className}`
              : ''}
          </p>

          <div className="profile-level-badge">
            {level.icon} {level.name}
          </div>
        </div>

        <div className="profile-streak-box">
          <span>🔥</span>

          <strong>
            {Number(user.streak || 0)}
          </strong>

          <p>дней серии</p>
        </div>
      </section>

      <section className="profile-stats-grid">
        <div className="profile-stat-card">
          <span>⭐</span>

          <strong>
            {Number(user.points || 0)}
          </strong>

          <p>Баллов</p>
        </div>

        <div className="profile-stat-card">
          <span>⚡</span>

          <strong>
            {Number(user.xp || 0)}
          </strong>

          <p>Опыта</p>
        </div>

        <div className="profile-stat-card">
          <span>✅</span>

          <strong>
            {Number(
              user.completedTasks || 0,
            )}
          </strong>

          <p>Заданий выполнено</p>
        </div>

        <div className="profile-stat-card">
          <span>🏆</span>

          <strong>
            {unlockedAchievements.length}
          </strong>

          <p>Достижений</p>
        </div>

        <div className="profile-stat-card">
          <span>🔥</span>

          <strong>
            {Number(user.bestStreak || 0)}
          </strong>

          <p>Рекорд серии</p>
        </div>

        <div className="profile-stat-card">
          <span>🧊</span>

          <strong>
            {Number(user.freezes || 0)}
          </strong>

          <p>Заморозок</p>
        </div>
      </section>

      <section className="profile-content-grid">
        <div className="content-card">
          <h2>Оформление профиля</h2>

          <div className="profile-customization-block">
            <h3>Рамка профиля</h3>

            <div className="profile-options">
              {availableFrames.map(
                (frame) => (
                  <button
                    type="button"
                    key={frame.id}
                    className={
                      activeFrame === frame.id
                        ? 'profile-option active'
                        : 'profile-option'
                    }
                    onClick={() =>
                      selectFrame(frame)
                    }
                  >
                    <div
                      className={`profile-option-preview ${frame.className}`}
                    >
                      Н
                    </div>

                    <span>{frame.name}</span>

                    {!frame.owned && (
                      <small>
                        🔒 Не куплено
                      </small>
                    )}

                    {frame.owned &&
                      activeFrame ===
                        frame.id && (
                        <small>
                          ✅ Выбрано
                        </small>
                      )}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="profile-customization-block">
            <h3>Фон профиля</h3>

            <div className="background-options">
              {availableBackgrounds.map(
                (background) => (
                  <button
                    type="button"
                    key={background.id}
                    className={
                      activeBackground ===
                      background.id
                        ? 'background-option active'
                        : 'background-option'
                    }
                    onClick={() =>
                      selectBackground(
                        background,
                      )
                    }
                  >
                    <div
                      className={`background-preview ${background.className}`}
                    />

                    <span>
                      {background.name}
                    </span>

                    {!background.owned && (
                      <small>
                        🔒 Не куплено
                      </small>
                    )}

                    {background.owned &&
                      activeBackground ===
                        background.id && (
                        <small>
                          ✅ Выбрано
                        </small>
                      )}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="content-card">
          <h2>Открытые достижения</h2>

          <div className="profile-achievements-list">
            {unlockedAchievements.length ===
              0 && (
              <p className="empty-text">
                Достижений пока нет.
              </p>
            )}

            {unlockedAchievements
              .slice(0, 6)
              .map((achievement) => (
                <div
                  className="profile-achievement-item"
                  key={achievement.id}
                >
                  <span>
                    {achievement.icon}
                  </span>

                  <div>
                    <strong>
                      {achievement.name}
                    </strong>

                    <p>
                      {
                        achievement.description
                      }
                    </p>
                  </div>
                </div>
              ))}
          </div>

          <div className="profile-achievement-progress">
            <span>
              Открыто{' '}
              {unlockedAchievements.length} из{' '}
              {achievements.length}
            </span>

            <div className="profile-progress-track">
              <div
                className="profile-progress-fill"
                style={{
                  width: `${
                    (unlockedAchievements.length /
                      achievements.length) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="content-card profile-details-card">
        <h2>Данные аккаунта</h2>

        <div className="profile-details-grid">
          <div>
            <div>
  <span>Код для родителя</span>

  <strong>
    {getStudentCode(user)}
  </strong>
</div>
            <span>Имя</span>
            <strong>{user.name}</strong>
          </div>

          <div>
            <span>Электронная почта</span>
            <strong>{user.email}</strong>
          </div>

          <div>
            <span>Роль</span>
            <strong>{user.role}</strong>
          </div>

          <div>
            <span>Школа</span>
            <strong>{user.school}</strong>
          </div>

          <div>
            <span>Класс</span>
            <strong>
              {user.className ||
                'Не указан'}
            </strong>
          </div>

          <div>
            <span>Дополнительные попытки</span>
            <strong>
              {Number(
                user.extraAttempts || 0,
              )}
            </strong>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ProfilePage