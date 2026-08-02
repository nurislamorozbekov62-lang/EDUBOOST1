import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    setNotifications(
      getUserNotifications(user.id),
    )
  }

  useEffect(() => {
    loadNotifications()
  }, [user.id])

  const visibleNotifications =
    notifications.filter((notification) => {
      if (filter === 'unread') {
        return !notification.isRead
      }

      if (filter === 'read') {
        return notification.isRead
      }

      return true
    })

  function openNotification(notification) {
    markNotificationAsRead(
      notification.id,
      user.id,
    )

    loadNotifications()
    navigate(notification.link || '/')
  }

  function readAll() {
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
    const confirmed = window.confirm(
      'Удалить все уведомления?',
    )

    if (!confirmed) {
      return
    }

    clearUserNotifications(user.id)
    loadNotifications()
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Уведомления</h1>

          <p>
            Задания, оценки, посещаемость и
            результаты
          </p>
        </div>

        <div className="notification-page-actions">
          <button
            type="button"
            className="primary-small-button"
            onClick={readAll}
          >
            Прочитать все
          </button>

          <button
            type="button"
            className="reject-button"
            onClick={clearAll}
          >
            Очистить
          </button>
        </div>
      </header>

      <div className="notification-filters">
        <button
          type="button"
          className={
            filter === 'all'
              ? 'notification-filter active'
              : 'notification-filter'
          }
          onClick={() => setFilter('all')}
        >
          Все ({notifications.length})
        </button>

        <button
          type="button"
          className={
            filter === 'unread'
              ? 'notification-filter active'
              : 'notification-filter'
          }
          onClick={() =>
            setFilter('unread')
          }
        >
          Непрочитанные (
          {
            notifications.filter(
              (item) => !item.isRead,
            ).length
          }
          )
        </button>

        <button
          type="button"
          className={
            filter === 'read'
              ? 'notification-filter active'
              : 'notification-filter'
          }
          onClick={() =>
            setFilter('read')
          }
        >
          Прочитанные
        </button>
      </div>

      <section className="content-card">
        <div className="notification-page-list">
          {visibleNotifications.length ===
            0 && (
            <div className="notification-page-empty">
              <span>🔔</span>

              <h2>
                Уведомлений не найдено
              </h2>

              <p>
                Здесь будут появляться новые
                задания, оценки и результаты.
              </p>
            </div>
          )}

          {visibleNotifications.map(
            (notification) => (
              <article
                key={notification.id}
                className={
                  notification.isRead
                    ? 'notification-page-item'
                    : 'notification-page-item unread'
                }
                onClick={() =>
                  openNotification(
                    notification,
                  )
                }
              >
                <div className="notification-page-icon">
                  {getNotificationIcon(
                    notification.type,
                  )}
                </div>

                <div className="notification-page-main">
                  <strong>
                    {notification.title}
                  </strong>

                  <p>
                    {notification.message}
                  </p>

                  <span>
                    {new Date(
                      notification.createdAt,
                    ).toLocaleString(
                      'ru-RU',
                    )}
                  </span>
                </div>

                {!notification.isRead && (
                  <span className="notification-unread-dot" />
                )}

                <button
                  type="button"
                  className="notification-delete"
                  onClick={(event) =>
                    removeNotification(
                      event,
                      notification.id,
                    )
                  }
                >
                  Удалить
                </button>
              </article>
            ),
          )}
        </div>
      </section>
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

export default NotificationsPage