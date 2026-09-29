import {
  useMemo,
  useState,
} from 'react'

import {
  Award,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  Copy,
  Flame,
  Frame,
  Globe,
  GraduationCap,
  KeyRound,
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
import { useLanguage } from '../context/LanguageContext'
import { ROLES } from '../config/access'
import { supabase } from '../lib/supabase'

import { getLevelByXp } from '../data/levels'

import {
  achievements,
  getUnlockedAchievements,
} from '../data/achievements'

import {
  getStudentCode,
} from '../services/parentService'


/* ========================================
   STAFF ROLES

   Для этих ролей gamification
   (XP, streak, achievements, рамки)
   не показывается.
======================================== */

const STAFF_ROLES = [
  ROLES.TEACHER,
  ROLES.SCHOOL_ADMIN,
  ROLES.VICE_PRINCIPAL,
  ROLES.DIRECTOR,
  ROLES.SUPER_ADMIN,
]


/* ========================================
   PROFILE PAGE (ROUTER)
======================================== */

function ProfilePage() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  if (
    STAFF_ROLES.includes(
      user.role,
    )
  ) {
    return <StaffProfile />
  }

  return <StudentProfile />
}


/* ========================================
   STUDENT / PARENT / PARTNER PROFILE
======================================== */

function StudentProfile() {
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


/* ========================================
   STUDENT PROFILE — HEADER
======================================== */

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


/* ========================================
   STUDENT PROFILE — HERO
======================================== */

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


/* ========================================
   STUDENT PROFILE — STATS
======================================== */

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


/* ========================================
   STUDENT PROFILE — CUSTOMIZATION
======================================== */

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


/* ========================================
   STUDENT PROFILE — ACHIEVEMENTS
======================================== */

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


/* ========================================
   STUDENT PROFILE — ACCOUNT DETAILS
======================================== */

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


/* ========================================
   STAFF PROFILE
======================================== */

function StaffProfile() {
  const { user } = useAuth()
  const { language, changeLanguage } =
    useLanguage()

  const [copied, setCopied] =
    useState(false)

  const [password, setPassword] =
    useState('')

  const [
    passwordConfirm,
    setPasswordConfirm,
  ] = useState('')

  const [
    passwordMessage,
    setPasswordMessage,
  ] = useState('')

  const [
    passwordError,
    setPasswordError,
  ] = useState('')

  const [
    passwordLoading,
    setPasswordLoading,
  ] = useState(false)

  const [
    langLoading,
    setLangLoading,
  ] = useState(false)


  if (!user) {
    return null
  }


  const details = [
    {
      label: 'Имя',
      value:
        user.name || 'Не указано',
      icon: UserRound,
    },
    {
      label: 'Роль',
      value:
        user.role || 'Не указана',
      icon: ShieldCheck,
    },
    {
      label: 'Должность',
      value:
        user.position || 'Не указана',
      icon: BriefcaseBusiness,
    },
    {
      label: 'Школа',
      value:
        user.school || 'Не указана',
      icon: School,
    },
  ]


  async function copyEduLogin() {
    const value =
      user.eduLogin || ''

    if (!value) {
      return
    }

    try {
      await navigator.clipboard.writeText(
        value,
      )

      setCopied(true)

      window.setTimeout(
        () => setCopied(false),
        2000,
      )
    } catch {
      window.alert(
        `EDU login: ${value}`,
      )
    }
  }


  async function handleLanguage(
    nextLanguage,
  ) {
    if (
      nextLanguage === language ||
      langLoading
    ) {
      return
    }

    try {
      setLangLoading(true)

      await changeLanguage(
        nextLanguage,
      )
    } catch (error) {
      window.alert(
        error?.message ||
          'Не удалось изменить язык',
      )
    } finally {
      setLangLoading(false)
    }
  }


  async function handlePasswordSubmit(
    event,
  ) {
    event.preventDefault()

    setPasswordError('')
    setPasswordMessage('')


    if (password.length < 8) {
      setPasswordError(
        'Пароль должен быть не короче 8 символов',
      )

      return
    }


    if (password !== passwordConfirm) {
      setPasswordError(
        'Пароли не совпадают',
      )

      return
    }


    try {
      setPasswordLoading(true)


      const {
        error,
      } =
        await supabase.auth
          .updateUser({
            password,
          })


      if (error) {
        throw error
      }


      setPasswordMessage(
        'Пароль успешно обновлён',
      )

      setPassword('')
      setPasswordConfirm('')
    } catch (error) {
      setPasswordError(
        error?.message ||
          'Не удалось обновить пароль',
      )
    } finally {
      setPasswordLoading(false)
    }
  }


  return (
    <div className="modern-profile-page">

      {/* =====================================
          HEADER
      ===================================== */}

      <header className="modern-profile-header">
        <div className="modern-profile-header-icon">
          <UserRound size={28} />
        </div>

        <div>
          <p>Рабочий кабинет</p>

          <h1>Мой профиль</h1>

          <span>
            Данные сотрудника школы,
            доступ и безопасность аккаунта.
          </span>
        </div>
      </header>


      {/* =====================================
          HERO
      ===================================== */}

      <section className="modern-profile-hero profile-background-default">
        <div className="modern-profile-hero-content">
          <div className="modern-profile-avatar profile-frame-default">
            {String(user.name || 'С')
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="modern-profile-main-info">
            <span className="modern-profile-role">
              {user.role}
            </span>

            <h2>
              {user.name || 'Сотрудник'}
            </h2>

            <div className="modern-profile-school">
              <School size={16} />

              <span>
                {user.school ||
                  'Школа не указана'}
              </span>
            </div>

            {user.position && (
              <div className="modern-profile-level">
                <ShieldCheck size={17} />
                {user.position}
              </div>
            )}
          </div>
        </div>
      </section>


      {/* =====================================
          ACCOUNT DETAILS
      ===================================== */}

      <section className="modern-profile-section">
        <div className="modern-profile-section-heading">
          <div>
            <p>Учётная запись</p>
            <h2>Данные сотрудника</h2>
          </div>

          <UserRound size={22} />
        </div>

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


      {/* =====================================
          EDU LOGIN + RECOVERY
      ===================================== */}

      <section className="modern-profile-section">
        <div className="modern-profile-section-heading">
          <div>
            <p>Доступ</p>
            <h2>EDU login</h2>
          </div>

          <KeyRound size={22} />
        </div>

        <div className="modern-parent-code-card">
          <div className="modern-parent-code-icon">
            <KeyRound size={24} />
          </div>

          <div>
            <span>
              Логин для входа в систему
            </span>

            <strong>
              {user.eduLogin || '—'}
            </strong>
          </div>

          <button
            type="button"
            onClick={copyEduLogin}
            disabled={!user.eduLogin}
          >
            {copied ? (
              <Check size={18} />
            ) : (
              <Copy size={18} />
            )}

            {copied
              ? 'Скопировано'
              : 'Скопировать'}
          </button>
        </div>

        {user.recoveryEmail ? (
          <div
            className="modern-profile-detail"
            style={{ marginTop: 12 }}
          >
            <div>
              <Mail size={19} />
            </div>

            <span>
              <small>
                Резервная почта
              </small>

              <strong>
                {user.recoveryEmail}
              </strong>
            </span>
          </div>
        ) : null}
      </section>


      {/* =====================================
          LANGUAGE
      ===================================== */}

      <section className="modern-profile-section">
        <div className="modern-profile-section-heading">
          <div>
            <p>Интерфейс</p>
            <h2>Язык системы</h2>
          </div>

          <Globe size={22} />
        </div>

        <div className="modern-profile-options">
          <button
            type="button"
            className={
              language === 'ru'
                ? 'modern-profile-option modern-profile-option--active'
                : 'modern-profile-option'
            }
            onClick={() =>
              handleLanguage('ru')
            }
            disabled={langLoading}
          >
            <div className="modern-profile-option-info">
              <strong>Русский</strong>
              <span>
                Основной язык интерфейса
              </span>
            </div>

            <span
              className={
                language === 'ru'
                  ? 'modern-profile-option-state modern-profile-option-state--active'
                  : 'modern-profile-option-state'
              }
            >
              <Check size={16} />
            </span>
          </button>

          <button
            type="button"
            className={
              language === 'ky'
                ? 'modern-profile-option modern-profile-option--active'
                : 'modern-profile-option'
            }
            onClick={() =>
              handleLanguage('ky')
            }
            disabled={langLoading}
          >
            <div className="modern-profile-option-info">
              <strong>Кыргызча</strong>
              <span>
                Кыргыз тилиндеги интерфейс
              </span>
            </div>

            <span
              className={
                language === 'ky'
                  ? 'modern-profile-option-state modern-profile-option-state--active'
                  : 'modern-profile-option-state'
              }
            >
              <Check size={16} />
            </span>
          </button>
        </div>
      </section>


      {/* =====================================
          SECURITY
      ===================================== */}

      <section className="modern-profile-section">
        <div className="modern-profile-section-heading">
          <div>
            <p>Безопасность</p>
            <h2>Смена пароля</h2>
          </div>

          <LockKeyhole size={22} />
        </div>

        <form
          onSubmit={handlePasswordSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#53657b',
              }}
            >
              Новый пароль
            </span>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              placeholder="Минимум 8 символов"
              autoComplete="new-password"
            />
          </label>

          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#53657b',
              }}
            >
              Подтвердите пароль
            </span>

            <input
              type="password"
              value={passwordConfirm}
              onChange={(event) =>
                setPasswordConfirm(
                  event.target.value,
                )
              }
              placeholder="Повторите пароль"
              autoComplete="new-password"
            />
          </label>

          {passwordError && (
            <div
              style={{
                color: '#b42318',
                background: '#fff1f1',
                border: '1px solid #ffd2d2',
                padding: '10px 12px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {passwordError}
            </div>
          )}

          {passwordMessage && (
            <div
              style={{
                color: '#087443',
                background: '#eafff4',
                border: '1px solid #c5f2dc',
                padding: '10px 12px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {passwordMessage}
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={
              passwordLoading ||
              !password ||
              !passwordConfirm
            }
          >
            {passwordLoading
              ? 'Сохраняем...'
              : 'Обновить пароль'}
          </button>
        </form>
      </section>

    </div>
  )
}


export default ProfilePage