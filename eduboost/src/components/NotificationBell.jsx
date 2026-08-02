import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

import {
  getUnreadCount,
  getUserNotifications,
  markNotificationAsRead,
} from '../services/notificationService'

function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [isOpen, setIsOpen] =
    useState(false)

  const [notifications, setNotifications] =
    useState([])

  function loadNotifications() {
    setNotifications(
      getUserNotifications(user.id),
    )
  }

  useEffect(() => {
    loadNotifications()

    const interval = setInterval(
      loadNotifications,
      3000,
    )

    return () => clearInterval(interval)
  }, [user.id])

  const unreadCount = getUnreadCount(user.id)

  function openNotification(notification) {
    markNotificationAsRead(
      notification.id,
      user.id,
    )

    loadNotifications()
    setIsOpen(false)

    navigate(notification.link || '/')
  }

  return (
    <div className="notification-wrapper">
      <button
        type="button"
        className="notification-bell"
        onClick={() =>
          setIsOpen((value) => !value)
        }
      >
        🔔

        {unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount > 99
              ? '99+'
              : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <div>
              <strong>Уведомления</strong>

              <p>
                Непрочитанных: {unreadCount}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                navigate('/notifications')
              }}
            >
              Все
            </button>
          </div>

          <div className="notification-preview-list">
            {notifications.length === 0 && (
              <p className="notification-empty">
                Уведомлений пока нет.
              </p>
            )}

            {notifications
              .slice(0, 5)
              .map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  className={
                    notification.isRead
                      ? 'notification-preview'
                      : 'notification-preview unread'
                  }
                  onClick={() =>
                    openNotification(
                      notification,
                    )
                  }
                >
                  <span className="notification-type-icon">
                    {getNotificationIcon(
                      notification.type,
                    )}
                  </span>

                  <div>
                    <strong>
                      {notification.title}
                    </strong>

                    <p>
                      {notification.message}
                    </p>

                    <small>
                      {formatNotificationDate(
                        notification.createdAt,
                      )}
                    </small>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getNotificationIcon(type) {
  const icons = {
    task: '📝',
    submission: '📤',
    approved: '✅',
    rejected: '🔄',
    grade: '📘',
    attendance: '📅',
    achievement: '🏆',
    streak: '🔥',
    warning: '⚠️',
    reward: '🎁',
    info: '🔔',
  }

  return icons[type] || '🔔'
}

function formatNotificationDate(date) {
  const notificationDate = new Date(date)
  const now = new Date()

  const difference =
    now - notificationDate

  const minutes = Math.floor(
    difference / 60000,
  )

  if (minutes < 1) {
    return 'Только что'
  }

  if (minutes < 60) {
    return `${minutes} мин. назад`
  }

  const hours = Math.floor(
    minutes / 60,
  )

  if (hours < 24) {
    return `${hours} ч. назад`
  }

  return notificationDate.toLocaleDateString(
    'ru-RU',
  )
}

export default NotificationBell