import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  cancelCoupon,
  getStudentCoupons,
} from '../services/partnerService'

const statusLabels = {
  active: 'Активный',
  used: 'Использован',
  expired: 'Истёк',
  cancelled: 'Отменён',
}

function MyCouponsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [coupons, setCoupons] = useState([])
  const [filter, setFilter] = useState('all')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadCoupons = () => {
    if (!user?.id) {
      return
    }

    setCoupons(getStudentCoupons(user.id))
  }

  useEffect(() => {
    loadCoupons()

    const intervalId = window.setInterval(
      loadCoupons,
      1000
    )

    return () => {
      window.clearInterval(intervalId)
    }
  }, [user?.id])

  const filteredCoupons = useMemo(() => {
    if (filter === 'all') {
      return coupons
    }

    return coupons.filter(
      (coupon) => coupon.status === filter
    )
  }, [coupons, filter])

  const handleCancel = (couponId) => {
    setMessage('')
    setError('')

    const confirmed = window.confirm(
      'Отменить купон и вернуть потраченные баллы?'
    )

    if (!confirmed) {
      return
    }

    try {
      cancelCoupon(couponId)
      loadCoupons()
      setMessage(
        'Купон отменён. Баллы возвращены.'
      )
    } catch (cancelError) {
      setError(
        cancelError.message ||
          'Не удалось отменить купон'
      )
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Мои купоны</h1>
          <p>
            Активные, использованные и истёкшие
            награды.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() =>
            navigate('/partner-rewards')
          }
        >
          Каталог наград
        </button>
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
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '18px',
        }}
      >
        {[
          ['all', 'Все'],
          ['active', 'Активные'],
          ['used', 'Использованные'],
          ['expired', 'Истёкшие'],
          ['cancelled', 'Отменённые'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={
              filter === value
                ? 'primary-button'
                : 'secondary-button'
            }
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {filteredCoupons.length === 0 ? (
        <div className="content-card empty-state">
          <h2>Купонов пока нет</h2>
          <p>
            Получите награду в каталоге партнёров.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: '14px',
          }}
        >
          {filteredCoupons.map((coupon) => (
            <article
              key={coupon.id}
              className="content-card"
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p
                    style={{
                      color: '#6b7280',
                      margin: '0 0 5px',
                    }}
                  >
                    {coupon.partnerName}
                  </p>

                  <h2
                    style={{
                      margin: '0 0 8px',
                    }}
                  >
                    {coupon.offerTitle}
                  </h2>

                  <p>
                    Статус:{' '}
                    <strong>
                      {statusLabels[coupon.status] ||
                        coupon.status}
                    </strong>
                  </p>

                  <p>
                    Потрачено:{' '}
                    <strong>
                      {coupon.pointsSpent} баллов
                    </strong>
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      navigate(
                        `/coupons/${coupon.id}`
                      )
                    }
                  >
                    Открыть
                  </button>

                  {coupon.status === 'active' && (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() =>
                        handleCancel(coupon.id)
                      }
                    >
                      Отменить
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default MyCouponsPage