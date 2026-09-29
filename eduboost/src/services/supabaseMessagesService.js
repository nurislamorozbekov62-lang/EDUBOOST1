import {
  supabase,
  supabaseUrl,
  supabasePublishableKey,
} from '../lib/supabase'


const CHAT_BUCKET = 'chat-attachments'

const MAX_ATTACHMENT_SIZE = 10485760 // 10 MB

const SIGNED_URL_TTL = 3600 // 1 час

/* Запас: считаем URL устаревшим за 5 минут до конца. */

const URL_CACHE_BUFFER = 5 * 60 * 1000


/* =========================================================
   КЭШ ПОДПИСАННЫХ URL

   Живёт в памяти вкладки. Ключ — путь файла в Storage.
   Значение — { url, expiresAt }.
========================================================= */

const signedUrlCache = new Map()


function getCachedSignedUrl(path) {
  if (!path) {
    return null
  }

  const cached = signedUrlCache.get(path)

  if (!cached) {
    return null
  }

  if (
    cached.expiresAt <
    Date.now() + URL_CACHE_BUFFER
  ) {
    signedUrlCache.delete(path)

    return null
  }

  return cached.url
}


function setCachedSignedUrl(path, url) {
  if (!path || !url) {
    return
  }

  signedUrlCache.set(path, {
    url,
    expiresAt:
      Date.now() + SIGNED_URL_TTL * 1000,
  })
}


/* =========================================================
   NORMALIZE
========================================================= */

function cleanText(value) {
  return String(value ?? '').trim()
}


function normalizeConversation(row) {
  return {
    id: row.id,
    isGroup: Boolean(row.is_group),
    title: cleanText(row.title),
    updatedAt: row.updated_at || null,
    lastMessage: {
      body: row.last_message_body || '',
      attachmentName:
        row.last_message_attachment_name || '',
      senderId:
        row.last_message_sender_id || null,
      createdAt: row.last_message_at || null,
    },
    unreadCount: Number(row.unread_count || 0),
    otherUserId: row.other_user_id || null,
    otherUserName: cleanText(row.other_user_name),
    otherUserRole: cleanText(row.other_user_role),
    otherUserPosition: cleanText(
      row.other_user_position,
    ),
  }
}


function normalizeMessage(row, signedUrlMap = {}) {
  const path = row.attachment_url || null

  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body || '',

    attachmentPath: path,
    attachmentName: row.attachment_name || null,
    attachmentMime: row.attachment_mime || null,
    attachmentSize: row.attachment_size || null,
    attachmentSignedUrl: path
      ? signedUrlMap[path] || null
      : null,

    createdAt: row.created_at || '',
    editedAt: row.edited_at || null,
    deletedAt: row.deleted_at || null,
  }
}


function normalizeUser(row) {
  return {
    id: row.id,
    name: cleanText(row.name) || 'Без имени',
    role: cleanText(row.role),
    position: cleanText(row.position),
  }
}


/* =========================================================
   CONVERSATIONS
========================================================= */

export async function getConversations() {
  const { data, error } =
    await supabase.rpc('list_my_conversations')

  if (error) {
    throw new Error(
      error.message || 'Не удалось загрузить диалоги',
    )
  }

  return (data || []).map(normalizeConversation)
}


/* =========================================================
   MESSAGES
========================================================= */

