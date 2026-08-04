import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  Coins,
  Frame,
  Gift,
  Palette,
  RefreshCcw,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'

const rewards = [
  {
    id: 'freeze',
    name: 'Заморозка серии',
    description:
      'Сохраняет серию при одном пропущенном обязательном задании.',
    price: 100,
    type: 'freeze',
    limit: 2,
    icon: Shield,
    category: 'Полезное',
  },
  {
    id: 'blue-frame',
    name: 'Синяя рамка',
    description:
      'Открывает синюю рамку для профиля ученика.',
    price: 150,
    type: 'frame',
    value: 'blue',
    icon: Frame,
    category: 'Профиль',
  },
  {
    id: 'gold-frame',
    name: 'Золотая рамка',
    description:
      'Редкая золотая рамка для оформления профиля.',
    price: 500,
    type: 'frame',
    value: 'gold',
    icon: Star,
    category: 'Профиль',
  },
  {
    id: 'extra-attempt',
    name: 'Дополнительная попытка',
    description:
      'Позволяет повторно пройти один учебный тест.',
    price: 120,
    type: 'attempt',
    icon: RefreshCcw,
    category: 'Учёба',
  },
  {
    id: 'profile-background',
    name: 'Фон профиля',
    description:
      'Открывает специальный фиолетовый фон профиля.',
    price: 300,
    type: 'background',
    value: 'purple',
    icon: Palette,
    category: 'Профиль',
  },
]

const categories = [
  'Все',
  'Полезное',
  'Учёба',
  'Профиль',
]

