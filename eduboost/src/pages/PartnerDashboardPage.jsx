import { useEffect, useState } from 'react'
import {
  createPartnerOffer,
  deletePartnerOffer,
  getPartnerOffers,
  getPartnerStatistics,
  togglePartnerOffer,
  useCouponToken,
  validateCouponToken,
} from '../services/partnerService'

const initialOfferForm = {
  partnerName: '',
  partnerCategory: 'Кафе',
  title: '',
  description: '',
  rewardType: 'discount',
  discountPercent: 10,
  giftName: '',
  pointsCost: 100,
  imageEmoji: '🎁',
  city: '',
  address: '',
  quantity: 100,
  minimumPurchase: 0,
}

function PartnerDashboardPage() {
  const [offers, setOffers] = useState([])
  const [statistics, setStatistics] =
    useState(null)
  const [offerForm, setOfferForm] =
    useState(initialOfferForm)
  const [couponToken, setCouponToken] =
    useState('')
  const [checkedCoupon, setCheckedCoupon] =
    useState(null)
  const [validationResult, setValidationResult] =
    useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadData = () => {
    setOffers(getPartnerOffers())
    setStatistics(getPartnerStatistics())
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOfferChange = (event) => {
    const { name, value } = event.target

    setOfferForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleCreateOffer = (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    try {
      createPartnerOffer(offerForm)
      setOfferForm(initialOfferForm)
      loadData()
      setMessage('Предложение создано')
    } catch (creationError) {
      setError(
        creationError.message ||
          'Не удалось создать предложение'
      )
    }
  }

  const handleValidateCoupon = (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    const result =
      validateCouponToken(couponToken)

    setValidationResult(result)
    setCheckedCoupon(result.coupon)

    if (!result.valid) {
      setError(result.reason)
    } else {
      setMessage(
        'Купон действителен. Проверьте данные перед подтверждением.'
      )
    }
  }

  const handleUseCoupon = () => {
    setError('')
    setMessage('')

    try {
      const usedCoupon =
        useCouponToken(couponToken)

      setCheckedCoupon(usedCoupon)
      setValidationResult({
        valid: false,
        reason: 'Купон использован',
        coupon: usedCoupon,
      })

      setCouponToken('')
      loadData()
      setMessage(
        'Купон успешно подтверждён и больше не действует'
      )
    } catch (useError) {
      setError(
        useError.message ||
          'Не удалось использовать купон'
      )
    }
  }

  const handleDeleteOffer = (offerId) => {
    const confirmed = window.confirm(
      'Удалить предложение?'
    )

    if (!confirmed) {
      return
    }

    setError('')
    setMessage('')

    try {
      deletePartnerOffer(offerId)
      loadData()
      setMessage('Предложение удалено')
    } catch (deleteError) {
      setError(
        deleteError.message ||
          'Не удалось удалить предложение'
      )
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Кабинет партнёра</h1>
          <p>
            Создание предложений и проверка купонов.
          </p>
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

      {statistics && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div className="stat-card">
            <strong>
              {statistics.offersCount}
            </strong>
            <span>Предложений</span>
          </div>

          <div className="stat-card">
            <strong>
              {statistics.activeOffersCount}
            </strong>
            <span>Активных</span>
          </div>

          <div className="stat-card">
            <strong>
              {statistics.activeCouponsCount}
            </strong>
            <span>Активных купонов</span>
          </div>

          <div className="stat-card">
            <strong>
              {statistics.usedCouponsCount}
            </strong>
            <span>Использовано</span>
          </div>
        </div>
      )}

      <section
        className="content-card"
        style={{
          marginBottom: '20px',
        }}
      >
        <h2>Проверить QR-код</h2>

        <p
          style={{
            color: '#6b7280',
          }}
        >
          Временно вставьте код из QR вручную.
          Позже подключим сканирование камерой.
        </p>

        <form
          onSubmit={handleValidateCoupon}
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            value={couponToken}
            onChange={(event) =>
              setCouponToken(event.target.value)
            }
            placeholder="EDB-..."
            style={{
              flex: 1,
              minWidth: '240px',
            }}
            required
          />

          <button
            type="submit"
            className="primary-button"
          >
            Проверить
          </button>
        </form>

        {checkedCoupon && (
          <div
            style={{
              marginTop: '18px',
              padding: '16px',
              borderRadius: '14px',
              border: validationResult?.valid
                ? '1px solid #86efac'
                : '1px solid #fca5a5',
              background: validationResult?.valid
                ? '#f0fdf4'
                : '#fef2f2',
            }}
          >
            <h3>{checkedCoupon.offerTitle}</h3>

            <p>
              Партнёр:{' '}
              <strong>
                {checkedCoupon.partnerName}
              </strong>
            </p>

            <p>
              Ученик:{' '}
              <strong>
                {checkedCoupon.studentName}
              </strong>
            </p>

            {checkedCoupon.rewardType ===
            'discount' ? (
              <p>
                Скидка:{' '}
                <strong>
                  {checkedCoupon.discountPercent}%
                </strong>
              </p>
            ) : (
              <p>
                Подарок:{' '}
                <strong>
                  {checkedCoupon.giftName}
                </strong>
              </p>
            )}

            {validationResult?.valid && (
              <button
                type="button"
                className="primary-button"
                onClick={handleUseCoupon}
              >
                Подтвердить использование
              </button>
            )}
          </div>
        )}
      </section>

      <section
        className="content-card"
        style={{
          marginBottom: '20px',
        }}
      >
        <h2>Новое предложение</h2>

        <form onSubmit={handleCreateOffer}>
          <div className="form-grid">
            <label>
              Название партнёра
              <input
                type="text"
                name="partnerName"
                value={offerForm.partnerName}
                onChange={handleOfferChange}
                required
              />
            </label>

            <label>
              Категория
              <select
                name="partnerCategory"
                value={
                  offerForm.partnerCategory
                }
                onChange={handleOfferChange}
              >
                <option>Кафе</option>
                <option>Канцелярия</option>
                <option>Книжный магазин</option>
                <option>Одежда</option>
                <option>Учебный центр</option>
                <option>Полиграфия</option>
                <option>Другое</option>
              </select>
            </label>

            <label>
              Название предложения
              <input
                type="text"
                name="title"
                value={offerForm.title}
                onChange={handleOfferChange}
                required
              />
            </label>

            <label>
              Значок
              <input
                type="text"
                name="imageEmoji"
                value={offerForm.imageEmoji}
                onChange={handleOfferChange}
                maxLength={4}
              />
            </label>

            <label>
              Тип награды
              <select
                name="rewardType"
                value={offerForm.rewardType}
                onChange={handleOfferChange}
              >
                <option value="discount">
                  Скидка
                </option>
                <option value="gift">
                  Подарок
                </option>
              </select>
            </label>

            {offerForm.rewardType ===
            'discount' ? (
              <label>
                Размер скидки, %
                <input
                  type="number"
                  name="discountPercent"
                  min="1"
                  max="100"
                  value={
                    offerForm.discountPercent
                  }
                  onChange={handleOfferChange}
                />
              </label>
            ) : (
              <label>
                Название подарка
                <input
                  type="text"
                  name="giftName"
                  value={offerForm.giftName}
                  onChange={handleOfferChange}
                />
              </label>
            )}

            <label>
              Стоимость в баллах
              <input
                type="number"
                name="pointsCost"
                min="1"
                value={offerForm.pointsCost}
                onChange={handleOfferChange}
              />
            </label>

            <label>
              Количество купонов
              <input
                type="number"
                name="quantity"
                min="1"
                value={offerForm.quantity}
                onChange={handleOfferChange}
              />
            </label>

            <label>
              Минимальная покупка, сом
              <input
                type="number"
                name="minimumPurchase"
                min="0"
                value={
                  offerForm.minimumPurchase
                }
                onChange={handleOfferChange}
              />
            </label>

            <label>
              Город
              <input
                type="text"
                name="city"
                value={offerForm.city}
                onChange={handleOfferChange}
              />
            </label>

            <label>
              Адрес
              <input
                type="text"
                name="address"
                value={offerForm.address}
                onChange={handleOfferChange}
              />
            </label>
          </div>

          <label>
            Описание
            <textarea
              name="description"
              value={offerForm.description}
              onChange={handleOfferChange}
              rows={4}
            />
          </label>

          <button
            type="submit"
            className="primary-button"
          >
            Создать предложение
          </button>
        </form>
      </section>

      <section className="content-card">
        <h2>Все предложения</h2>

        <div
          style={{
            display: 'grid',
            gap: '12px',
          }}
        >
          {offers.map((offer) => (
            <article
              key={offer.id}
              style={{
                padding: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '14px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h3>
                    {offer.imageEmoji}{' '}
                    {offer.partnerName}
                  </h3>

                  <p>{offer.title}</p>

                  <small>
                    Цена: {offer.pointsCost} баллов ·
                    Использовано:{' '}
                    {offer.redeemedCount || 0} из{' '}
                    {offer.quantity}
                  </small>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      togglePartnerOffer(offer.id)
                      loadData()
                    }}
                  >
                    {offer.active
                      ? 'Отключить'
                      : 'Включить'}
                  </button>

                  <button
                    type="button"
                    className="danger-button"
                    onClick={() =>
                      handleDeleteOffer(offer.id)
                    }
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default PartnerDashboardPage