export async function getMessages(conversationId, options = {}) {
  const { limit = 100 } = options

  if (!conversationId) {
    return []
  }

  /* Параллельно: сообщения и мои скрытия. */

  const [messagesRes, hidesRes] = await Promise.all([
    supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        body,
        attachment_url,
        attachment_name,
        attachment_mime,
        attachment_size,
        created_at,
        edited_at,
        deleted_at
      `)
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit),

    supabase
      .from('message_hides')
      .select('message_id'),
  ])

  if (messagesRes.error) {
    throw new Error(
      messagesRes.error.message ||
        'Не удалось загрузить сообщения',
    )
  }

  const hiddenIds = new Set(
    (hidesRes.data || []).map(
      (row) => row.message_id,
    ),
  )

  const rows = (messagesRes.data || [])
    .filter((row) => !hiddenIds.has(row.id))
    .reverse()

  /* Подписываем URL — сперва из кэша. */

  const paths = [
    ...new Set(
      rows
        .map((row) => row.attachment_url)
        .filter(Boolean),
    ),
  ]

  const signedUrlMap =
    paths.length > 0
      ? await signPaths(paths)
      : {}

  return rows.map((row) =>
    normalizeMessage(row, signedUrlMap),
  )
}


/* =========================================================
   SIGN URLS (с кэшем)
========================================================= */

async function signPaths(paths) {
  if (!paths || paths.length === 0) {
    return {}
  }

  const result = {}
  const toSign = []

  for (const path of paths) {
    const cached = getCachedSignedUrl(path)

    if (cached) {
      result[path] = cached
    } else {
      toSign.push(path)
    }
  }

  if (toSign.length === 0) {
    return result
  }

  const { data, error } = await supabase
    .storage
    .from(CHAT_BUCKET)
    .createSignedUrls(toSign, SIGNED_URL_TTL)

  if (error) {
    console.error('Sign attachment URLs:', error)

    return result
  }

  for (const item of data || []) {
    if (item?.path && item?.signedUrl) {
      result[item.path] = item.signedUrl
      setCachedSignedUrl(item.path, item.signedUrl)
    }
  }

  return result
}


export async function getSignedUrlForAttachment(path) {
  if (!path) {
    return null
  }

  const cached = getCachedSignedUrl(path)

  if (cached) {
    return cached
  }

  const { data, error } = await supabase
    .storage
    .from(CHAT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL)

  if (error || !data?.signedUrl) {
    console.error('Sign single attachment:', error)

    return null
  }

  setCachedSignedUrl(path, data.signedUrl)

  return data.signedUrl
}


/* =========================================================
   UPLOAD ATTACHMENT (с прогрессом)
========================================================= */

function getFileExtension(name) {
  const clean = String(name || '')

  const dot = clean.lastIndexOf('.')

  if (dot <= 0 || dot === clean.length - 1) {
    return ''
  }

  return clean
    .slice(dot + 1)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}


export async function uploadChatAttachment(
  conversationId,
  file,
  onProgress,
) {
  if (!conversationId) {
    throw new Error('Диалог не выбран')
  }

  if (!file) {
    throw new Error('Файл не выбран')
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error(
      'Файл слишком большой. Максимум 10 МБ.',
    )
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession()

  if (
    sessionError ||
    !sessionData?.session?.access_token
  ) {
    throw new Error(
      'Сессия истекла. Войдите заново.',
    )
  }

  const accessToken =
    sessionData.session.access_token

  const ext = getFileExtension(file.name)

  const uniqueId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`

  const path = `${conversationId}/${uniqueId}${
    ext ? `.${ext}` : ''
  }`

  const uploadUrl =
    `${supabaseUrl}/storage/v1/object/${CHAT_BUCKET}/${path}`

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.open('POST', uploadUrl, true)

    xhr.setRequestHeader(
      'apikey',
      supabasePublishableKey,
    )

    xhr.setRequestHeader(
      'Authorization',
      `Bearer ${accessToken}`,
    )

    xhr.setRequestHeader('x-upsert', 'false')

    xhr.setRequestHeader(
      'Content-Type',
      file.type || 'application/octet-stream',
    )

    xhr.upload.onprogress = (event) => {
      if (!onProgress) {
        return
      }

      if (event.lengthComputable) {
        const percent = Math.round(
          (event.loaded / event.total) * 100,
        )

        onProgress(percent)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) {
          onProgress(100)
        }

        resolve()

        return
      }

      let message = 'Не удалось загрузить файл'

      try {
        const body = JSON.parse(xhr.responseText)

        if (body?.message) {
          message = body.message
        } else if (body?.error) {
          message = body.error
        }
      } catch {
        /* ignore */
      }

      reject(new Error(message))
    }

    xhr.onerror = () => {
      reject(
        new Error(
          'Сеть недоступна. Не удалось загрузить файл.',
        ),
      )
    }

    xhr.ontimeout = () => {
      reject(
        new Error('Превышено время загрузки файла.'),
      )
    }

    xhr.send(file)
  })

  return {
    path,
    name: file.name,
    mime: file.type || '',
    size: file.size,
  }
}


/* =========================================================
   SEND MESSAGE
========================================================= */