function RewardsStorePage() {
  const { user, updateUser } = useAuth()

  const [category, setCategory] = useState('Все')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [buyingId, setBuyingId] = useState(null)

  const ownedRewards = useMemo(
    () => user?.ownedRewards || [],
    [user?.ownedRewards],
  )

  const filteredRewards = useMemo(() => {
    if (category === 'Все') {
      return rewards
    }

    return rewards.filter(
      (reward) =>
        reward.category === category,
    )
  }, [category])

  const userPoints = Number(
    user?.points || 0,
  )

  function buyReward(reward) {
    setMessage('')
    setError('')

    if (userPoints < reward.price) {
      setError(
        `Для покупки не хватает ${
          reward.price - userPoints
        } баллов.`,
      )
      return
    }

    if (reward.type === 'freeze') {
      const freezes = Number(
        user.freezes || 0,
      )

      if (freezes >= reward.limit) {
        setError(
          'Можно хранить максимум две заморозки.',
        )
        return
      }
    }

    if (
      reward.type !== 'attempt' &&
      reward.type !== 'freeze' &&
      ownedRewards.includes(reward.id)
    ) {
      setError(
        'Эта награда уже находится в вашей коллекции.',
      )
      return
    }

    const confirmed = window.confirm(
      `Купить «${reward.name}» за ${reward.price} баллов?`,
    )

    if (!confirmed) {
      return
    }

    try {
      setBuyingId(reward.id)

      if (reward.type === 'freeze') {
        updateUser({
          points:
            userPoints - reward.price,
          freezes:
            Number(user.freezes || 0) + 1,
        })
      } else {
        const updatedRewards =
          reward.type === 'attempt'
            ? ownedRewards
            : [
                ...ownedRewards,
                reward.id,
              ]

        const updatedData = {
          points:
            userPoints - reward.price,
          ownedRewards: updatedRewards,
        }

        if (reward.type === 'attempt') {
          updatedData.extraAttempts =
            Number(
              user.extraAttempts || 0,
            ) + 1
        }

        updateUser(updatedData)
      }

      setMessage(
        `Награда «${reward.name}» успешно куплена.`,
      )
    } catch {
      setError(
        'Не удалось завершить покупку.',
      )
    } finally {
      setBuyingId(null)
    }
  }

  function isOwned(reward) {
    if (reward.type === 'freeze') {
      return (
        Number(user?.freezes || 0) >=
        reward.limit
      )
    }

    if (reward.type === 'attempt') {
      return false
    }

    return ownedRewards.includes(
      reward.id,
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="rewards-store-page">
      <StoreHeader />

      <StoreHero
        points={userPoints}
        ownedCount={ownedRewards.length}
        freezes={Number(
          user.freezes || 0,
        )}
      />

      {message && (
        <div className="rewards-store-alert rewards-store-alert--success">
          <CheckCircle2 size={19} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="rewards-store-alert rewards-store-alert--error">
          <span>!</span>
          <p>{error}</p>
        </div>
      )}

      <StoreFilters
        category={category}
        setCategory={setCategory}
      />

      <section className="rewards-store-section">
        <div className="rewards-store-section-heading">
          <div>
            <p>Каталог</p>
            <h2>Доступные награды</h2>
          </div>

          <span>
            {filteredRewards.length}
          </span>
        </div>

        <div className="rewards-store-grid">
          {filteredRewards.map(
            (reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                owned={isOwned(reward)}
                userPoints={userPoints}
                buyingId={buyingId}
                onBuy={buyReward}
              />
            ),
          )}
        </div>
      </section>

      <PurchaseSummary user={user} />
    </div>
  )
}

function StoreHeader() {
  return (
    <header className="rewards-store-header">
      <div className="rewards-store-header-icon">
        <ShoppingBag size={28} />
      </div>

      <div>
        <p>Баллы и награды</p>

        <h1>Магазин наград</h1>

        <span>
          Используйте учебные баллы для
          покупки полезных возможностей и
          оформления профиля.
        </span>
      </div>
    </header>
  )
}

function StoreHero({
  points,
  ownedCount,
  freezes,
}) {
  return (
    <section className="rewards-store-hero">
      <div className="rewards-store-hero-content">
        <div className="rewards-store-hero-label">
          <Sparkles size={16} />
          Ваш баланс
        </div>

        <h2>
          {points.toLocaleString(
            'ru-RU',
          )}{' '}
          баллов
        </h2>

        <p>
          Выполняйте задания и проходите
          тесты, чтобы получать новые
          награды.
        </p>

        <div className="rewards-store-hero-meta">
          <span>
            <Gift size={17} />
            {ownedCount} наград куплено
          </span>

          <span>
            <Shield size={17} />
            {freezes} заморозок
          </span>

          <span>
            <Zap size={17} />
            Баллы начисляются за учёбу
          </span>
        </div>
      </div>

      <div className="rewards-store-balance-card">
        <Coins size={39} />

        <strong>
          {points.toLocaleString(
            'ru-RU',
          )}
        </strong>

        <span>доступно баллов</span>
      </div>
    </section>
  )
}

function StoreFilters({
  category,
  setCategory,
}) {
  return (
    <section className="rewards-store-filters">
      {categories.map((item) => (
        <button
          type="button"
          key={item}
          className={
            category === item
              ? 'reward-store-filter reward-store-filter--active'
              : 'reward-store-filter'
          }
          onClick={() =>
            setCategory(item)
          }
        >
          {item}
        </button>
      ))}
    </section>
  )
}

function RewardCard({
  reward,
  owned,
  userPoints,
  buyingId,
  onBuy,
}) {
  const Icon = reward.icon

  const enoughPoints =
    userPoints >= reward.price

  const isBuying =
    buyingId === reward.id

  const missingPoints = Math.max(
    reward.price - userPoints,
    0,
  )

  return (
    <article className="reward-store-card">
      <div className="reward-store-card-cover">
        <div className="reward-store-card-icon">
          <Icon size={34} />
        </div>

        <span>
          {reward.category}
        </span>
      </div>

      <div className="reward-store-card-body">
        <h3>{reward.name}</h3>

        <p>{reward.description}</p>

        <div className="reward-store-card-info">
          <div>
            <Coins size={18} />

            <span>
              <strong>
                {reward.price}
              </strong>

              <small>баллов</small>
            </span>
          </div>

          {reward.type ===
            'freeze' && (
            <div>
              <Shield size={18} />

              <span>
                <strong>
                  {Number(
                    userPoints >= 0
                      ? reward.limit
                      : 0,
                  )}
                </strong>

                <small>максимум</small>
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={
            owned ||
            !enoughPoints ||
            isBuying
          }
          onClick={() =>
            onBuy(reward)
          }
        >
          {isBuying
            ? 'Покупаем...'
            : owned
              ? 'Уже куплено'
              : enoughPoints
                ? 'Купить награду'
                : `Не хватает ${missingPoints}`}
        </button>
      </div>
    </article>
  )
}

function PurchaseSummary({ user }) {
  const purchases = [
    {
      label: 'Заморозок',
      value: Number(
        user.freezes || 0,
      ),
      icon: Shield,
      className:
        'purchase-summary--blue',
    },
    {
      label: 'Дополнительных попыток',
      value: Number(
        user.extraAttempts || 0,
      ),
      icon: RefreshCcw,
      className:
        'purchase-summary--green',
    },
    {
      label: 'Косметических наград',
      value: (
        user.ownedRewards || []
      ).length,
      icon: Palette,
      className:
        'purchase-summary--purple',
    },
  ]

  return (
    <section className="rewards-purchases-section">
      <div className="rewards-store-section-heading">
        <div>
          <p>Коллекция</p>
          <h2>Мои покупки</h2>
        </div>
      </div>

      <div className="rewards-purchases-grid">
        {purchases.map((item) => {
          const Icon = item.icon

          return (
            <article
              key={item.label}
              className={`rewards-purchase-card ${item.className}`}
            >
              <div>
                <Icon size={23} />
              </div>

              <span>
                <strong>
                  {item.value}
                </strong>

                <small>
                  {item.label}
                </small>
              </span>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default RewardsStorePage