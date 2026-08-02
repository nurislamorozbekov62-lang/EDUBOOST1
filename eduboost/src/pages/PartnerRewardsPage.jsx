import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getActivePartnerOffers,
  redeemPartnerOffer,
} from '../services/partnerService'

function PartnerRewardsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [offers, setOffers] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Все')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadOffers = () => {
    setOffers(getActivePartnerOffers())
  }

  useEffect(() => {
    loadOffers()
  }, [])

  const categories = useMemo(() => {
    return [
      'Все',
      ...Array.from(
        new Set(
          offers.map(
            (offer) => offer.partnerCategory
          )
        )
      ),
    ]
  }, [offers])

  const filteredOffers = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase()

    return offers.filter((offer) => {
      const matchesSearch =
        !normalizedSearch ||
        offer.title
          .toLowerCase()
          .includes(normalizedSearch) ||
        offer.partnerName
          .toLowerCase()
          .includes(normalizedSearch) ||
        offer.description
          .toLowerCase()
          .includes(normalizedSearch)

      const matchesCategory =
        category === 'Все' ||
        offer.partnerCategory === category

      return matchesSearch && matchesCategory
    })
  }, [offers, search, category])

  const handleRedeem = (offer) => {
    setError('')
    setMessage('')

    const confirmed = window.confirm(
      `Обменять ${offer.pointsCost} баллов на «${offer.title}»? QR-код будет действовать 15 минут.`
    )

    if (!confirmed) {
      return
    }

    try {
      const coupon = redeemPartnerOffer(offer.id)

      setMessage(
        'Награда получена. Открываем временный QR-код.'
      )

      setTimeout(() => {
        navigate(`/coupons/${coupon.id}`)
      }, 500)
    } catch (redeemError) {
      setError(
        redeemError.message ||
          'Не удалось получить награду'
      )
    }
  }

  if (user.role !== 'Ученик') {
    return (
      <div className="page-container">
        <div className="content-card">
          <h1>Партнёрские награды</h1>
          <p>
            Этот раздел доступен ученикам.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Партнёрские награды</h1>
          <p>
            Обменивайте учебные баллы на скидки и
            подарки.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <strong>
            Ваш баланс: {Number(user.points) || 0}{' '}
            баллов
          </strong>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/my-coupons')}
          >
            Мои купоны
          </button>
        </div>
      </div>

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div
        className="content-card"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(200px, 1fr) minmax(180px, 260px)',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Найти награду или партнёра..."
        />

        <select
          value={category}
          onChange={(event) =>
            setCategory(event.target.value)
          }
        >
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      {filteredOffers.length === 0 ? (
        <div className="content-card empty-state">
          <h2>Предложения не найдены</h2>
          <p>
            Попробуйте изменить поиск или категорию.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '18px',
          }}
        >
          {filteredOffers.map((offer) => {
            const remaining =
              Number(offer.quantity || 0) -
              Number(offer.redeemedCount || 0)

            const enoughPoints =
              (Number(user.points) || 0) >=
              offer.pointsCost

            return (
              <article
                key={offer.id}
                className="content-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '52px',
                    }}
                  >
                    {offer.imageEmoji || '🎁'}
                  </span>

                  <span
                    style={{
                      padding: '6px 10px',
                      borderRadius: '999px',
                      background: '#eef2ff',
                      color: '#3730a3',
                      fontSize: '13px',
                      height: 'fit-content',
                    }}
                  >
                    {offer.partnerCategory}
                  </span>
                </div>

                <div>
                  <p
                    style={{
                      margin: '0 0 5px',
                      color: '#6b7280',
                    }}
                  >
                    {offer.partnerName}
                  </p>

                  <h2
                    style={{
                      margin: '0 0 8px',
                    }}
                  >
                    {offer.title}
                  </h2>

                  <p
                    style={{
                      color: '#6b7280',
                    }}
                  >
                    {offer.description}
                  </p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: '6px',
                    fontSize: '14px',
                  }}
                >
                  {offer.rewardType === 'discount' ? (
                    <span>
                      🏷 Скидка:{' '}
                      <strong>
                        {offer.discountPercent}%
                      </strong>
                    </span>
                  ) : (
                    <span>
                      🎁 Подарок:{' '}
                      <strong>
                        {offer.giftName}
                      </strong>
                    </span>
                  )}

                  {offer.minimumPurchase > 0 && (
                    <span>
                      🛒 Минимальная покупка:{' '}
                      {offer.minimumPurchase} сом
                    </span>
                  )}

                  <span>
                    📍 {offer.city}
                    {offer.address
                      ? `, ${offer.address}`
                      : ''}
                  </span>

                  <span>
                    🎟 Осталось купонов: {remaining}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '12px',
                    borderTop: '1px solid #e5e7eb',
                  }}
                >
                  <button
                    type="button"
                    className="primary-button"
                    style={{
                      width: '100%',
                    }}
                    disabled={!enoughPoints}
                    onClick={() =>
                      handleRedeem(offer)
                    }
                  >
                    {enoughPoints
                      ? `Получить за ${offer.pointsCost} баллов`
                      : `Не хватает ${
                          offer.pointsCost -
                          (Number(user.points) || 0)
                        } баллов`}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PartnerRewardsPage