import { useMemo } from 'react'
import {
  Award,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  Copy,
  Flame,
  Frame,
  GraduationCap,
  LockKeyhole,
  Mail,
  Medal,
  Palette,
  School,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  Zap,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { getLevelByXp } from '../data/levels'

import {
  achievements,
  getUnlockedAchievements,
} from '../data/achievements'

import {
  getStudentCode,
} from '../services/parentService'

function ProfilePage() {
  const { user, updateUser } = useAuth()

  const ownedRewards = useMemo(
    () => user?.ownedRewards || [],
    [user?.ownedRewards],
  )

  if (!user) {
    return null
  }

  const level = getLevelByXp(
    Number(user.xp || 0),
  )

  const unlockedAchievements =
    getUnlockedAchievements(user)

  const availableFrames = [
    {
      id: 'default',
      name: 'Обычная рамка',
      description: 'Классический стиль',
      className: 'profile-frame-default',
      owned: true,
    },
    {
      id: 'blue-frame',
      name: 'Синяя рамка',
      description: 'Яркий синий контур',
      className: 'profile-frame-blue',
      owned: ownedRewards.includes(
        'blue-frame',
      ),
    },
    {
      id: 'gold-frame',
      name: 'Золотая рамка',
      description: 'Рамка для лучших',
      className: 'profile-frame-gold',
      owned: ownedRewards.includes(
        'gold-frame',
      ),
    },
  ]

  const availableBackgrounds = [
    {
      id: 'default',
      name: 'Синий фон',
      description: 'Стандартное оформление',
      className:
        'profile-background-default',
      owned: true,
    },
    {
      id: 'profile-background',
      name: 'Фиолетовый фон',
      description: 'Премиальный градиент',
      className:
        'profile-background-purple',
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
      (frame) =>
        frame.id === activeFrame,
    ) || availableFrames[0]

  const currentBackground =
    availableBackgrounds.find(
      (background) =>
        background.id === activeBackground,
    ) || availableBackgrounds[0]

  const achievementProgress =
    achievements.length > 0
      ? Math.round(
          (unlockedAchievements.length /
            achievements.length) *
            100,
        )
      : 0

  function selectFrame(frame) {
    if (!frame.owned) {
      window.alert(
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
      window.alert(
        'Сначала купите этот фон в магазине наград',
      )
      return
    }

    updateUser({
      activeBackground: background.id,
    })
  }

  async function copyStudentCode() {
    const code = getStudentCode(user)

    try {
      await navigator.clipboard.writeText(
        code,
      )

      window.alert(
        'Код для родителя скопирован',
      )
    } catch {
      window.alert(
        `Код для родителя: ${code}`,
      )
    }
  }

  return (
    <div className="modern-profile-page">
      <ProfileHeader />

      <ProfileHero
        user={user}
        level={level}
        currentFrame={currentFrame}
        currentBackground={
          currentBackground
        }
      />

      <ProfileStats
        user={user}
        achievementsCount={
          unlockedAchievements.length
        }
      />

      <section className="modern-profile-content-grid">
        <ProfileCustomization
          user={user}
          availableFrames={availableFrames}
          availableBackgrounds={
            availableBackgrounds
          }
          activeFrame={activeFrame}
          activeBackground={
            activeBackground
          }
          selectFrame={selectFrame}
          selectBackground={
            selectBackground
          }
        />

        <ProfileAchievements
          unlockedAchievements={
            unlockedAchievements
          }
          achievementProgress={
            achievementProgress
          }
        />
      </section>

      <ProfileAccountDetails
        user={user}
        copyStudentCode={copyStudentCode}
      />
    </div>
  )
}

function ProfileHeader() {
  return (
    <header className="modern-profile-header">
      <div className="modern-profile-header-icon">
        <UserRound size={28} />
      </div>

      <div>
        <p>Личный кабинет</p>

        <h1>Мой профиль</h1>

        <span>
          Статистика, достижения и
          персональное оформление аккаунта.
        </span>
      </div>
    </header>
  )
}

function ProfileHero({
  user,
  level,
  currentFrame,
  currentBackground,
}) {
  return (
    <section
      className={`modern-profile-hero ${currentBackground.className}`}
    >
      <div className="modern-profile-hero-content">
        <div
          className={`modern-profile-avatar ${currentFrame.className}`}
        >
          {String(user.name || 'У')
            .charAt(0)
            .toUpperCase()}
        </div>

        <div className="modern-profile-main-info">
          <span className="modern-profile-role">
            {user.role}
          </span>

          <h2>{user.name}</h2>

          <div className="modern-profile-school">
            <School size={16} />

            <span>
              {user.school ||
                'Школа не указана'}
              {user.className
                ? ` · ${user.className}`
                : ''}
            </span>
          </div>

          <div className="modern-profile-level">
            <Medal size={17} />
            {level.name}
          </div>
        </div>
      </div>

      <div className="modern-profile-streak">
        <Flame size={30} />

        <strong>
          {Number(user.streak || 0)}
        </strong>

        <span>дней подряд</span>
      </div>
    </section>
  )
}

function ProfileStats({
  user,
  achievementsCount,
}) {
  const stats = [
    {
      label: 'Баллов',
      value: Number(user.points || 0),
      icon: Coins,
      className:
        'modern-profile-stat--gold',
    },
    {
      label: 'Опыта',
      value: Number(user.xp || 0),
      icon: Zap,
      className:
        'modern-profile-stat--blue',
    },
    {
      label: 'Заданий',
      value: Number(
        user.completedTasks || 0,
      ),
      icon: ClipboardCheck,
      className:
        'modern-profile-stat--green',
    },
    {
      label: 'Достижений',
      value: achievementsCount,
      icon: Trophy,
      className:
        'modern-profile-stat--purple',
    },
    {
      label: 'Рекорд серии',
      value: Number(
        user.bestStreak || 0,
      ),
      icon: Flame,
      className:
        'modern-profile-stat--orange',
    },
    {
      label: 'Заморозок',
      value: Number(user.freezes || 0),
      icon: Snowflake,
      className:
        'modern-profile-stat--cyan',
    },
  ]

  return (
    <section className="modern-profile-stats">
      {stats.map((stat) => {
        const Icon = stat.icon

        return (
          <article
            className={`modern-profile-stat-card ${stat.className}`}
            key={stat.label}
          >
            <div className="modern-profile-stat-icon">
              <Icon size={21} />
            </div>

            <div>
              <strong>
                {stat.value.toLocaleString(
                  'ru-RU',
                )}
              </strong>

              <span>{stat.label}</span>
            </div>
          </article>
        )
      })}
    </section>
  )
}

function ProfileCustomization({
  user,
  availableFrames,
  availableBackgrounds,
  activeFrame,
  activeBackground,
  selectFrame,
  selectBackground,
}) {
  return (
    <section className="modern-profile-section">
      <div className="modern-profile-section-heading">
        <div>
          <p>Персонализация</p>
          <h2>Оформление профиля</h2>
        </div>

        <Palette size={22} />
      </div>

      <div className="modern-profile-custom-block">
        <div className="modern-profile-custom-title">
          <Frame size={18} />

          <div>
            <h3>Рамка профиля</h3>
            <p>
              Выберите оформление аватара.
            </p>
          </div>
        </div>

        <div className="modern-profile-options">
          {availableFrames.map(
            (frame) => (
              <button
                type="button"
                key={frame.id}
                className={
                  activeFrame === frame.id
                    ? 'modern-profile-option modern-profile-option--active'
                    : 'modern-profile-option'
                }
                onClick={() =>
                  selectFrame(frame)
                }
              >
                <div
                  className={`modern-profile-option-avatar ${frame.className}`}
                >
                  {String(user.name || 'У')
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="modern-profile-option-info">
                  <strong>
                    {frame.name}
                  </strong>

                  <span>
                    {frame.description}
                  </span>
                </div>

                <ProfileOptionState
                  owned={frame.owned}
                  active={
                    activeFrame === frame.id
                  }
                />
              </button>
            ),
          )}
        </div>
      </div>

      <div className="modern-profile-custom-block">
        <div className="modern-profile-custom-title">
          <Sparkles size={18} />

          <div>
            <h3>Фон профиля</h3>
            <p>
              Измените фон верхней карточки.
            </p>
          </div>
        </div>

        <div className="modern-background-options">
          {availableBackgrounds.map(
            (background) => (
              <button
                type="button"
                key={background.id}
                className={
                  activeBackground ===
                  background.id
                    ? 'modern-background-option modern-background-option--active'
                    : 'modern-background-option'
                }
                onClick={() =>
                  selectBackground(
                    background,
                  )
                }
              >
                <div
                  className={`modern-background-preview ${background.className}`}
                >
                  <ShieldCheck size={24} />
                </div>

                <div>
                  <strong>
                    {background.name}
                  </strong>

                  <span>
                    {background.description}
                  </span>
                </div>

                <ProfileOptionState
                  owned={background.owned}
                  active={
                    activeBackground ===
                    background.id
                  }
                />
              </button>
            ),
          )}
        </div>
      </div>
    </section>
  )
}

function ProfileOptionState({
  owned,
  active,
}) {
  if (!owned) {
    return (
      <span className="modern-profile-option-state modern-profile-option-state--locked">
        <LockKeyhole size={15} />
      </span>
    )
  }

  if (active) {
    return (
      <span className="modern-profile-option-state modern-profile-option-state--active">
        <Check size={16} />
      </span>
    )
  }

  return (
    <span className="modern-profile-option-state">
      <CheckCircle2 size={16} />
    </span>
  )
}

function ProfileAchievements({
  unlockedAchievements,
  achievementProgress,
}) {
  return (
    <section className="modern-profile-section">
      <div className="modern-profile-section-heading">
        <div>
          <p>Коллекция наград</p>
          <h2>Достижения</h2>
        </div>

        <Award size={22} />
      </div>

      {unlockedAchievements.length ===
      0 ? (
        <div className="modern-profile-empty">
          <div>
            <Trophy size={29} />
          </div>

          <h3>Достижений пока нет</h3>

          <p>
            Выполняйте задания и открывайте
            новые награды.
          </p>
        </div>
      ) : (
        <div className="modern-profile-achievements">
          {unlockedAchievements
            .slice(0, 6)
            .map(
              (
                achievement,
                index,
              ) => {
                const Icon =
                  getAchievementIcon(
                    achievement,
                    index,
                  )

                return (
                  <article
                    className="modern-profile-achievement"
                    key={
                      achievement.id
                    }
                  >
                    <div className="modern-profile-achievement-icon">
                      <Icon size={21} />
                    </div>

                    <div>
                      <strong>
                        {
                          achievement.name
                        }
                      </strong>

                      <p>
                        {
                          achievement.description
                        }
                      </p>
                    </div>

                    <CheckCircle2
                      size={18}
                      className="modern-profile-achievement-check"
                    />
                  </article>
                )
              },
            )}
        </div>
      )}

      <div className="modern-profile-achievement-progress">
        <div>
          <span>
            Открыто{' '}
            {
              unlockedAchievements.length
            }{' '}
            из {achievements.length}
          </span>

          <strong>
            {achievementProgress}%
          </strong>
        </div>

        <div className="modern-profile-progress-track">
          <span
            style={{
              width: `${achievementProgress}%`,
            }}
          />
        </div>
      </div>
    </section>
  )
}

function ProfileAccountDetails({
  user,
  copyStudentCode,
}) {
  const details = [
    {
      label: 'Имя',
      value: user.name || 'Не указано',
      icon: UserRound,
    },
    {
      label: 'Электронная почта',
      value: user.email || 'Не указана',
      icon: Mail,
    },
    {
      label: 'Роль',
      value: user.role || 'Не указана',
      icon: ShieldCheck,
    },
    {
      label: 'Школа',
      value:
        user.school || 'Не указана',
      icon: School,
    },
    {
      label: 'Класс',
      value:
        user.className || 'Не указан',
      icon: GraduationCap,
    },
    {
      label: 'Дополнительные попытки',
      value: Number(
        user.extraAttempts || 0,
      ),
      icon: Star,
    },
  ]

  return (
    <section className="modern-profile-section">
      <div className="modern-profile-section-heading">
        <div>
          <p>Учётная запись</p>
          <h2>Данные аккаунта</h2>
        </div>

        <UserRound size={22} />
      </div>

      {user.role === 'Ученик' && (
        <div className="modern-parent-code-card">
          <div className="modern-parent-code-icon">
            <ShieldCheck size={24} />
          </div>

          <div>
            <span>Код для родителя</span>

            <strong>
              {getStudentCode(user)}
            </strong>
          </div>

          <button
            type="button"
            onClick={copyStudentCode}
          >
            <Copy size={18} />
            Скопировать
          </button>
        </div>
      )}

      <div className="modern-profile-details-grid">
        {details.map((detail) => {
          const Icon = detail.icon

          return (
            <article
              className="modern-profile-detail"
              key={detail.label}
            >
              <div>
                <Icon size={19} />
              </div>

              <span>
                <small>
                  {detail.label}
                </small>

                <strong>
                  {detail.value}
                </strong>
              </span>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function getAchievementIcon(
  achievement,
  index,
) {
  const text = `${achievement.name || ''} ${
    achievement.description || ''
  }`.toLowerCase()

  if (
    text.includes('серия') ||
    text.includes('день')
  ) {
    return Flame
  }

  if (
    text.includes('задани') ||
    text.includes('работ')
  ) {
    return ClipboardCheck
  }

  if (
    text.includes('опыт') ||
    text.includes('уров')
  ) {
    return Zap
  }

  if (
    text.includes('побед') ||
    text.includes('лучш')
  ) {
    return Trophy
  }

  const icons = [
    Award,
    Medal,
    Trophy,
    Star,
  ]

  return icons[index % icons.length]
}

export default ProfilePage