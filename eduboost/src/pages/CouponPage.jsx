import { useEffect, useState } from 'react'
import {
  useNavigate,
  useParams,
} from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'

import {
  cancelCoupon,
  getCouponById,
} from '../services/partnerService'

function formatRemainingTime(expiresAt) {
  const expiresTimestamp = new Date(expiresAt).getTime()
  const remainingMilliseconds =
    expiresTimestamp - Date.now()

  if (
    Number.isNaN(expiresTimestamp) ||
    remainingMilliseconds <= 0
  ) {
    return '00:00'
  }

  const totalSeconds = Math.floor(
    remainingMilliseconds / 1000
  )

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(
    2,
    '0'
  )}:${String(seconds).padStart(2, '0')}`
}

function formatDate(dateValue) {
  if (!dateValue) {
    return 'Дата не указана'
  }

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return 'Дата не указана'
  }

  return date.toLocaleString('ru-RU')
}

function CouponPage() {
  const { couponId } = useParams()
  const navigate = useNavigate()

  const [coupon, setCoupon] = useState(null)
  const [remainingTime, setRemainingTime] =
    useState('00:00')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] =
    useState(true)

  const loadCoupon = () => {
    try {
      const foundCoupon = getCouponById(couponId)

      setCoupon(foundCoupon)

      if (foundCoupon?.expiresAt) {
        setRemainingTime(
          formatRemainingTime(foundCoupon.expiresAt)
        )
      } else {
        setRemainingTime('00:00')
      }
    } catch (loadError) {
      console.error(
        'Ошибка загрузки купона:',
        loadError
      )

      setError(
        loadError.message ||
          'Не удалось загрузить купон'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCoupon()

    const intervalId = window.setInterval(() => {
      loadCoupon()
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [couponId])

  const handleCancel = () => {
    setError('')

    if (!coupon) {
      return
    }

    const confirmed = window.confirm(
      'Отменить купон и вернуть потраченные баллы?'
    )

    if (!confirmed) {
      return
    }

    try {
      cancelCoupon(coupon.id)
      loadCoupon()
    } catch (cancelError) {
      console.error(
        'Ошибка отмены купона:',
        cancelError
      )

      setError(
        cancelError.message ||
          'Не удалось отменить купон'
      )
    }
  }

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="content-card">
          <h1>Загрузка купона...</h1>
        </div>
      </div>
    )
  }

  if (!coupon) {
    return (
      <div className="page-container">
        <div className="content-card">
          <h1>Купон не найден</h1>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate('/my-coupons')
            }
          >
            Перейти к моим купонам
          </button>
        </div>
      </div>
    )
  }

  const isActive =
    coupon.status === 'active'

  const statusText =
    {
      active: 'Активный',
      used: 'Уже использован',
      expired: 'Срок действия истёк',
      cancelled: 'Отменён',
    }[coupon.status] || 'Неизвестный статус'

  const statusBackground =
    coupon.status === 'active'
      ? '#dcfce7'
      : coupon.status === 'used'
        ? '#dbeafe'
        : coupon.status === 'expired'
          ? '#fef3c7'
          : '#f3f4f6'

  const statusColor =
    coupon.status === 'active'
      ? '#166534'
      : coupon.status === 'used'
        ? '#1d4ed8'
        : coupon.status === 'expired'
          ? '#92400e'
          : '#374151'

  return (
    <div className="page-container">
      <button
        type="button"
        className="secondary-button"
        onClick={() =>
          navigate('/my-coupons')
        }
        style={{
          marginBottom: '16px',
        }}
      >
        ← Мои купоны
      </button>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div
        className="content-card"
        style={{
          maxWidth: '620px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            marginBottom: '8px',
            color: '#6b7280',
          }}
        >
          {coupon.partnerName ||
            'Партнёр не указан'}
        </p>

        <h1>{coupon.offerTitle}</h1>

        <div
          style={{
            display: 'inline-block',
            marginBottom: '20px',
            padding: '8px 14px',
            borderRadius: '999px',
            background: statusBackground,
            color: statusColor,
          }}
        >
          {statusText}
        </div>

        {isActive ? (
          <>
            <div
              style={{
                display: 'inline-block',
                padding: '20px',
                border: '1px solid #e5e7eb',
                borderRadius: '18px',
                background: '#ffffff',
              }}
            >
              <QRCodeSVG
                value={coupon.token || coupon.id}
                size={240}
                level="H"
                includeMargin
              />
            </div>

            <h2
              style={{
                marginTop: '20px',
              }}
            >
              Осталось: {remainingTime}
            </h2>

            <p
              style={{
                color: '#6b7280',
              }}
            >
              Покажите этот QR-код сотруднику
              партнёра. После подтверждения он
              перестанет действовать.
            </p>

            <div
              style={{
                margin: '16px 0',
                padding: '12px',
                borderRadius: '12px',
                background: '#f9fafb',
                wordBreak: 'break-all',
              }}
            >
              <small>Код купона</small>

              <br />

              <strong>
                {coupon.token ||
                  'Код не сформирован'}
              </strong>
            </div>

            {coupon.rewardType ===
            'discount' ? (
              <p>
                Скидка:{' '}
                <strong>
                  {Number(
                    coupon.discountPercent
                  ) || 0}
                  %
                </strong>
              </p>
            ) : (
              <p>
                Подарок:{' '}
                <strong>
                  {coupon.giftName ||
                    'Подарок не указан'}
                </strong>
              </p>
            )}

            {Number(coupon.minimumPurchase) >
              0 && (
              <p>
                Минимальная покупка:{' '}
                <strong>
                  {coupon.minimumPurchase} сом
                </strong>
              </p>
            )}

            <p>
              Потрачено:{' '}
              <strong>
                {Number(coupon.pointsSpent) || 0}{' '}
                баллов
              </strong>
            </p>

            <button
              type="button"
              className="danger-button"
              onClick={handleCancel}
            >
              Отменить и вернуть баллы
            </button>
          </>
        ) : (
          <div
            style={{
              padding: '28px',
              borderRadius: '16px',
              background: '#f9fafb',
            }}
          >
            <h2>{statusText}</h2>

            {coupon.status === 'used' && (
              <p>
                Использован:{' '}
                <strong>
                  {formatDate(coupon.usedAt)}
                </strong>
              </p>
            )}

            {coupon.status ===
              'cancelled' && (
              <p>
                Отменён:{' '}
                <strong>
                  {formatDate(
                    coupon.cancelledAt
                  )}
                </strong>
              </p>
            )}

            {coupon.status ===
              'expired' && (
              <>
                <p>
                  Срок действия купона завершился.
                </p>

                <p>
                  Баллы за автоматически истёкший
                  купон пока не возвращаются.
                </p>
              </>
            )}

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                navigate('/partner-rewards')
              }
            >
              Открыть каталог наград
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CouponPage