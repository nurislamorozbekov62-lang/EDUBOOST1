const OFFERS_KEY = 'eduboost_partner_offers'
const COUPONS_KEY = 'eduboost_partner_coupons'
const USERS_KEY = 'eduboost_users'
const CURRENT_USER_KEY = 'eduboost_current_user'

const COUPON_LIFETIME_MINUTES = 15

function generateId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`
}

function generateToken() {
  const randomPart = Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase()

  return `EDB-${Date.now()}-${randomPart}`
}

function readStorage(key, fallback = []) {
  try {
    const value = localStorage.getItem(key)

    if (!value) {
      return fallback
    }

    return JSON.parse(value)
  } catch (error) {
    console.error(`Ошибка чтения ${key}:`, error)
    return fallback
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Ошибка сохранения ${key}:`, error)
    throw new Error('Не удалось сохранить данные')
  }
}

function getCurrentUser() {
  return readStorage(CURRENT_USER_KEY, null)
}

function updateCurrentUser(updatedUser) {
  writeStorage(CURRENT_USER_KEY, updatedUser)

  const users = readStorage(USERS_KEY, [])

  const userExists = users.some(
    (user) => user.id === updatedUser.id
  )

  const updatedUsers = userExists
    ? users.map((user) =>
        user.id === updatedUser.id
          ? updatedUser
          : user
      )
    : [...users, updatedUser]

  writeStorage(USERS_KEY, updatedUsers)
}

