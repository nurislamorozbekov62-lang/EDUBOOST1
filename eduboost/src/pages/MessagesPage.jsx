import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  CheckCheck,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  Smile,
  UserRound,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'

const STORAGE_KEY = 'eduboost_chat_messages'

const demoContacts = [
  {
    id: 'teacher-1',
    name: 'Айгуль Садыкова',
    role: 'Учитель математики',
    online: true,
  },
  {
    id: 'teacher-2',
    name: 'Данияр Токтосунов',
    role: 'Учитель информатики',
    online: false,
  },
  {
    id: 'student-1',
    name: 'Нурбек Алиев',
    role: 'Одноклассник',
    online: true,
  },
]

function MessagesPage() {
  const { user } = useAuth()

  const [contacts] = useState(demoContacts)
  const [selectedContactId, setSelectedContactId] =
    useState(demoContacts[0].id)

  const [search, setSearch] = useState('')
  const [messageText, setMessageText] = useState('')
  const [messages, setMessages] = useState([])
  const [mobileChatOpen, setMobileChatOpen] =
    useState(false)

  const messagesEndRef = useRef(null)

  useEffect(() => {
    const storedMessages = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[]',
    )

    if (storedMessages.length > 0) {
      setMessages(storedMessages)
      return
    }

    const initialMessages = [
      {
        id: crypto.randomUUID(),
        contactId: 'teacher-1',
        senderId: 'teacher-1',
        text: 'Здравствуйте! Не забудьте отправить отчёт по домашнему заданию.',
        createdAt: new Date(
          Date.now() - 1000 * 60 * 40,
        ).toISOString(),
        isRead: true,
      },
      {
        id: crypto.randomUUID(),
        contactId: 'teacher-1',
        senderId: user.id,
        text: 'Здравствуйте! Хорошо, отправлю сегодня.',
        createdAt: new Date(
          Date.now() - 1000 * 60 * 35,
        ).toISOString(),
        isRead: true,
      },
      {
        id: crypto.randomUUID(),
        contactId: 'teacher-2',
        senderId: 'teacher-2',
        text: 'Материалы нового урока уже доступны в разделе курсов.',
        createdAt: new Date(
          Date.now() - 1000 * 60 * 90,
        ).toISOString(),
        isRead: false,
      },
    ]

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(initialMessages),
    )

    setMessages(initialMessages)
  }, [user.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages, selectedContactId])

  const selectedContact = contacts.find(
    (contact) =>
      contact.id === selectedContactId,
  )

  const visibleContacts = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return contacts
    }

    return contacts.filter((contact) => {
      return (
        contact.name.toLowerCase().includes(query) ||
        contact.role.toLowerCase().includes(query)
      )
    })
  }, [contacts, search])

  const currentMessages = useMemo(() => {
    return messages
      .filter(
        (message) =>
          message.contactId === selectedContactId,
      )
      .sort(
        (firstMessage, secondMessage) =>
          new Date(firstMessage.createdAt) -
          new Date(secondMessage.createdAt),
      )
  }, [messages, selectedContactId])

  function getLastMessage(contactId) {
    return messages
      .filter(
        (message) =>
          message.contactId === contactId,
      )
      .sort(
        (firstMessage, secondMessage) =>
          new Date(secondMessage.createdAt) -
          new Date(firstMessage.createdAt),
      )[0]
  }

  function getUnreadCount(contactId) {
    return messages.filter(
      (message) =>
        message.contactId === contactId &&
        message.senderId === contactId &&
        !message.isRead,
    ).length
  }

  function selectContact(contactId) {
    setSelectedContactId(contactId)
    setMobileChatOpen(true)

    const updatedMessages = messages.map(
      (message) =>
        message.contactId === contactId
          ? {
              ...message,
              isRead: true,
            }
          : message,
    )

    saveMessages(updatedMessages)
  }

  function saveMessages(updatedMessages) {
    setMessages(updatedMessages)

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedMessages),
    )
  }

  function sendMessage(event) {
    event.preventDefault()

    const cleanText = messageText.trim()

    if (!cleanText || !selectedContact) {
      return
    }

    const newMessage = {
      id: crypto.randomUUID(),
      contactId: selectedContact.id,
      senderId: user.id,
      text: cleanText,
      createdAt: new Date().toISOString(),
      isRead: true,
    }

    saveMessages([...messages, newMessage])
    setMessageText('')
  }

  if (!user) {
    return null
  }

  return (
    <div className="messages-page">
      <header className="messages-page-header">
        <div className="messages-page-header-icon">
          <MessageCircle size={28} />
        </div>

        <div>
          <p>Общение</p>
          <h1>Сообщения</h1>

          <span>
            Общайтесь с учителями и
            одноклассниками.
          </span>
        </div>
      </header>

      <section className="messages-layout">
        <aside
          className={
            mobileChatOpen
              ? 'messages-sidebar messages-sidebar--hidden'
              : 'messages-sidebar'
          }
        >
          <div className="messages-sidebar-heading">
            <div>
              <p>Диалоги</p>
              <h2>Сообщения</h2>
            </div>

            <span>{contacts.length}</span>
          </div>

          <label className="messages-search">
            <Search size={18} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Найти диалог..."
            />
          </label>

          <div className="messages-contacts-list">
            {visibleContacts.map((contact) => {
              const lastMessage =
                getLastMessage(contact.id)

              const unreadCount =
                getUnreadCount(contact.id)

              return (
                <button
                  type="button"
                  key={contact.id}
                  className={
                    selectedContactId === contact.id
                      ? 'messages-contact messages-contact--active'
                      : 'messages-contact'
                  }
                  onClick={() =>
                    selectContact(contact.id)
                  }
                >
                  <ContactAvatar
                    name={contact.name}
                    online={contact.online}
                  />

                  <div className="messages-contact-main">
                    <div className="messages-contact-top">
                      <strong>{contact.name}</strong>

                      <span>
                        {lastMessage
                          ? formatMessageTime(
                              lastMessage.createdAt,
                            )
                          : ''}
                      </span>
                    </div>

                    <div className="messages-contact-bottom">
                      <p>
                        {lastMessage?.text ||
                          contact.role}
                      </p>

                      {unreadCount > 0 && (
                        <span className="messages-unread-count">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <section
          className={
            mobileChatOpen
              ? 'messages-chat messages-chat--open'
              : 'messages-chat'
          }
        >
          {selectedContact ? (
            <>
              <header className="messages-chat-header">
                <button
                  type="button"
                  className="messages-back-button"
                  onClick={() =>
                    setMobileChatOpen(false)
                  }
                  aria-label="Назад"
                >
                  <ArrowLeft size={20} />
                </button>

                <ContactAvatar
                  name={selectedContact.name}
                  online={selectedContact.online}
                />

                <div className="messages-chat-person">
                  <strong>
                    {selectedContact.name}
                  </strong>

                  <span>
                    {selectedContact.online
                      ? 'В сети'
                      : selectedContact.role}
                  </span>
                </div>

                <button
                  type="button"
                  className="messages-more-button"
                  aria-label="Дополнительные действия"
                >
                  <MoreVertical size={20} />
                </button>
              </header>

              <div className="messages-chat-body">
                <div className="messages-date-divider">
                  Сегодня
                </div>

                {currentMessages.length === 0 ? (
                  <div className="messages-empty-chat">
                    <div>
                      <MessageCircle size={31} />
                    </div>

                    <h3>Начните общение</h3>

                    <p>
                      Отправьте первое сообщение
                      в этом диалоге.
                    </p>
                  </div>
                ) : (
                  currentMessages.map(
                    (message) => {
                      const isOwn =
                        message.senderId === user.id

                      return (
                        <article
                          key={message.id}
                          className={
                            isOwn
                              ? 'chat-message chat-message--own'
                              : 'chat-message'
                          }
                        >
                          <p>{message.text}</p>

                          <div>
                            <span>
                              {formatMessageTime(
                                message.createdAt,
                              )}
                            </span>

                            {isOwn && (
                              <CheckCheck size={15} />
                            )}
                          </div>
                        </article>
                      )
                    },
                  )
                )}

                <div ref={messagesEndRef} />
              </div>

              <form
                className="messages-compose"
                onSubmit={sendMessage}
              >
                <button
                  type="button"
                  className="messages-compose-icon"
                  aria-label="Прикрепить файл"
                >
                  <Paperclip size={20} />
                </button>

                <input
                  value={messageText}
                  onChange={(event) =>
                    setMessageText(
                      event.target.value,
                    )
                  }
                  placeholder="Напишите сообщение..."
                />

                <button
                  type="button"
                  className="messages-compose-icon"
                  aria-label="Смайлы"
                >
                  <Smile size={20} />
                </button>

                <button
                  type="submit"
                  className="messages-send-button"
                  disabled={!messageText.trim()}
                >
                  <Send size={19} />
                </button>
              </form>
            </>
          ) : (
            <div className="messages-empty-chat">
              <div>
                <UserRound size={31} />
              </div>

              <h3>Выберите диалог</h3>

              <p>
                Откройте контакт слева, чтобы
                начать переписку.
              </p>
            </div>
          )}
        </section>
      </section>
    </div>
  )
}

function ContactAvatar({
  name,
  online,
}) {
  return (
    <div className="messages-avatar">
      {String(name || 'П')
        .charAt(0)
        .toUpperCase()}

      {online && (
        <span className="messages-online-dot" />
      )}
    </div>
  )
}

function formatMessageTime(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default MessagesPage