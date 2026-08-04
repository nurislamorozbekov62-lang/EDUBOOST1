import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Ban,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
  Gift,
  QrCode,
  RefreshCcw,
  Search,
  ShieldCheck,
  Store,
  Ticket,
  WalletCards,
  XCircle,
} from 'lucide-react'

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

const filterItems = [
  {
    value: 'all',
    label: 'Все',
  },
  {
    value: 'active',
    label: 'Активные',
  },
  {
    value: 'used',
    label: 'Использованные',
  },
  {
    value: 'expired',
    label: 'Истёкшие',
  },
  {
    value: 'cancelled',
    label: 'Отменённые',
  },
]

function MyCouponsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [coupons, setCoupons] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] =
    useState(null)

  function loadCoupons() {
    if (!user?.id) {
      setCoupons([])
      return
    }

    setCoupons(getStudentCoupons(user.id))
  }

  useEffect(() => {
    loadCoupons()

    const intervalId = window.setInterval(
      loadCoupons,
      1000,
    )

    return () => {
      window.clearInterval(intervalId)
    }
  }, [user?.id])

  const filteredCoupons = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase()

    return coupons.filter((coupon) => {
      const matchesStatus =
        filter === 'all' ||
        coupon.status === filter

      const searchableText = [
        coupon.partnerName,
        coupon.offerTitle,
        statusLabels[coupon.status],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(
          normalizedSearch,
        )

      return matchesStatus && matchesSearch
    })
  }, [coupons, filter, search])

  const statistics = useMemo(() => {
    return {
      total: coupons.length,
      active: coupons.filter(
        (coupon) =>
          coupon.status === 'active',
      ).length,
      used: coupons.filter(
        (coupon) =>
          coupon.status === 'used',
      ).length,
      spent: coupons.reduce(
        (sum, coupon) =>
          sum +
          Number(coupon.pointsSpent || 0),
        0,
      ),
    }
  }, [coupons])

  function handleCancel(couponId) {
    setMessage('')
    setError('')

    const confirmed = window.confirm(
      'Отменить купон и вернуть потраченные баллы?',
    )

    if (!confirmed) {
      return
    }

    try {
      setCancellingId(couponId)

      cancelCoupon(couponId)
      loadCoupons()

      setMessage(
        'Купон отменён. Баллы возвращены на баланс.',
      )
    } catch (cancelError) {
      setError(
        cancelError.message ||
          'Не удалось отменить купон',
      )
    } finally {
      setCancellingId(null)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="my-coupons-page">
      <CouponsHeader />

      <CouponsHero
        activeCount={statistics.active}
        totalCount={statistics.total}
        spentPoints={statistics.spent}
        onCatalogClick={() =>
          navigate('/partner-rewards')
        }
      />

      {message && (
        <div className="my-coupons-alert my-coupons-alert--success">
          <CheckCircle2 size={19} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="my-coupons-alert my-coupons-alert--error">
          <XCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      <CouponsStats statistics={statistics} />

      <CouponsFilters
        filter={filter}
        setFilter={setFilter}
        search={search}
        setSearch={setSearch}
        coupons={coupons}
      />

      <section className="my-coupons-section">
        <div className="my-coupons-section-heading">
          <div>
            <p>Ваши награды</p>
            <h2>Список купонов</h2>
          </div>

          <span>
            {filteredCoupons.length}
          </span>
        </div>

        {filteredCoupons.length === 0 ? (
          <CouponsEmptyState
            onCatalogClick={() =>
              navigate('/partner-rewards')
            }
          />
        ) : (
          <div className="my-coupons-list">
            {filteredCoupons.map(
              (coupon) => (
                <CouponCard
                  key={coupon.id}
                  coupon={coupon}
                  cancellingId={
                    cancellingId
                  }
                  onOpen={() =>
                    navigate(
                      `/coupons/${coupon.id}`,
                    )
                  }
                  onCancel={() =>
                    handleCancel(coupon.id)
                  }
                />
              ),
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function CouponsHeader() {
  return (
    <header className="my-coupons-header">
      <div className="my-coupons-header-icon">
        <WalletCards size={28} />
      </div>

      <div>
        <p>Ваши вознаграждения</p>

        <h1>Мои купоны</h1>

        <span>
          Просматривайте активные,
          использованные, отменённые и
          истёкшие награды.
        </span>
      </div>
    </header>
  )
}

function CouponsHero({
  activeCount,
  totalCount,
  spentPoints,
  onCatalogClick,
}) {
  return (
    <section className="my-coupons-hero">
      <div className="my-coupons-hero-content">
        <div className="my-coupons-hero-label">
          <Gift size={16} />
          Центр наград
        </div>

        <h2>
          {activeCount > 0
            ? `${activeCount} активных купонов`
            : 'Активных купонов пока нет'}
        </h2>

        <p>
          Открывайте купон перед
          использованием и показывайте
          временный QR-код партнёру.
        </p>

        <div className="my-coupons-hero-meta">
          <span>
            <Ticket size={17} />
            Всего купонов: {totalCount}
          </span>

          <span>
            <Coins size={17} />
            Потрачено: {spentPoints} баллов
          </span>

          <span>
            <ShieldCheck size={17} />
            Безопасный QR-код
          </span>
        </div>

        <button
          type="button"
          onClick={onCatalogClick}
        >
          <Store size={18} />
          Каталог наград
          <ChevronRight size={17} />
        </button>
      </div>

      <div className="my-coupons-hero-badge">
        <QrCode size={42} />

        <strong>{activeCount}</strong>

        <span>активных</span>
      </div>
    </section>
  )
}

function CouponsStats({ statistics }) {
  const items = [
    {
      label: 'Всего купонов',
      value: statistics.total,
      icon: Ticket,
      className:
        'coupon-stat--blue',
    },
    {
      label: 'Активные',
      value: statistics.active,
      icon: Clock3,
      className:
        'coupon-stat--green',
    },
    {
      label: 'Использованы',
      value: statistics.used,
      icon: CheckCircle2,
      className:
        'coupon-stat--purple',
    },
    {
      label: 'Потрачено баллов',
      value: statistics.spent,
      icon: Coins,
      className:
        'coupon-stat--gold',
    },
  ]

  return (
    <section className="my-coupons-stats">
      {items.map((item) => {
        const Icon = item.icon

        return (
          <article
            key={item.label}
            className={`my-coupons-stat-card ${item.className}`}
          >
            <div>
              <Icon size={21} />
            </div>

            <span>
              <strong>
                {Number(
                  item.value,
                ).toLocaleString('ru-RU')}
              </strong>

              <small>{item.label}</small>
            </span>
          </article>
        )
      })}
    </section>
  )
}

function CouponsFilters({
  filter,
  setFilter,
  search,
  setSearch,
  coupons,
}) {
  return (
    <section className="my-coupons-filters">
      <label className="my-coupons-search">
        <Search size={18} />

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Найти купон или партнёра..."
        />
      </label>

      <div className="my-coupons-filter-buttons">
        {filterItems.map((item) => {
          const count =
            item.value === 'all'
              ? coupons.length
              : coupons.filter(
                  (coupon) =>
                    coupon.status ===
                    item.value,
                ).length

          return (
            <button
              type="button"
              key={item.value}
              className={
                filter === item.value
                  ? 'coupon-filter-button coupon-filter-button--active'
                  : 'coupon-filter-button'
              }
              onClick={() =>
                setFilter(item.value)
              }
            >
              <span>{item.label}</span>
              <small>{count}</small>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function CouponCard({
  coupon,
  cancellingId,
  onOpen,
  onCancel,
}) {
  const statusData =
    getCouponStatusData(coupon.status)

  const StatusIcon = statusData.icon

  const isActive =
    coupon.status === 'active'

  const isCancelling =
    cancellingId === coupon.id

  return (
    <article
      className={`my-coupon-card my-coupon-card--${coupon.status}`}
    >
      <div className="my-coupon-card-side">
        <div className="my-coupon-icon">
          <Ticket size={31} />
        </div>

        <span>
          <StatusIcon size={15} />
          {statusData.label}
        </span>
      </div>

      <div className="my-coupon-card-content">
        <div className="my-coupon-card-header">
          <div>
            <p>
              <Store size={15} />
              {coupon.partnerName ||
                'Партнёр EduBoost'}
            </p>

            <h3>
              {coupon.offerTitle ||
                'Партнёрская награда'}
            </h3>
          </div>

          <div
            className={`my-coupon-status my-coupon-status--${coupon.status}`}
          >
            <StatusIcon size={15} />
            {statusData.label}
          </div>
        </div>

        <div className="my-coupon-info-grid">
          <CouponInfo
            icon={Coins}
            label="Потрачено"
            value={`${Number(
              coupon.pointsSpent || 0,
            ).toLocaleString(
              'ru-RU',
            )} баллов`}
          />

          <CouponInfo
            icon={QrCode}
            label="Код купона"
            value={getCouponCode(coupon)}
          />

          <CouponInfo
            icon={Clock3}
            label="Статус"
            value={statusData.description}
          />
        </div>

        <div className="my-coupon-actions">
          <button
            type="button"
            className="my-coupon-open-button"
            onClick={onOpen}
          >
            <QrCode size={18} />
            Открыть купон
          </button>

          {isActive && (
            <button
              type="button"
              className="my-coupon-cancel-button"
              disabled={isCancelling}
              onClick={onCancel}
            >
              {isCancelling ? (
                <RefreshCcw size={17} />
              ) : (
                <Ban size={17} />
              )}

              {isCancelling
                ? 'Отмена...'
                : 'Отменить'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function CouponInfo({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="my-coupon-info">
      <div>
        <Icon size={17} />
      </div>

      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  )
}

function CouponsEmptyState({
  onCatalogClick,
}) {
  return (
    <div className="my-coupons-empty">
      <div>
        <Ticket size={33} />
      </div>

      <h2>Купонов пока нет</h2>

      <p>
        Получите первую награду в каталоге
        партнёров EduBoost.
      </p>

      <button
        type="button"
        onClick={onCatalogClick}
      >
        <Gift size={18} />
        Перейти в каталог
      </button>
    </div>
  )
}

function getCouponStatusData(status) {
  if (status === 'active') {
    return {
      label: 'Активный',
      description:
        'Готов к использованию',
      icon: Clock3,
    }
  }

  if (status === 'used') {
    return {
      label: 'Использован',
      description:
        'Награда уже получена',
      icon: CheckCircle2,
    }
  }

  if (status === 'expired') {
    return {
      label: 'Истёк',
      description:
        'Срок действия завершён',
      icon: XCircle,
    }
  }

  return {
    label: 'Отменён',
    description:
      'Баллы возвращены',
    icon: Ban,
  }
}

function getCouponCode(coupon) {
  const rawCode =
    coupon.code ||
    coupon.qrCode ||
    coupon.id ||
    'EDUBOOST'

  return String(rawCode)
    .slice(0, 12)
    .toUpperCase()
}

export default MyCouponsPage