import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  ArrowLeft,
  CheckCheck,
  FileText,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Plus,
  Search,
  Send,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  supabase,
} from '../lib/supabase'

import {
  createDirectConversation,
  deleteMessage,
  getConversations,
  getMessages,
  getSignedUrlForAttachment,
  hideMessageForMe,
  markAsRead,
  searchMessageableUsers,
  sendMessage as sendMessageService,
  uploadChatAttachment,
} from '../services/supabaseMessagesService'


const MAX_ATTACHMENT_SIZE = 10485760 // 10 MB

const ACCEPT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
].join(',')


function MessagesPage() {
  const { user } = useAuth()

  const [conversations, setConversations] =
    useState([])

  const [messages, setMessages] =
    useState([])

  const [
    selectedConversationId,
    setSelectedConversationId,
  ] = useState('')

  const [search, setSearch] = useState('')
  const [messageText, setMessageText] =
    useState('')

  const [
    mobileChatOpen,
    setMobileChatOpen,
  ] = useState(false)

  const [loadingConversations, setLoadingConversations] =
    useState(true)

  const [loadingMessages, setLoadingMessages] =
    useState(false)

  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const [
    composerOpen,
    setComposerOpen,
  ] = useState(false)

  const [
    contactQuery,
    setContactQuery,
  ] = useState('')

  const [
    contactResults,
    setContactResults,
  ] = useState([])

  const [
    loadingContacts,
    setLoadingContacts,
  ] = useState(false)

  const [
    pendingAttachment,
    setPendingAttachment,
  ] = useState(null)

  const [
    pendingAttachmentPreview,
    setPendingAttachmentPreview,
  ] = useState('')

  const [
    uploadProgress,
    setUploadProgress,
  ] = useState(null)

  const [
    deletingMessageId,
    setDeletingMessageId,
  ] = useState(null)

  const fileInputRef = useRef(null)

  const messagesEndRef = useRef(null)
  const messagesBoxRef = useRef(null)

  const conversationsReloadTimerRef =
    useRef(null)


  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    if (!user?.id) {
      return
    }

    void loadConversations()
  }, [user?.id])


  useEffect(() => {
    if (
      !selectedConversationId ||
      !user?.id
    ) {
      setMessages([])
      return
    }

    void loadMessages(selectedConversationId)

    void markAsRead(
      selectedConversationId,
      user,
    ).then(() => {
      setConversations((previous) =>
        previous.map((c) =>
          c.id === selectedConversationId
            ? { ...c, unreadCount: 0 }
            : c,
        ),
      )
    })
  }, [
    selectedConversationId,
    user?.id,
  ])


  /* =======================================================
     SCROLL TO BOTTOM
  ======================================================= */

  useEffect(() => {
    if (messages.length === 0) {
      return
    }

    const element = messagesEndRef.current

    if (!element) {
      return
    }

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [messages])


  /* =======================================================
     HIDE ERROR AFTER 4s
  ======================================================= */

  useEffect(() => {
    if (!error) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setError('')
    }, 4000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [error])


  /* =======================================================
     PREVIEW OBJECT URL CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      if (pendingAttachmentPreview) {
        URL.revokeObjectURL(pendingAttachmentPreview)
      }
    }
  }, [pendingAttachmentPreview])


  /* =======================================================
     REALTIME — MESSAGES IN OPEN CHAT
  ======================================================= */

  useEffect(() => {
    if (!selectedConversationId || !user?.id) {
      return undefined
    }

    const channel = supabase
      .channel(
        `messages-${selectedConversationId}`,
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter:
            `conversation_id=eq.${selectedConversationId}`,
        },
        async (payload) => {
          const row = payload?.new

          if (!row) {
            return
          }

          if (row.sender_id === user.id) {
            return
          }

          let signedUrl = null

          if (row.attachment_url) {
            signedUrl = await getSignedUrlForAttachment(
              row.attachment_url,
            )
          }

          setMessages((previous) => {
            if (
              previous.some(
                (message) => message.id === row.id,
              )
            ) {
              return previous
            }

            return [
              ...previous,
              normalizeRealtimeMessage(row, signedUrl),
            ]
          })

          void markAsRead(
            selectedConversationId,
            user,
          )
        },
      )
      .subscribe()


    return () => {
      void supabase.removeChannel(channel)
    }
  }, [
    selectedConversationId,
    user?.id,
  ])


  /* =======================================================
     REALTIME — CONVERSATIONS LIST (DEBOUNCED)
  ======================================================= */

  useEffect(() => {
    if (!user?.id) {
      return undefined
    }

    const channel = supabase
      .channel(
        `conversations-list-${user.id}`,
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          if (
            conversationsReloadTimerRef.current
          ) {
            window.clearTimeout(
              conversationsReloadTimerRef.current,
            )
          }

          conversationsReloadTimerRef.current =
            window.setTimeout(() => {
              void loadConversations({
                silent: true,
              })
            }, 500)
        },
      )
      .subscribe()


    return () => {
      if (
        conversationsReloadTimerRef.current
      ) {
        window.clearTimeout(
          conversationsReloadTimerRef.current,
        )
      }

      void supabase.removeChannel(channel)
    }
  }, [user?.id])


  /* =======================================================
     LOAD CONVERSATIONS
  ======================================================= */

  async function loadConversations(options = {}) {
    const { silent = false } = options

    try {
      if (!silent) {
        setLoadingConversations(true)
      }

      const rows = await getConversations()

      setConversations(rows)
    } catch (loadError) {
      if (!silent) {
        setError(
          loadError?.message ||
            'Не удалось загрузить диалоги',
        )
      }
    } finally {
      if (!silent) {
        setLoadingConversations(false)
      }
    }
  }


  /* =======================================================
     LOAD MESSAGES
  ======================================================= */

  async function loadMessages(conversationId) {
    try {
      setLoadingMessages(true)
      setError('')

      const rows = await getMessages(conversationId)

      setMessages(rows)
    } catch (loadError) {
      setError(
        loadError?.message ||
          'Не удалось загрузить сообщения',
      )
    } finally {
      setLoadingMessages(false)
    }
  }


  /* =======================================================
     ATTACHMENT HANDLING
  ======================================================= */

  function handleAttachmentClick() {
    fileInputRef.current?.click()
  }


  function handleAttachmentChange(event) {
    const file = event.target.files?.[0]

    event.target.value = ''

    if (!file) {
      return
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError(
        'Файл слишком большой. Максимум 10 МБ.',
      )

      return
    }

    if (pendingAttachmentPreview) {
      URL.revokeObjectURL(pendingAttachmentPreview)
    }

    setPendingAttachment(file)

    if (file.type.startsWith('image/')) {
      setPendingAttachmentPreview(
        URL.createObjectURL(file),
      )
    } else {
      setPendingAttachmentPreview('')
    }
  }


  function clearPendingAttachment() {
    if (pendingAttachmentPreview) {
      URL.revokeObjectURL(pendingAttachmentPreview)
    }

    setPendingAttachment(null)
    setPendingAttachmentPreview('')
    setUploadProgress(null)
  }


  /* =======================================================
     SEND
  ======================================================= */

  async function handleSend(event) {
    event.preventDefault()

    if (!user?.id) {
      return
    }

    const clean = messageText.trim()

    if (!selectedConversationId) {
      return
    }

    if (!clean && !pendingAttachment) {
      return
    }

    try {
      setSending(true)
      setError('')

      let attachment = null

      if (pendingAttachment) {
        setUploadProgress(0)

        attachment = await uploadChatAttachment(
          selectedConversationId,
          pendingAttachment,
          (percent) => setUploadProgress(percent),
        )
      }

      const savedMessage = await sendMessageService(
        selectedConversationId,
        clean,
        user,
        attachment,
      )

      setMessageText('')
      clearPendingAttachment()

      if (savedMessage?.id) {
        setMessages((previous) => {
          if (
            previous.some(
              (m) => m.id === savedMessage.id,
            )
          ) {
            return previous
          }

          return [...previous, savedMessage]
        })
      }

      void loadConversations({ silent: true })
    } catch (sendError) {
      setError(
        sendError?.message ||
          'Не удалось отправить сообщение',
      )
    } finally {
      setSending(false)
      setUploadProgress(null)
    }
  }


  /* =======================================================
     DELETE / HIDE MESSAGE
  ======================================================= */

  async function handleDeleteMessage(message) {
    if (!message?.id || !user?.id) {
      return
    }

    const isOwn = message.senderId === user.id

    const confirmed = window.confirm(
      isOwn
        ? 'Удалить это сообщение? Оно исчезнет у вас и у собеседника.'
        : 'Удалить это сообщение у себя? Собеседник его всё равно увидит.',
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingMessageId(message.id)
      setError('')

      if (isOwn) {
        await deleteMessage(message.id)
      } else {
        await hideMessageForMe(
          message.id,
          user,
        )
      }

      setMessages((previous) =>
        previous.filter((m) => m.id !== message.id),
      )

      void loadConversations({ silent: true })
    } catch (deleteError) {
      setError(
        deleteError?.message ||
          'Не удалось удалить сообщение',
      )
    } finally {
      setDeletingMessageId(null)
    }
  }


  /* =======================================================
     SELECT CONVERSATION
  ======================================================= */

  function selectConversation(id) {
    setSelectedConversationId(id)
    setMobileChatOpen(true)
    clearPendingAttachment()
  }


  /* =======================================================
     NEW CHAT MODAL
  ======================================================= */

  async function openComposer() {
    setComposerOpen(true)
    setContactQuery('')
    setError('')

    try {
      setLoadingContacts(true)

      const rows = await searchMessageableUsers('')

      setContactResults(rows)
    } catch (loadError) {
      setError(
        loadError?.message ||
          'Не удалось загрузить пользователей',
      )
    } finally {
      setLoadingContacts(false)
    }
  }


  async function handleContactSearch(value) {
    setContactQuery(value)

    try {
      setLoadingContacts(true)

      const rows = await searchMessageableUsers(value)

      setContactResults(rows)
    } catch (loadError) {
      setError(
        loadError?.message ||
          'Не удалось найти пользователей',
      )
    } finally {
      setLoadingContacts(false)
    }
  }


  async function startDirectChat(otherUserId) {
    try {
      setError('')

      const conversationId =
        await createDirectConversation(otherUserId)

      setComposerOpen(false)
      setContactQuery('')
      setContactResults([])

      await loadConversations({ silent: true })

      selectConversation(conversationId)
    } catch (createError) {
      setError(
        createError?.message ||
          'Не удалось создать диалог',
      )
    }
  }


  /* =======================================================
     DERIVED
  ======================================================= */

  const visibleConversations = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return conversations
    }

    return conversations.filter((c) => {
      const name = c.isGroup
        ? c.title
        : c.otherUserName

      return String(name || '')
        .toLowerCase()
        .includes(query)
    })
  }, [conversations, search])


  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (c) => c.id === selectedConversationId,
      ) || null,
    [conversations, selectedConversationId],
  )


  const selectedTitle = selectedConversation
    ? selectedConversation.isGroup
      ? selectedConversation.title
      : selectedConversation.otherUserName || 'Диалог'
    : ''

  const selectedSubtitle = selectedConversation
    ? selectedConversation.isGroup
      ? 'Групповой чат'
      : selectedConversation.otherUserPosition ||
        selectedConversation.otherUserRole ||
        ''
    : ''


  /* =======================================================
     RENDER
  ======================================================= */

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
            Общайтесь с учителями, одноклассниками
            и родителями.
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

            <button
              type="button"
              className="messages-compose-icon"
              aria-label="Новый диалог"
              onClick={openComposer}
            >
              <Plus size={18} />
            </button>
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
            {loadingConversations ? (
              <div className="messages-empty-chat">
                <p>Загрузка диалогов...</p>
              </div>
            ) : visibleConversations.length === 0 ? (
              <div className="messages-empty-chat">
                <div>
                  <MessageCircle size={31} />
                </div>

                <h3>Диалогов пока нет</h3>

                <p>
                  Нажмите «+», чтобы начать
                  новую переписку.
                </p>
              </div>
            ) : (
              visibleConversations.map((c) => {
                const title = c.isGroup
                  ? c.title
                  : c.otherUserName || 'Диалог'

                const subtitle = c.isGroup
                  ? 'Групповой чат'
                  : c.otherUserPosition ||
                    c.otherUserRole ||
                    ''

                const previewText =
                  c.lastMessage?.body ||
                  (c.lastMessage?.attachmentName
                    ? `📎 ${c.lastMessage.attachmentName}`
                    : subtitle)

                const lastAt =
                  c.lastMessage?.createdAt

                return (
                  <button
                    type="button"
                    key={c.id}
                    className={
                      selectedConversationId === c.id
                        ? 'messages-contact messages-contact--active'
                        : 'messages-contact'
                    }
                    onClick={() =>
                      selectConversation(c.id)
                    }
                  >
                    <ContactAvatar name={title} />

                    <div className="messages-contact-main">
                      <div className="messages-contact-top">
                        <strong>{title}</strong>

                        <span>
                          {lastAt
                            ? formatListTime(lastAt)
                            : ''}
                        </span>
                      </div>

                      <div className="messages-contact-bottom">
                        <p>{previewText}</p>

                        {c.unreadCount > 0 && (
                          <span className="messages-unread-count">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <section
          className={
            mobileChatOpen
              ? 'messages-chat messages-chat--open'
              : 'messages-chat'
          }
        >
          {selectedConversation ? (
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

                <ContactAvatar name={selectedTitle} />

                <div className="messages-chat-person">
                  <strong>{selectedTitle}</strong>
                  <span>{selectedSubtitle}</span>
                </div>

                <button
                  type="button"
                  className="messages-more-button"
                  aria-label="Дополнительные действия"
                  disabled
                >
                  <MoreVertical size={20} />
                </button>
              </header>

              <div
                className="messages-chat-body"
                ref={messagesBoxRef}
              >
                {loadingMessages ? (
                  <div className="messages-empty-chat">
                    <p>Загрузка сообщений...</p>
                  </div>
                ) : messages.length === 0 ? (
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
                  messages.map((m) => {
                    const isOwn = m.senderId === user.id
                    const isDeleting =
                      deletingMessageId === m.id

                    return (
                      <article
                        key={m.id}
                        className={
                          isOwn
                            ? 'chat-message chat-message--own'
                            : 'chat-message'
                        }
                      >
                        <MessageAttachment message={m} />

                        {m.body && <p>{m.body}</p>}

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent:
                              'flex-end',
                            gap: 5,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteMessage(m)
                            }
                            disabled={isDeleting}
                            aria-label={
                              isOwn
                                ? 'Удалить сообщение'
                                : 'Удалить у себя'
                            }
                            title={
                              isOwn
                                ? 'Удалить сообщение'
                                : 'Удалить у себя'
                            }
                            style={{
                              width: 22,
                              height: 22,
                              display: 'grid',
                              placeItems: 'center',
                              padding: 0,
                              border: 0,
                              borderRadius: 7,
                              background: isOwn
                                ? 'rgba(255,255,255,0.18)'
                                : 'rgba(15,23,42,0.06)',
                              color: isOwn
                                ? 'inherit'
                                : '#64748b',
                              cursor: isDeleting
                                ? 'wait'
                                : 'pointer',
                              opacity: isDeleting
                                ? 0.5
                                : 0.85,
                            }}
                          >
                            <Trash2 size={12} />
                          </button>

                          <span>
                            {formatMessageTime(
                              m.createdAt,
                            )}
                          </span>

                          {isOwn && (
                            <CheckCheck size={15} />
                          )}
                        </div>
                      </article>
                    )
                  })
                )}

                <div ref={messagesEndRef} />
              </div>

              {pendingAttachment && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 14px',
                    borderTop: '1px solid #e6edf5',
                    background: '#f8fbff',
                  }}
                >
                  {pendingAttachmentPreview ? (
                    <img
                      src={pendingAttachmentPreview}
                      alt=""
                      style={{
                        width: 42,
                        height: 42,
                        objectFit: 'cover',
                        borderRadius: 10,
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: 10,
                        background: '#eef5ff',
                        color: '#2563eb',
                        flexShrink: 0,
                      }}
                    >
                      <FileText size={20} />
                    </div>
                  )}

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 12,
                      color: '#102343',
                    }}
                  >
                    <div
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: 700,
                      }}
                    >
                      {pendingAttachment.name}
                    </div>

                    {sending &&
                    uploadProgress !== null ? (
                      <div
                        style={{
                          marginTop: 4,
                          color: '#2563eb',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent:
                              'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <span>Загрузка...</span>

                          <strong>
                            {uploadProgress}%
                          </strong>
                        </div>

                        <div
                          style={{
                            height: 4,
                            borderRadius: 999,
                            background: '#dbeafe',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${uploadProgress}%`,
                              height: '100%',
                              background: '#2563eb',
                              borderRadius: 999,
                              transition:
                                'width 0.15s linear',
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          color: '#718096',
                          marginTop: 2,
                        }}
                      >
                        {formatFileSize(
                          pendingAttachment.size,
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={clearPendingAttachment}
                    disabled={sending}
                    aria-label="Убрать файл"
                    style={{
                      width: 30,
                      height: 30,
                      display: 'grid',
                      placeItems: 'center',
                      border: 0,
                      borderRadius: 8,
                      background: '#eef2f7',
                      color: '#475569',
                      cursor: sending
                        ? 'not-allowed'
                        : 'pointer',
                      opacity: sending ? 0.5 : 1,
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <form
                className="messages-compose"
                onSubmit={handleSend}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_TYPES}
                  onChange={handleAttachmentChange}
                  style={{ display: 'none' }}
                />

                <button
                  type="button"
                  className="messages-compose-icon"
                  aria-label="Прикрепить файл"
                  onClick={handleAttachmentClick}
                  disabled={sending}
                >
                  <Paperclip size={20} />
                </button>

                <input
                  value={messageText}
                  onChange={(event) =>
                    setMessageText(event.target.value)
                  }
                  placeholder="Напишите сообщение..."
                  disabled={sending}
                />

                <button
                  type="submit"
                  className="messages-send-button"
                  disabled={
                    sending ||
                    (!messageText.trim() &&
                      !pendingAttachment)
                  }
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
                Откройте контакт слева или
                создайте новый через «+».
              </p>
            </div>
          )}
        </section>
      </section>

      {error && (
        <div
          className="error-message"
          style={{ marginTop: 12 }}
        >
          {error}
        </div>
      )}

      {composerOpen && (
        <div
          className="modern-task-modal"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setComposerOpen(false)
            }
          }}
        >
          <div className="modern-task-modal-card">
            <button
              type="button"
              className="modern-task-modal-close"
              onClick={() => setComposerOpen(false)}
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>

            <div className="modern-task-modal-icon">
              <MessageCircle size={22} />
            </div>

            <h2>Новый диалог</h2>

            <p className="modern-task-modal-description">
              Выберите пользователя, чтобы начать
              переписку.
            </p>

            <label className="messages-search">
              <Search size={18} />

              <input
                value={contactQuery}
                onChange={(event) =>
                  handleContactSearch(event.target.value)
                }
                placeholder="Имя или роль"
                autoFocus
              />
            </label>

            <div
              style={{
                marginTop: 12,
                maxHeight: 320,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {loadingContacts ? (
                <p style={{ color: '#718096', fontSize: 13 }}>
                  Загрузка...
                </p>
              ) : contactResults.length === 0 ? (
                <p style={{ color: '#718096', fontSize: 13 }}>
                  Никого не найдено.
                </p>
              ) : (
                contactResults.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    className="messages-contact"
                    style={{ borderRadius: 12 }}
                    onClick={() =>
                      startDirectChat(contact.id)
                    }
                  >
                    <ContactAvatar name={contact.name} />

                    <div className="messages-contact-main">
                      <div className="messages-contact-top">
                        <strong>{contact.name}</strong>
                      </div>

                      <div className="messages-contact-bottom">
                        <p>
                          {contact.position ||
                            contact.role ||
                            ''}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


/* =========================================================
   MESSAGE ATTACHMENT
========================================================= */

function MessageAttachment({ message }) {
  if (!message.attachmentPath) {
    return null
  }

  const isImage =
    typeof message.attachmentMime === 'string' &&
    message.attachmentMime.startsWith('image/')

  const url = message.attachmentSignedUrl

  if (!url) {
    return null
  }

  if (isImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'block',
          marginBottom: 8,
        }}
      >
        <img
          src={url}
          alt={message.attachmentName || ''}
          loading="lazy"
          decoding="async"
          style={{
            maxWidth: 260,
            maxHeight: 260,
            borderRadius: 10,
            display: 'block',
          }}
        />
      </a>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      download={message.attachmentName || undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        marginBottom: 8,
        borderRadius: 10,
        background: 'rgba(255,255,255,0.18)',
        color: 'inherit',
        textDecoration: 'none',
        maxWidth: 260,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.25)',
        }}
      >
        <FileText size={18} />
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 12,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {message.attachmentName || 'Файл'}
        </div>

        {message.attachmentSize ? (
          <div
            style={{
              fontSize: 10,
              opacity: 0.75,
              marginTop: 2,
            }}
          >
            {formatFileSize(message.attachmentSize)}
          </div>
        ) : null}
      </div>
    </a>
  )
}


/* =========================================================
   HELPERS
========================================================= */

function ContactAvatar({ name }) {
  return (
    <div className="messages-avatar">
      {String(name || 'П')
        .charAt(0)
        .toUpperCase()}
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


function formatListTime(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const now = new Date()

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (sameDay) {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  })
}


function formatFileSize(bytes) {
  const value = Number(bytes || 0)

  if (value < 1024) {
    return `${value} Б`
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} КБ`
  }

  return `${(value / (1024 * 1024)).toFixed(1)} МБ`
}


function normalizeRealtimeMessage(row, signedUrl) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body || '',
    attachmentPath: row.attachment_url || null,
    attachmentName: row.attachment_name || null,
    attachmentMime: row.attachment_mime || null,
    attachmentSize: row.attachment_size || null,
    attachmentSignedUrl: signedUrl || null,
    createdAt: row.created_at || '',
    editedAt: row.edited_at || null,
    deletedAt: row.deleted_at || null,
  }
}


export default MessagesPage