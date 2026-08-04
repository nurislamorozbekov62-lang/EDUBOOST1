import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Flame,
  Gift,
  Inbox,
  Info,
  RotateCcw,
  Send,
  Trash2,
  Trophy,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'

import {
  clearUserNotifications,
  deleteNotification,
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notificationService'

function NotificationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [notifications, setNotifications] =
    useState([])

  const [filter, setFilter] =
    useState('all')

  function loadNotifications() {
    if (!user?.id) {
      setNotifications([])
      return
    }

    setNotifications(
      getUserNotifications(user.id),
    )
  }

  useEffect(() => {
    loadNotifications()
  }, [user?.id])

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !notification.isRead,
      ).length,
    [notifications],
  )

  const readCount =
    notifications.length - unreadCount

  const visibleNotifications =
    useMemo(() => {
      return notifications.filter(
        (notification) => {
          if (filter === 'unread') {
            return !notification.isRead
          }

          if (filter === 'read') {
            return notification.isRead
          }

          return true
        },
      )
    }, [notifications, filter])

  function openNotification(notification) {
    markNotificationAsRead(
      notification.id,
      user.id,
    )

    loadNotifications()

    navigate(notification.link || '/')
  }

  function readAll() {
    if (notifications.length === 0) {
      return
    }

    markAllNotificationsAsRead(user.id)
    loadNotifications()
  }

  function removeNotification(
    event,
    notificationId,
  ) {
    event.stopPropagation()

    deleteNotification(
      notificationId,
      user.id,
    )

    loadNotifications()
  }

  function clearAll() {
    if (notifications.length === 0) {
      return
    }

    const confirmed = window.confirm(
      'Удалить все уведомления?',
    )

    if (!confirmed) {
      return
    }

    clearUserNotifications(user.id)
    loadNotifications()
  }

  if (!user) {
    return null
  }

  return (
    <div className="modern-notifications-page">
      <NotificationsHeader
        totalCount={notifications.length}
        unreadCount={unreadCount}
      />

      <NotificationsSummary
        totalCount={notifications.length}
        unreadCount={unreadCount}
        readCount={readCount}
      />

      <section className="notifications-toolbar">
        <div className="modern-notification-filters">
          <FilterButton
            label="Все"
            count={notifications.length}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />

          <FilterButton
            label="Непрочитанные"
            count={unreadCount}
            active={filter === 'unread'}
            onClick={() =>
              setFilter('unread')
            }
          />

          <FilterButton
            label="Прочитанные"
            count={readCount}
            active={filter === 'read'}
            onClick={() =>
              setFilter('read')
            }
          />
        </div>

        <div className="notifications-toolbar-actions">
          <button
            type="button"
            className="notifications-read-all-button"
            onClick={readAll}
            disabled={unreadCount === 0}
          >
            <CheckCheck size={18} />
            Прочитать все
          </button>

          <button
            type="button"
            className="notifications-clear-button"
            onClick={clearAll}
            disabled={
              notifications.length === 0
            }
          >
            <Trash2 size={18} />
            Очистить
          </button>
        </div>
      </section>

      <section className="notifications-list-section">
        <div className="notifications-section-heading">
          <div>
            <p>Центр уведомлений</p>

            <h2>
              {getFilterTitle(filter)}
            </h2>
          </div>

          <span>
            {visibleNotifications.length}
          </span>
        </div>

        {visibleNotifications.length ===
        0 ? (
          <NotificationEmptyState
            filter={filter}
          />
        ) : (
          <div className="modern-notification-list">
            {visibleNotifications.map(
              (notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={
                    notification
                  }
                  openNotification={
                    openNotification
                  }
                  removeNotification={
                    removeNotification
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

function NotificationsHeader({
  totalCount,
  unreadCount,
}) {
  return (
    <header className="modern-notifications-header">
      <div className="modern-notifications-header-icon">
        <Bell size={28} />
      </div>

      <div className="modern-notifications-header-content">
        <p>Центр событий</p>

        <h1>Уведомления</h1>

        <span>
          Задания, результаты, достижения и
          важные сообщения.
        </span>
      </div>

      <div className="modern-notifications-header-badge">
        <strong>{unreadCount}</strong>

        <span>
          новых из {totalCount}
        </span>
      </div>
    </header>
  )
}

function NotificationsSummary({
  totalCount,
  unreadCount,
  readCount,
}) {
  const cards = [
    {
      label: 'Всего',
      value: totalCount,
      icon: Inbox,
      className:
        'notification-summary-card--blue',
    },
    {
      label: 'Новых',
      value: unreadCount,
      icon: Bell,
      className:
        'notification-summary-card--orange',
    },
    {
      label: 'Прочитано',
      value: readCount,
      icon: CheckCircle2,
      className:
        'notification-summary-card--green',
    },
  ]

  return (
    <section className="notifications-summary-grid">
      {cards.map((card) => {
        const Icon = card.icon

        return (
          <article
            className={`notification-summary-card ${card.className}`}
            key={card.label}
          >
            <div className="notification-summary-icon">
              <Icon size={21} />
            </div>

            <div>
              <strong>{card.value}</strong>
              <span>{card.label}</span>
            </div>
          </article>
        )
      })}
    </section>
  )
}

function FilterButton({
  label,
  count,
  active,
  onClick,
}) {
  return (
    <button
      type="button"
      className={
        active
          ? 'modern-notification-filter modern-notification-filter--active'
          : 'modern-notification-filter'
      }
      onClick={onClick}
    >
      {label}
      <span>{count}</span>
    </button>
  )
}

function NotificationCard({
  notification,
  openNotification,
  removeNotification,
}) {
  const Icon = getNotificationIcon(
    notification.type,
  )

  const colorClass =
    getNotificationColorClass(
      notification.type,
    )

  return (
    <article
      className={
        notification.isRead
          ? 'modern-notification-card'
          : 'modern-notification-card modern-notification-card--unread'
      }
      onClick={() =>
        openNotification(notification)
      }
    >
      <div
        className={`modern-notification-icon ${colorClass}`}
      >
        <Icon size={22} />
      </div>

      <div className="modern-notification-main">
        <div className="modern-notification-title-row">
          <div>
            <span className="modern-notification-type">
              {getNotificationTypeLabel(
                notification.type,
              )}
            </span>

            <h3>
              {notification.title ||
                'Новое уведомление'}
            </h3>
          </div>

          {!notification.isRead && (
            <span className="modern-notification-new-badge">
              Новое
            </span>
          )}
        </div>

        <p>
          {notification.message ||
            'Описание уведомления не указано.'}
        </p>

        <div className="modern-notification-footer">
          <span>
            {formatNotificationDate(
              notification.createdAt,
            )}
          </span>

          <span className="modern-notification-open">
            Открыть
            <ChevronRight size={16} />
          </span>
        </div>
      </div>

      <button
        type="button"
        className="modern-notification-delete"
        onClick={(event) =>
          removeNotification(
            event,
            notification.id,
          )
        }
        aria-label="Удалить уведомление"
      >
        <Trash2 size={18} />
      </button>
    </article>
  )
}

function NotificationEmptyState({
  filter,
}) {
  const content = {
    all: {
      title: 'Уведомлений пока нет',
      text: 'Здесь будут появляться задания, результаты и важные события.',
    },
    unread: {
      title: 'Всё прочитано',
      text: 'У вас нет непрочитанных уведомлений.',
    },
    read: {
      title: 'Нет прочитанных уведомлений',
      text: 'Открытые уведомления появятся в этом разделе.',
    },
  }

  const current =
    content[filter] || content.all

  return (
    <div className="modern-notifications-empty">
      <div>
        {filter === 'unread' ? (
          <CheckCheck size={31} />
        ) : (
          <Bell size={31} />
        )}
      </div>

      <h2>{current.title}</h2>
      <p>{current.text}</p>
    </div>
  )
}

function getNotificationIcon(type) {
  const icons = {
    task: ClipboardCheck,
    submission: Send,
    approved: CheckCircle2,
    rejected: RotateCcw,
    grade: BookOpen,
    attendance: CalendarDays,
    achievement: Trophy,
    streak: Flame,
    warning: AlertTriangle,
    reward: Gift,
    info: Info,
  }

  return icons[type] || Bell
}

function getNotificationColorClass(type) {
  const classes = {
    task: 'modern-notification-icon--blue',
    submission:
      'modern-notification-icon--purple',
    approved:
      'modern-notification-icon--green',
    rejected:
      'modern-notification-icon--red',
    grade: 'modern-notification-icon--blue',
    attendance:
      'modern-notification-icon--cyan',
    achievement:
      'modern-notification-icon--gold',
    streak:
      'modern-notification-icon--orange',
    warning:
      'modern-notification-icon--red',
    reward:
      'modern-notification-icon--purple',
    info: 'modern-notification-icon--blue',
  }

  return (
    classes[type] ||
    'modern-notification-icon--blue'
  )
}

function getNotificationTypeLabel(type) {
  const labels = {
    task: 'Задание',
    submission: 'Отчёт',
    approved: 'Работа принята',
    rejected: 'Нужно исправить',
    grade: 'Оценка',
    attendance: 'Посещаемость',
    achievement: 'Достижение',
    streak: 'Серия',
    warning: 'Предупреждение',
    reward: 'Награда',
    info: 'Информация',
  }

  return labels[type] || 'Уведомление'
}

function getFilterTitle(filter) {
  const titles = {
    all: 'Все уведомления',
    unread: 'Непрочитанные',
    read: 'Прочитанные',
  }

  return titles[filter] || 'Уведомления'
}

function formatNotificationDate(value) {
  if (!value) {
    return 'Дата не указана'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  const now = new Date()
  const difference =
    now.getTime() - date.getTime()

  const minutes = Math.floor(
    difference / 60000,
  )

  const hours = Math.floor(
    difference / 3600000,
  )

  const days = Math.floor(
    difference / 86400000,
  )

  if (minutes < 1) {
    return 'Только что'
  }

  if (minutes < 60) {
    return `${minutes} мин. назад`
  }

  if (hours < 24) {
    return `${hours} ч. назад`
  }

  if (days < 7) {
    return `${days} дн. назад`
  }

  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default NotificationsPage