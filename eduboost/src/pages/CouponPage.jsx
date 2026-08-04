import { useEffect, useState } from 'react'
import {
  useNavigate,
  useParams,
} from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock3,
  Coins,
  Gift,
  MapPin,
  QrCode,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Store,
  Ticket,
  XCircle,
} from 'lucide-react'

import {
  cancelCoupon,
  getCouponById,
} from '../services/partnerService'

function CouponPage() {
  const { couponId } = useParams()
  const navigate = useNavigate()

  const [coupon, setCoupon] = useState(null)
  const [remainingTime, setRemainingTime] =
    useState('00:00')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] =
    useState(true)
  const [isCancelling, setIsCancelling] =
    useState(false)

  function loadCoupon() {
    try {
      const foundCoupon =
        getCouponById(couponId)

      setCoupon(foundCoupon || null)
      setError('')

      if (
        foundCoupon?.status === 'active' &&
        foundCoupon?.expiresAt
      ) {
        setRemainingTime(
          formatRemainingTime(
            foundCoupon.expiresAt,
          ),
        )
      } else {
        setRemainingTime('00:00')
      }
    } catch (loadError) {
      setCoupon(null)

      setError(
        loadError.message ||
          'Не удалось загрузить купон',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCoupon()

    const intervalId =
      window.setInterval(() => {
        loadCoupon()
      }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [couponId])

  function handleCancel() {
    setError('')

    if (!coupon) {
      return
    }

    const confirmed = window.confirm(
      'Отменить купон и вернуть потраченные баллы?',
    )

    if (!confirmed) {
      return
    }

    try {
      setIsCancelling(true)

      cancelCoupon(coupon.id)
      loadCoupon()
    } catch (cancelError) {
      setError(
        cancelError.message ||
          'Не удалось отменить купон',
      )
    } finally {
      setIsCancelling(false)
    }
  }

  if (isLoading) {
    return <CouponLoading />
  }

  if (!coupon) {
    return (
      <CouponNotFound
        error={error}
        onBack={() =>
          navigate('/my-coupons')
        }
      />
    )
  }

  const statusData =
    getCouponStatusData(coupon.status)

  const StatusIcon = statusData.icon

  const isActive =
    coupon.status === 'active'

  return (
    <div className="coupon-details-page">
      <button
        type="button"
        className="coupon-details-back"
        onClick={() =>
          navigate('/my-coupons')
        }
      >
        <ArrowLeft size={18} />
        Мои купоны
      </button>

      {error && (
        <div className="coupon-details-alert">
          <XCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <header className="coupon-details-header">
        <div className="coupon-details-header-icon">
          <Ticket size={28} />
        </div>

        <div>
          <p>Партнёрская награда</p>

          <h1>
            {coupon.offerTitle ||
              'Купон EduBoost'}
          </h1>

          <span>
            Покажите QR-код сотруднику
            партнёра для получения награды.
          </span>
        </div>
      </header>

      <section
        className={`coupon-details-card coupon-details-card--${coupon.status}`}
      >
        <div className="coupon-details-top">
          <div>
            <div className="coupon-details-partner">
              <Store size={16} />

              {coupon.partnerName ||
                'Партнёр EduBoost'}
            </div>

            <h2>
              {coupon.offerTitle ||
                'Партнёрская награда'}
            </h2>
          </div>

          <div
            className={`coupon-details-status coupon-details-status--${coupon.status}`}
          >
            <StatusIcon size={16} />
            {statusData.label}
          </div>
        </div>

        {isActive ? (
          <ActiveCoupon
            coupon={coupon}
            remainingTime={remainingTime}
            isCancelling={isCancelling}
            onCancel={handleCancel}
          />
        ) : (
          <InactiveCoupon
            coupon={coupon}
            statusData={statusData}
            onCatalogClick={() =>
              navigate('/partner-rewards')
            }
          />
        )}
      </section>
    </div>
  )
}

function ActiveCoupon({
  coupon,
  remainingTime,
  isCancelling,
  onCancel,
}) {
  const qrValue =
    coupon.token ||
    coupon.code ||
    coupon.id

  const isTimeCritical =
    getRemainingSeconds(
      coupon.expiresAt,
    ) <= 60

  return (
    <div className="coupon-active-layout">
      <div className="coupon-qr-column">
        <div className="coupon-qr-label">
          <ShieldCheck size={16} />
          Защищённый QR-код
        </div>

        <div className="coupon-qr-wrapper">
          <QRCodeSVG
            value={String(qrValue)}
            size={230}
            level="H"
            includeMargin
          />
        </div>

        <div
          className={
            isTimeCritical
              ? 'coupon-timer coupon-timer--critical'
              : 'coupon-timer'
          }
        >
          <Clock3 size={20} />

          <span>
            <small>
              Осталось времени
            </small>

            <strong>
              {remainingTime}
            </strong>
          </span>
        </div>

        <p className="coupon-qr-help">
          QR-код перестанет действовать
          после использования или
          завершения таймера.
        </p>
      </div>

      <div className="coupon-information-column">
        <div className="coupon-code-card">
          <div>
            <QrCode size={19} />
          </div>

          <span>
            <small>Код купона</small>

            <strong>
              {coupon.token ||
                coupon.code ||
                coupon.id ||
                'Код не сформирован'}
            </strong>
          </span>
        </div>

        <div className="coupon-details-grid">
          {coupon.rewardType ===
          'discount' ? (
            <CouponInfo
              icon={Ticket}
              label="Размер скидки"
              value={`${Number(
                coupon.discountPercent ||
                  0,
              )}%`}
            />
          ) : (
            <CouponInfo
              icon={Gift}
              label="Подарок"
              value={
                coupon.giftName ||
                coupon.offerTitle ||
                'Подарок'
              }
            />
          )}

          <CouponInfo
            icon={Coins}
            label="Потрачено"
            value={`${Number(
              coupon.pointsSpent || 0,
            ).toLocaleString(
              'ru-RU',
            )} баллов`}
          />

          {Number(
            coupon.minimumPurchase || 0,
          ) > 0 && (
            <CouponInfo
              icon={ShoppingBag}
              label="Минимальная покупка"
              value={`${Number(
                coupon.minimumPurchase,
              ).toLocaleString(
                'ru-RU',
              )} сом`}
            />
          )}

          {(coupon.city ||
            coupon.address) && (
            <CouponInfo
              icon={MapPin}
              label="Адрес"
              value={[
                coupon.city,
                coupon.address,
              ]
                .filter(Boolean)
                .join(', ')}
            />
          )}
        </div>

        <div className="coupon-instruction">
          <div>
            <CheckCircle2 size={22} />
          </div>

          <span>
            <strong>
              Как использовать купон
            </strong>

            <p>
              Покажите QR-код сотруднику
              партнёра. После подтверждения
              статус купона изменится на
              «Использован».
            </p>
          </span>
        </div>

        <button
          type="button"
          className="coupon-cancel-button"
          disabled={isCancelling}
          onClick={onCancel}
        >
          {isCancelling ? (
            <RefreshCcw size={18} />
          ) : (
            <Ban size={18} />
          )}

          {isCancelling
            ? 'Отменяем...'
            : 'Отменить и вернуть баллы'}
        </button>
      </div>
    </div>
  )
}

function InactiveCoupon({
  coupon,
  statusData,
  onCatalogClick,
}) {
  const StatusIcon = statusData.icon

  return (
    <div className="coupon-inactive-state">
      <div
        className={`coupon-inactive-icon coupon-inactive-icon--${coupon.status}`}
      >
        <StatusIcon size={36} />
      </div>

      <h2>{statusData.label}</h2>

      <p>{statusData.description}</p>

      <div className="coupon-inactive-info">
        {coupon.status === 'used' && (
          <CouponInfo
            icon={CheckCircle2}
            label="Использован"
            value={formatDate(
              coupon.usedAt,
            )}
          />
        )}

        {coupon.status ===
          'cancelled' && (
          <CouponInfo
            icon={Ban}
            label="Отменён"
            value={formatDate(
              coupon.cancelledAt,
            )}
          />
        )}

        {coupon.status ===
          'expired' && (
          <CouponInfo
            icon={Clock3}
            label="Срок завершён"
            value={formatDate(
              coupon.expiresAt,
            )}
          />
        )}

        <CouponInfo
          icon={Coins}
          label="Потрачено"
          value={`${Number(
            coupon.pointsSpent || 0,
          ).toLocaleString(
            'ru-RU',
          )} баллов`}
        />
      </div>

      <button
        type="button"
        onClick={onCatalogClick}
      >
        <Gift size={18} />
        Открыть каталог наград
      </button>
    </div>
  )
}

function CouponInfo({
  icon: Icon,
  label,
  value,
}) {
  if (!value) {
    return null
  }

  return (
    <div className="coupon-info-card">
      <div>
        <Icon size={18} />
      </div>

      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  )
}

function CouponLoading() {
  return (
    <div className="coupon-details-page">
      <div className="coupon-loading-card">
        <RefreshCcw size={30} />
        <h1>Загрузка купона...</h1>
      </div>
    </div>
  )
}

function CouponNotFound({
  error,
  onBack,
}) {
  return (
    <div className="coupon-details-page">
      <div className="coupon-not-found">
        <div>
          <XCircle size={34} />
        </div>

        <h1>Купон не найден</h1>

        <p>
          {error ||
            'Возможно, купон был удалён или его адрес указан неправильно.'}
        </p>

        <button
          type="button"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
          Перейти к моим купонам
        </button>
      </div>
    </div>
  )
}

function getCouponStatusData(status) {
  if (status === 'active') {
    return {
      label: 'Активный',
      description:
        'Купон готов к использованию.',
      icon: Clock3,
    }
  }

  if (status === 'used') {
    return {
      label: 'Уже использован',
      description:
        'Награда по этому купону уже была получена.',
      icon: CheckCircle2,
    }
  }

  if (status === 'expired') {
    return {
      label: 'Срок действия истёк',
      description:
        'QR-код больше не действует.',
      icon: Clock3,
    }
  }

  if (status === 'cancelled') {
    return {
      label: 'Купон отменён',
      description:
        'Потраченные баллы были возвращены.',
      icon: Ban,
    }
  }

  return {
    label: 'Неизвестный статус',
    description:
      'Не удалось определить состояние купона.',
    icon: XCircle,
  }
}

function formatRemainingTime(expiresAt) {
  const totalSeconds =
    getRemainingSeconds(expiresAt)

  if (totalSeconds <= 0) {
    return '00:00'
  }

  const minutes = Math.floor(
    totalSeconds / 60,
  )

  const seconds =
    totalSeconds % 60

  return `${String(minutes).padStart(
    2,
    '0',
  )}:${String(seconds).padStart(
    2,
    '0',
  )}`
}

function getRemainingSeconds(expiresAt) {
  const expiresTimestamp =
    new Date(expiresAt).getTime()

  if (
    Number.isNaN(expiresTimestamp)
  ) {
    return 0
  }

  return Math.max(
    Math.floor(
      (expiresTimestamp -
        Date.now()) /
        1000,
    ),
    0,
  )
}

function formatDate(dateValue) {
  if (!dateValue) {
    return 'Дата не указана'
  }

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return 'Дата не указана'
  }

  return date.toLocaleString(
    'ru-RU',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  )
}

export default CouponPage