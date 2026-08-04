import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BadgePercent,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
  Gift,
  MapPin,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Ticket,
  WalletCards,
} from 'lucide-react'

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
  const [category, setCategory] =
    useState('Все')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [redeemingId, setRedeemingId] =
    useState(null)

  useEffect(() => {
    setOffers(getActivePartnerOffers())
  }, [])

  const userPoints = Number(
    user?.points || 0,
  )

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        offers
          .map(
            (offer) =>
              offer.partnerCategory,
          )
          .filter(Boolean),
      ),
    )

    return ['Все', ...uniqueCategories]
  }, [offers])

  const filteredOffers = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase()

    return offers.filter((offer) => {
      const searchableText = [
        offer.title,
        offer.partnerName,
        offer.description,
        offer.partnerCategory,
        offer.city,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(
          normalizedSearch,
        )

      const matchesCategory =
        category === 'Все' ||
        offer.partnerCategory === category

      return (
        matchesSearch &&
        matchesCategory
      )
    })
  }, [offers, search, category])

  const availableOffers =
    offers.filter(
      (offer) =>
        getRemainingCoupons(offer) > 0,
    ).length

  const affordableOffers =
    offers.filter(
      (offer) =>
        Number(
          offer.pointsCost || 0,
        ) <= userPoints,
    ).length

  function handleRedeem(offer) {
    setError('')
    setMessage('')

    const pointsCost = Number(
      offer.pointsCost || 0,
    )

    const confirmed =
      window.confirm(
        `Обменять ${pointsCost} баллов на «${offer.title}»? QR-код будет действовать 15 минут.`,
      )

    if (!confirmed) {
      return
    }

    try {
      setRedeemingId(offer.id)

      const coupon =
        redeemPartnerOffer(offer.id)

      setMessage(
        'Награда получена. Открываем временный QR-код.',
      )

      window.setTimeout(() => {
        navigate(
          `/coupons/${coupon.id}`,
        )
      }, 500)
    } catch (redeemError) {
      setRedeemingId(null)

      setError(
        redeemError.message ||
          'Не удалось получить награду',
      )
    }
  }

  if (!user) {
    return null
  }

  if (user.role !== 'Ученик') {
    return (
      <div className="partner-rewards-page">
        <section className="partner-access-card">
          <div>
            <Gift size={34} />
          </div>

          <h1>
            Партнёрские награды
          </h1>

          <p>
            Этот раздел доступен только
            ученикам.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="partner-rewards-page">
      <RewardsHeader />

      <RewardsHero
        points={userPoints}
        offersCount={availableOffers}
        affordableOffers={
          affordableOffers
        }
        onCouponsClick={() =>
          navigate('/my-coupons')
        }
      />

      {message && (
        <div className="partner-rewards-alert partner-rewards-alert--success">
          <CheckCircle2 size={19} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="partner-rewards-alert partner-rewards-alert--error">
          <span>!</span>
          <p>{error}</p>
        </div>
      )}

      <RewardsFilters
        search={search}
        setSearch={setSearch}
        category={category}
        setCategory={setCategory}
        categories={categories}
      />

      <section className="partner-rewards-section">
        <div className="partner-rewards-section-heading">
          <div>
            <p>Каталог наград</p>
            <h2>
              Предложения партнёров
            </h2>
          </div>

          <span>
            {filteredOffers.length}
          </span>
        </div>

        {filteredOffers.length === 0 ? (
          <RewardsEmptyState />
        ) : (
          <div className="partner-rewards-grid">
            {filteredOffers.map(
              (offer) => (
                <RewardCard
                  key={offer.id}
                  offer={offer}
                  userPoints={
                    userPoints
                  }
                  redeemingId={
                    redeemingId
                  }
                  onRedeem={
                    handleRedeem
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

function RewardsHeader() {
  return (
    <header className="partner-rewards-header">
      <div className="partner-rewards-header-icon">
        <Gift size={28} />
      </div>

      <div>
        <p>Бонусы за обучение</p>

        <h1>
          Награды партнёров
        </h1>

        <span>
          Обменивайте заработанные
          баллы на скидки, подарки и
          специальные предложения.
        </span>
      </div>
    </header>
  )
}

function RewardsHero({
  points,
  offersCount,
  affordableOffers,
  onCouponsClick,
}) {
  return (
    <section className="partner-rewards-hero">
      <div className="partner-rewards-hero-content">
        <div className="partner-rewards-hero-label">
          <Sparkles size={16} />
          Ваш бонусный баланс
        </div>

        <h2>
          {points.toLocaleString(
            'ru-RU',
          )}{' '}
          баллов
        </h2>

        <p>
          Выбирайте награды от
          партнёров EduBoost и
          получайте временный QR-код.
        </p>

        <div className="partner-rewards-hero-meta">
          <span>
            <Gift size={17} />
            {offersCount} доступных
            наград
          </span>

          <span>
            <Coins size={17} />
            {affordableOffers} можно
            получить
          </span>

          <span>
            <Clock3 size={17} />
            QR-код действует 15 минут
          </span>
        </div>

        <button
          type="button"
          onClick={onCouponsClick}
        >
          <WalletCards size={18} />
          Мои купоны
          <ChevronRight size={17} />
        </button>
      </div>

      <div className="partner-rewards-wallet">
        <div>
          <Coins size={33} />
        </div>

        <strong>
          {points.toLocaleString(
            'ru-RU',
          )}
        </strong>

        <span>
          доступно баллов
        </span>
      </div>
    </section>
  )
}

function RewardsFilters({
  search,
  setSearch,
  category,
  setCategory,
  categories,
}) {
  return (
    <section className="partner-rewards-filters">
      <label className="partner-rewards-search">
        <Search size={19} />

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder="Найти награду или партнёра..."
        />
      </label>

      <div className="partner-rewards-categories">
        {categories.map((item) => (
          <button
            type="button"
            key={item}
            className={
              category === item
                ? 'partner-category-button partner-category-button--active'
                : 'partner-category-button'
            }
            onClick={() =>
              setCategory(item)
            }
          >
            {item}
          </button>
        ))}
      </div>
    </section>
  )
}

function RewardCard({
  offer,
  userPoints,
  redeemingId,
  onRedeem,
}) {
  const remaining =
    getRemainingCoupons(offer)

  const pointsCost = Number(
    offer.pointsCost || 0,
  )

  const enoughPoints =
    userPoints >= pointsCost

  const isAvailable =
    remaining > 0

  const isRedeeming =
    redeemingId === offer.id

  const missingPoints = Math.max(
    pointsCost - userPoints,
    0,
  )

  return (
    <article className="partner-reward-card">
      <div className="partner-reward-cover">
        <div className="partner-reward-icon">
          <Gift size={34} />
        </div>

        <span>
          <Store size={14} />

          {offer.partnerCategory ||
            'Партнёр'}
        </span>
      </div>

      <div className="partner-reward-body">
        <div className="partner-reward-partner">
          <Store size={15} />
          {offer.partnerName}
        </div>

        <h3>{offer.title}</h3>

        <p className="partner-reward-description">
          {offer.description}
        </p>

        <div className="partner-reward-details">
          {offer.rewardType ===
          'discount' ? (
            <RewardDetail
              icon={BadgePercent}
              label="Скидка"
              value={`${Number(
                offer.discountPercent ||
                  0,
              )}%`}
            />
          ) : (
            <RewardDetail
              icon={Gift}
              label="Подарок"
              value={
                offer.giftName ||
                offer.title
              }
            />
          )}

          {Number(
            offer.minimumPurchase ||
              0,
          ) > 0 && (
            <RewardDetail
              icon={ShoppingBag}
              label="Минимальная покупка"
              value={`${Number(
                offer.minimumPurchase,
              ).toLocaleString(
                'ru-RU',
              )} сом`}
            />
          )}

          <RewardDetail
            icon={MapPin}
            label="Адрес"
            value={[
              offer.city,
              offer.address,
            ]
              .filter(Boolean)
              .join(', ')}
          />

          <RewardDetail
            icon={Ticket}
            label="Осталось купонов"
            value={remaining}
          />
        </div>

        <div className="partner-reward-footer">
          <div className="partner-reward-price">
            <div>
              <Coins size={18} />
            </div>

            <span>
              <strong>
                {pointsCost.toLocaleString(
                  'ru-RU',
                )}
              </strong>

              <small>баллов</small>
            </span>
          </div>

          <button
            type="button"
            disabled={
              !enoughPoints ||
              !isAvailable ||
              isRedeeming
            }
            onClick={() =>
              onRedeem(offer)
            }
          >
            {isRedeeming
              ? 'Получаем...'
              : !isAvailable
                ? 'Закончились'
                : enoughPoints
                  ? 'Получить'
                  : `Не хватает ${missingPoints}`}
          </button>
        </div>
      </div>
    </article>
  )
}

function RewardDetail({
  icon: Icon,
  label,
  value,
}) {
  if (!value && value !== 0) {
    return null
  }

  return (
    <div className="partner-reward-detail">
      <div>
        <Icon size={16} />
      </div>

      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  )
}

function RewardsEmptyState() {
  return (
    <div className="partner-rewards-empty">
      <div>
        <Search size={31} />
      </div>

      <h2>
        Предложения не найдены
      </h2>

      <p>
        Попробуйте изменить поисковый
        запрос или выбрать другую
        категорию.
      </p>
    </div>
  )
}

function getRemainingCoupons(
  offer,
) {
  return Math.max(
    Number(offer.quantity || 0) -
      Number(
        offer.redeemedCount || 0,
      ),
    0,
  )
}

export default PartnerRewardsPage