function seedOffers() {
  const existingOffers = readStorage(OFFERS_KEY, [])

  if (existingOffers.length > 0) {
    return existingOffers
  }

  const now = new Date().toISOString()

  const demoOffers = [
    {
      id: generateId('offer'),
      partnerName: 'Coffee Time',
      partnerCategory: 'Кафе',
      title: 'Скидка 15% на заказ',
      description:
        'Скидка действует на напитки и десерты. Минимальная сумма заказа — 300 сом.',
      rewardType: 'discount',
      discountPercent: 15,
      giftName: '',
      pointsCost: 120,
      imageEmoji: '☕',
      city: 'Бишкек',
      address: 'ул. Киевская, 120',
      quantity: 100,
      redeemedCount: 0,
      minimumPurchase: 300,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId('offer'),
      partnerName: 'Билим Канц',
      partnerCategory: 'Канцелярия',
      title: 'Скидка 10% на канцтовары',
      description:
        'Тетради, ручки, папки и другие школьные принадлежности.',
      rewardType: 'discount',
      discountPercent: 10,
      giftName: '',
      pointsCost: 80,
      imageEmoji: '✏️',
      city: 'Бишкек',
      address: 'пр. Чуй, 155',
      quantity: 150,
      redeemedCount: 0,
      minimumPurchase: 200,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId('offer'),
      partnerName: 'Book House',
      partnerCategory: 'Книжный магазин',
      title: 'Скидка 20% на учебную книгу',
      description:
        'Скидка действует на одну учебную или художественную книгу.',
      rewardType: 'discount',
      discountPercent: 20,
      giftName: '',
      pointsCost: 200,
      imageEmoji: '📚',
      city: 'Ош',
      address: 'ул. Ленина, 240',
      quantity: 70,
      redeemedCount: 0,
      minimumPurchase: 400,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId('offer'),
      partnerName: 'EduPrint',
      partnerCategory: 'Полиграфия',
      title: 'Бесплатная печать 10 страниц',
      description:
        'Чёрно-белая печать десяти страниц формата A4.',
      rewardType: 'gift',
      discountPercent: 0,
      giftName: 'Печать 10 страниц',
      pointsCost: 100,
      imageEmoji: '🖨️',
      city: 'Манас',
      address: 'ул. Токтогула, 48',
      quantity: 200,
      redeemedCount: 0,
      minimumPurchase: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ]

  writeStorage(OFFERS_KEY, demoOffers)

  return demoOffers
}

function refreshCouponStatus(coupon) {
  if (
    coupon.status === 'active' &&
    new Date(coupon.expiresAt).getTime() <= Date.now()
  ) {
    return {
      ...coupon,
      status: 'expired',
      updatedAt: new Date().toISOString(),
    }
  }

  return coupon
}

function refreshAllCoupons() {
  const coupons = readStorage(COUPONS_KEY, [])
  const refreshedCoupons = coupons.map(
    refreshCouponStatus
  )

  const changed = refreshedCoupons.some(
    (coupon, index) =>
      coupon.status !== coupons[index]?.status
  )

  if (changed) {
    writeStorage(COUPONS_KEY, refreshedCoupons)
  }

  return refreshedCoupons
}

export function getPartnerOffers() {
  return seedOffers()
}

export function getActivePartnerOffers() {
  return getPartnerOffers().filter((offer) => {
    const remaining =
      Number(offer.quantity || 0) -
      Number(offer.redeemedCount || 0)

    return offer.active && remaining > 0
  })
}

export function getPartnerOfferById(offerId) {
  return (
    getPartnerOffers().find(
      (offer) => offer.id === offerId
    ) || null
  )
}

export function createPartnerOffer(offerData) {
  const currentUser = getCurrentUser()

  if (!currentUser) {
    throw new Error('Пользователь не найден')
  }

  if (!offerData.partnerName?.trim()) {
    throw new Error('Введите название партнёра')
  }

  if (!offerData.title?.trim()) {
    throw new Error('Введите название предложения')
  }

  if (Number(offerData.pointsCost) <= 0) {
    throw new Error(
      'Стоимость должна быть больше нуля'
    )
  }

  if (Number(offerData.quantity) <= 0) {
    throw new Error(
      'Количество купонов должно быть больше нуля'
    )
  }

  if (
    offerData.rewardType === 'discount' &&
    Number(offerData.discountPercent) <= 0
  ) {
    throw new Error('Укажите размер скидки')
  }

  if (
    offerData.rewardType === 'gift' &&
    !offerData.giftName?.trim()
  ) {
    throw new Error('Введите название подарка')
  }

  const offers = getPartnerOffers()
  const now = new Date().toISOString()

  const newOffer = {
    id: generateId('offer'),
    partnerName: offerData.partnerName.trim(),
    partnerCategory:
      offerData.partnerCategory?.trim() || 'Другое',
    title: offerData.title.trim(),
    description:
      offerData.description?.trim() || '',
    rewardType:
      offerData.rewardType || 'discount',
    discountPercent:
      Number(offerData.discountPercent) || 0,
    giftName: offerData.giftName?.trim() || '',
    pointsCost:
      Number(offerData.pointsCost) || 0,
    imageEmoji: offerData.imageEmoji || '🎁',
    city: offerData.city?.trim() || '',
    address: offerData.address?.trim() || '',
    quantity: Number(offerData.quantity) || 1,
    redeemedCount: 0,
    minimumPurchase:
      Number(offerData.minimumPurchase) || 0,
    active: true,
    creatorId: currentUser.id,
    creatorName:
      currentUser.name || 'Пользователь',
    createdAt: now,
    updatedAt: now,
  }

  writeStorage(OFFERS_KEY, [
    newOffer,
    ...offers,
  ])

  return newOffer
}

export function togglePartnerOffer(offerId) {
  const offers = getPartnerOffers()
  let updatedOffer = null

  const updatedOffers = offers.map((offer) => {
    if (offer.id !== offerId) {
      return offer
    }

    updatedOffer = {
      ...offer,
      active: !offer.active,
      updatedAt: new Date().toISOString(),
    }

    return updatedOffer
  })

  if (!updatedOffer) {
    throw new Error('Предложение не найдено')
  }

  writeStorage(OFFERS_KEY, updatedOffers)

  return updatedOffer
}

export function deletePartnerOffer(offerId) {
  const coupons = refreshAllCoupons()

  const hasActiveCoupons = coupons.some(
    (coupon) =>
      coupon.offerId === offerId &&
      coupon.status === 'active'
  )

  if (hasActiveCoupons) {
    throw new Error(
      'Нельзя удалить предложение, пока существуют активные купоны'
    )
  }

  const offers = getPartnerOffers()

  writeStorage(
    OFFERS_KEY,
    offers.filter((offer) => offer.id !== offerId)
  )
}

export function redeemPartnerOffer(offerId) {
  const currentUser = getCurrentUser()
  const offer = getPartnerOfferById(offerId)

  if (!currentUser) {
    throw new Error('Пользователь не найден')
  }

  if (currentUser.role !== 'Ученик') {
    throw new Error(
      'Получать награды может только ученик'
    )
  }

  if (!offer) {
    throw new Error('Предложение не найдено')
  }

  if (!offer.active) {
    throw new Error(
      'Предложение временно недоступно'
    )
  }

  const remaining =
    Number(offer.quantity || 0) -
    Number(offer.redeemedCount || 0)

  if (remaining <= 0) {
    throw new Error('Купоны закончились')
  }

  const userPoints =
    Number(currentUser.points) || 0

  if (userPoints < offer.pointsCost) {
    throw new Error(
      `Недостаточно баллов. Нужно ${offer.pointsCost}, у вас ${userPoints}.`
    )
  }

  const coupons = refreshAllCoupons()

  const existingActiveCoupon = coupons.find(
    (coupon) =>
      coupon.studentId === currentUser.id &&
      coupon.offerId === offerId &&
      coupon.status === 'active'
  )

  if (existingActiveCoupon) {
    throw new Error(
      'У вас уже есть активный купон на это предложение'
    )
  }

  const now = new Date()
  const expiresAt = new Date(
    now.getTime() +
      COUPON_LIFETIME_MINUTES * 60 * 1000
  )

  const newCoupon = {
    id: generateId('coupon'),
    token: generateToken(),
    offerId: offer.id,
    partnerName: offer.partnerName,
    partnerCategory: offer.partnerCategory,
    offerTitle: offer.title,
    rewardType: offer.rewardType,
    discountPercent: offer.discountPercent,
    giftName: offer.giftName,
    minimumPurchase: offer.minimumPurchase,
    studentId: currentUser.id,
    studentName:
      currentUser.name || 'Ученик',
    pointsSpent: offer.pointsCost,
    status: 'active',
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    usedAt: null,
    cancelledAt: null,
    updatedAt: now.toISOString(),
  }

  writeStorage(COUPONS_KEY, [
    newCoupon,
    ...coupons,
  ])

  updateCurrentUser({
    ...currentUser,
    points: userPoints - offer.pointsCost,
  })

  return newCoupon
}

export function getCoupons() {
  return refreshAllCoupons()
}

export function getCouponById(couponId) {
  return (
    getCoupons().find(
      (coupon) => coupon.id === couponId
    ) || null
  )
}

export function getCouponByToken(token) {
  const normalizedToken = token
    ?.trim()
    .toUpperCase()

  if (!normalizedToken) {
    return null
  }

  return (
    getCoupons().find(
      (coupon) =>
        coupon.token.toUpperCase() ===
        normalizedToken
    ) || null
  )
}

export function getStudentCoupons(studentId) {
  return getCoupons().filter(
    (coupon) => coupon.studentId === studentId
  )
}

export function cancelCoupon(couponId) {
  const currentUser = getCurrentUser()
  const coupons = getCoupons()

  const coupon = coupons.find(
    (item) => item.id === couponId
  )

  if (!currentUser) {
    throw new Error('Пользователь не найден')
  }

  if (!coupon) {
    throw new Error('Купон не найден')
  }

  if (coupon.studentId !== currentUser.id) {
    throw new Error(
      'Вы не можете отменить чужой купон'
    )
  }

  if (coupon.status !== 'active') {
    throw new Error(
      'Отменить можно только активный купон'
    )
  }

  const updatedCoupon = {
    ...coupon,
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  writeStorage(
    COUPONS_KEY,
    coupons.map((item) =>
      item.id === couponId
        ? updatedCoupon
        : item
    )
  )

  updateCurrentUser({
    ...currentUser,
    points:
      (Number(currentUser.points) || 0) +
      Number(coupon.pointsSpent || 0),
  })

  return updatedCoupon
}

export function validateCouponToken(token) {
  const coupon = getCouponByToken(token)

  if (!coupon) {
    return {
      valid: false,
      reason: 'Купон с таким кодом не найден',
      coupon: null,
    }
  }

  if (coupon.status === 'used') {
    return {
      valid: false,
      reason: 'Купон уже был использован',
      coupon,
    }
  }

  if (coupon.status === 'expired') {
    return {
      valid: false,
      reason: 'Срок действия купона истёк',
      coupon,
    }
  }

  if (coupon.status === 'cancelled') {
    return {
      valid: false,
      reason: 'Купон был отменён учеником',
      coupon,
    }
  }

  if (coupon.status !== 'active') {
    return {
      valid: false,
      reason: 'Купон недействителен',
      coupon,
    }
  }

  return {
    valid: true,
    reason: 'Купон действителен',
    coupon,
  }
}

export function useCouponToken(token) {
  const validation = validateCouponToken(token)

  if (!validation.valid) {
    throw new Error(validation.reason)
  }

  const coupons = getCoupons()
  const coupon = validation.coupon

  const updatedCoupon = {
    ...coupon,
    status: 'used',
    usedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  writeStorage(
    COUPONS_KEY,
    coupons.map((item) =>
      item.id === coupon.id
        ? updatedCoupon
        : item
    )
  )

  const offers = getPartnerOffers()

  writeStorage(
    OFFERS_KEY,
    offers.map((offer) =>
      offer.id === coupon.offerId
        ? {
            ...offer,
            redeemedCount:
              Number(offer.redeemedCount || 0) + 1,
            updatedAt: new Date().toISOString(),
          }
        : offer
    )
  )

  return updatedCoupon
}

export function getPartnerStatistics() {
  const offers = getPartnerOffers()
  const coupons = getCoupons()

  return {
    offersCount: offers.length,

    activeOffersCount: offers.filter(
      (offer) => offer.active
    ).length,

    activeCouponsCount: coupons.filter(
      (coupon) => coupon.status === 'active'
    ).length,

    usedCouponsCount: coupons.filter(
      (coupon) => coupon.status === 'used'
    ).length,

    expiredCouponsCount: coupons.filter(
      (coupon) => coupon.status === 'expired'
    ).length,

    cancelledCouponsCount: coupons.filter(
      (coupon) => coupon.status === 'cancelled'
    ).length,

    totalPointsSpent: coupons
      .filter((coupon) => coupon.status === 'used')
      .reduce(
        (sum, coupon) =>
          sum + Number(coupon.pointsSpent || 0),
        0
      ),
  }
}