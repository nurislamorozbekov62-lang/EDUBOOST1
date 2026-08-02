import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'

const rewards = [
  {
    id: 'freeze',
    icon: '🧊',
    name: 'Заморозка серии',
    description:
      'Сохраняет серию при одном пропущенном обязательном задании.',
    price: 100,
    type: 'freeze',
    limit: 2,
  },
  {
    id: 'blue-frame',
    icon: '🔵',
    name: 'Синяя рамка',
    description:
      'Открывает синюю рамку для профиля ученика.',
    price: 150,
    type: 'frame',
    value: 'blue',
  },
  {
    id: 'gold-frame',
    icon: '✨',
    name: 'Золотая рамка',
    description:
      'Редкая золотая рамка для профиля.',
    price: 500,
    type: 'frame',
    value: 'gold',
  },
  {
    id: 'extra-attempt',
    icon: '🔁',
    name: 'Дополнительная попытка',
    description:
      'Позволяет повторно пройти один учебный тест.',
    price: 120,
    type: 'attempt',
  },
  {
    id: 'profile-background',
    icon: '🌌',
    name: 'Фон профиля',
    description:
      'Открывает специальный фиолетовый фон профиля.',
    price: 300,
    type: 'background',
    value: 'purple',
  },
]

function RewardsStorePage() {
  const { user, updateUser } = useAuth()

  const ownedRewards = useMemo(
    () => user.ownedRewards || [],
    [user.ownedRewards],
  )

  function buyReward(reward) {
    const points = Number(user.points || 0)

    if (points < reward.price) {
      alert('Недостаточно баллов для покупки')
      return
    }

    if (reward.type === 'freeze') {
      const freezes = Number(user.freezes || 0)

      if (freezes >= reward.limit) {
        alert('Можно хранить максимум две заморозки')
        return
      }

      updateUser({
        points: points - reward.price,
        freezes: freezes + 1,
      })

      alert('Заморозка куплена')
      return
    }

    if (
      reward.type !== 'attempt' &&
      ownedRewards.includes(reward.id)
    ) {
      alert('Эта награда уже куплена')
      return
    }

    const confirmed = window.confirm(
      `Купить «${reward.name}» за ${reward.price} баллов?`,
    )

    if (!confirmed) {
      return
    }

    const updatedRewards =
      reward.type === 'attempt'
        ? ownedRewards
        : [...ownedRewards, reward.id]

    const updatedData = {
      points: points - reward.price,
      ownedRewards: updatedRewards,
    }

    if (reward.type === 'attempt') {
      updatedData.extraAttempts =
        Number(user.extraAttempts || 0) + 1
    }

    updateUser(updatedData)
    alert('Награда успешно куплена')
  }

  function isOwned(reward) {
    if (reward.type === 'freeze') {
      return Number(user.freezes || 0) >= reward.limit
    }

    if (reward.type === 'attempt') {
      return false
    }

    return ownedRewards.includes(reward.id)
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Магазин наград</h1>
          <p>
            Используйте заработанные баллы для
            покупки полезных наград
          </p>
        </div>

        <div className="store-balance">
          <span>Ваш баланс</span>
          <strong>⭐ {Number(user.points || 0)}</strong>
        </div>
      </header>

      <section className="store-grid">
        {rewards.map((reward) => {
          const owned = isOwned(reward)

          return (
            <article className="store-card" key={reward.id}>
              <div className="store-icon">
                {reward.icon}
              </div>

              <h2>{reward.name}</h2>

              <p>{reward.description}</p>

              <div className="store-card-footer">
                <strong>
                  ⭐ {reward.price}
                </strong>

                <button
                  className="primary-small-button"
                  disabled={owned}
                  onClick={() => buyReward(reward)}
                >
                  {owned ? 'Уже куплено' : 'Купить'}
                </button>
              </div>
            </article>
          )
        })}
      </section>

      <section
        className="content-card"
        style={{ marginTop: '22px' }}
      >
        <h2>Мои покупки</h2>

        <div className="purchase-summary">
          <div>
            <span>🧊</span>
            <strong>{Number(user.freezes || 0)}</strong>
            <p>Заморозок</p>
          </div>

          <div>
            <span>🔁</span>
            <strong>
              {Number(user.extraAttempts || 0)}
            </strong>
            <p>Дополнительных попыток</p>
          </div>

          <div>
            <span>🎁</span>
            <strong>{ownedRewards.length}</strong>
            <p>Косметических наград</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default RewardsStorePage