export async function sendMessage(
  conversationId,
  body,
  user,
  attachment = null,
) {
  const cleanBody = cleanText(body)

  if (!conversationId) {
    throw new Error('Диалог не выбран')
  }

  if (!cleanBody && !attachment) {
    throw new Error('Сообщение пустое')
  }

  if (!user?.id) {
    throw new Error('Пользователь не найден')
  }

  if (cleanBody.length > 4000) {
    throw new Error(
      'Сообщение слишком длинное (максимум 4000 символов)',
    )
  }

  const payload = {
    conversation_id: conversationId,
    sender_id: user.id,
    body: cleanBody,
  }

  if (attachment) {
    payload.attachment_url = attachment.path
    payload.attachment_name = attachment.name
    payload.attachment_mime = attachment.mime
    payload.attachment_size = attachment.size
  }

  const { data, error } = await supabase
    .from('messages')
    .insert(payload)
    .select(`
      id,
      conversation_id,
      sender_id,
      body,
      attachment_url,
      attachment_name,
      attachment_mime,
      attachment_size,
      created_at,
      edited_at,
      deleted_at
    `)
    .single()

  if (error) {
    throw new Error(
      error.message || 'Не удалось отправить сообщение',
    )
  }

  const signedUrlMap = {}

  if (data.attachment_url) {
    const url = await getSignedUrlForAttachment(
      data.attachment_url,
    )

    if (url) {
      signedUrlMap[data.attachment_url] = url
    }
  }

  return normalizeMessage(data, signedUrlMap)
}


/* =========================================================
   DELETE MESSAGE (soft delete для всех)
========================================================= */

export async function deleteMessage(messageId) {
  if (!messageId) {
    throw new Error('Сообщение не найдено')
  }

  const { data: target, error: readError } =
    await supabase
      .from('messages')
      .select('id, attachment_url')
      .eq('id', messageId)
      .maybeSingle()

  if (readError) {
    throw new Error(
      readError.message ||
        'Не удалось найти сообщение',
    )
  }

  if (!target) {
    throw new Error('Сообщение не найдено')
  }

  const { error: updateError } = await supabase
    .from('messages')
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq('id', messageId)

  if (updateError) {
    throw new Error(
      updateError.message ||
        'Не удалось удалить сообщение',
    )
  }

  if (target.attachment_url) {
    signedUrlCache.delete(target.attachment_url)

    const { error: storageError } = await supabase
      .storage
      .from(CHAT_BUCKET)
      .remove([target.attachment_url])

    if (storageError) {
      console.error(
        'Storage delete failed:',
        storageError,
      )
    }
  }

  return true
}


/* =========================================================
   HIDE MESSAGE FOR ME
========================================================= */

export async function hideMessageForMe(
  messageId,
  user,
) {
  if (!messageId) {
    throw new Error('Сообщение не найдено')
  }

  if (!user?.id) {
    throw new Error('Пользователь не найден')
  }

  const { error } = await supabase
    .from('message_hides')
    .insert({
      user_id: user.id,
      message_id: messageId,
    })

  if (error) {
    const message = String(
      error.message || '',
    ).toLowerCase()

    /* Уже скрыто — не ошибка. */

    if (message.includes('duplicate')) {
      return true
    }

    throw new Error(
      error.message || 'Не удалось скрыть сообщение',
    )
  }

  return true
}


/* =========================================================
   MARK AS READ
========================================================= */

export async function markAsRead(
  conversationId,
  user,
) {
  if (!conversationId || !user?.id) {
    return false
  }

  const { error } = await supabase
    .from('conversation_members')
    .update({
      last_read_at: new Date().toISOString(),
    })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(
      error.message ||
        'Не удалось отметить диалог прочитанным',
    )
  }

  return true
}


/* =========================================================
   CREATE CONVERSATIONS
========================================================= */

export async function createDirectConversation(
  otherUserId,
) {
  if (!otherUserId) {
    throw new Error('Выберите собеседника')
  }

  const { data, error } = await supabase.rpc(
    'create_direct_conversation',
    { p_other_user_id: otherUserId },
  )

  if (error) {
    throw new Error(
      error.message || 'Не удалось создать диалог',
    )
  }

  return data
}


export async function createGroupConversation(
  title,
  memberIds,
) {
  const cleanTitle = cleanText(title)

  if (!cleanTitle) {
    throw new Error('Укажите название группы')
  }

  if (
    !Array.isArray(memberIds) ||
    memberIds.length === 0
  ) {
    throw new Error('Выберите участников')
  }

  const { data, error } = await supabase.rpc(
    'create_group_conversation',
    {
      p_title: cleanTitle,
      p_member_ids: memberIds,
    },
  )

  if (error) {
    throw new Error(
      error.message || 'Не удалось создать группу',
    )
  }

  return data
}


/* =========================================================
   SEARCH MESSAGEABLE USERS
========================================================= */

export async function searchMessageableUsers(
  search = '',
) {
  const { data, error } = await supabase.rpc(
    'list_messageable_users',
    { p_search: cleanText(search) },
  )

  if (error) {
    throw new Error(
      error.message || 'Не удалось найти пользователей',
    )
  }

  return (data || []).map(normalizeUser)
}