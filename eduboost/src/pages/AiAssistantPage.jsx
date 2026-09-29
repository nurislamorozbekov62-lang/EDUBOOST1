import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  Bot,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  User,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'


/* =========================================================
   ПРИВЕТСТВИЕ
========================================================= */

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Привет! Я AI-помощник EduBoost. Помогу разобраться с учебным материалом, объясню тему простыми словами или подскажу, как решить задачу. Что хочешь изучить?',
  createdAt: new Date().toISOString(),
}


/* =========================================================
   СТРАНИЦА
========================================================= */

function AiAssistantPage() {
  const { user } = useAuth()

  const [messages, setMessages] = useState([
    WELCOME_MESSAGE,
  ])

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)


  /* =======================================================
     SCROLL TO BOTTOM
  ======================================================= */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [messages, loading])


  /* =======================================================
     AUTO-GROW TEXTAREA
  ======================================================= */

  useEffect(() => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    textarea.style.height = 'auto'

    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      160,
    )}px`
  }, [input])


  /* =======================================================
     SEND
  ======================================================= */

  async function handleSend() {
    const text = input.trim()

    if (!text || loading) {
      return
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }

    setMessages((previous) => [
      ...previous,
      userMessage,
    ])

    setInput('')
    setError('')
    setLoading(true)

    try {
      const {
        data,
        error: aiError,
      } = await supabase.functions.invoke('ai', {
        body: {
          message: text,
        },
      })

      if (aiError) {
        throw new Error(
          aiError.message ||
            'AI не смог ответить',
        )
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            'AI не смог ответить',
        )
      }

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        createdAt: new Date().toISOString(),
      }

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ])
    } catch (sendError) {
      console.error('AI:', sendError)

      setError(
        sendError?.message ||
          'Не удалось получить ответ от AI',
      )
    } finally {
      setLoading(false)
    }
  }


  /* =======================================================
     KEYBOARD
  ======================================================= */

  function handleKeyDown(event) {
    /* Отправляем по Enter, новая строка — Shift+Enter */

    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault()
      void handleSend()
    }
  }


  /* =======================================================
     RESET
  ======================================================= */

  function handleReset() {
    if (loading) {
      return
    }

    const confirmed = window.confirm(
      'Очистить всю переписку с AI?',
    )

    if (!confirmed) {
      return
    }

    setMessages([WELCOME_MESSAGE])
    setInput('')
    setError('')
  }


  /* =======================================================
     ACCESS
  ======================================================= */

  if (!user) {
    return null
  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="ai-page">

      {/* HEADER */}

      <header className="ai-header">
        <div className="ai-header-icon">
          <Sparkles size={26} />
        </div>

        <div className="ai-header-content">
          <p className="ai-header-eyebrow">
            AI-помощник
          </p>

          <h1>EduBoost AI</h1>

          <p className="ai-header-description">
            Задай вопрос по учёбе — объясню
            простыми словами и помогу разобраться.
          </p>
        </div>

        <button
          type="button"
          className="ai-reset-button"
          onClick={handleReset}
          disabled={loading}
          title="Очистить переписку"
          aria-label="Очистить переписку"
        >
          <RotateCcw size={18} />
        </button>
      </header>


      {/* CHAT */}

      <section className="ai-chat">

        <div className="ai-messages">

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
            />
          ))}

          {loading && (
            <div className="ai-message ai-message--assistant">

              <div className="ai-avatar ai-avatar--assistant">
                <Bot size={18} />
              </div>

              <div className="ai-message-bubble">
                <Loader2
                  size={18}
                  className="ai-spinner"
                />

                <span className="ai-typing">
                  AI думает...
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="ai-error">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>


        {/* INPUT */}

        <form
          className="ai-input-row"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSend()
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) =>
              setInput(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Спроси что-нибудь по учёбе..."
            rows={1}
            disabled={loading}
            maxLength={2000}
          />

          <button
            type="submit"
            className="ai-send-button"
            disabled={
              loading || !input.trim()
            }
            aria-label="Отправить"
            title="Отправить"
          >
            <Send size={19} />
          </button>
        </form>

        <p className="ai-hint">
          Enter — отправить. Shift + Enter — новая строка.
        </p>

      </section>

      <style>{AI_PAGE_CSS}</style>
    </div>
  )
}


/* =========================================================
   MESSAGE BUBBLE
========================================================= */

function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  return (
    <div
      className={
        isUser
          ? 'ai-message ai-message--user'
          : 'ai-message ai-message--assistant'
      }
    >
      <div
        className={
          isUser
            ? 'ai-avatar ai-avatar--user'
            : 'ai-avatar ai-avatar--assistant'
        }
      >
        {isUser ? (
          <User size={18} />
        ) : (
          <Bot size={18} />
        )}
      </div>

      <div className="ai-message-bubble">
        <p>{message.content}</p>
      </div>
    </div>
  )
}


/* =========================================================
   CSS
========================================================= */

const AI_PAGE_CSS = `
.ai-page {
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
  padding: 18px;
  box-sizing: border-box;
  color: #102343;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-page * {
  box-sizing: border-box;
}


/* HEADER */

.ai-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px;
  background: linear-gradient(135deg, #ffffff, #f4f8ff);
  border: 1px solid #e5edf8;
  border-radius: 22px;
  box-shadow: 0 6px 24px rgba(31, 69, 110, 0.06);
}

.ai-header-icon {
  width: 54px;
  height: 54px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 17px;
  background: #eaf3ff;
  color: #1267e8;
}

.ai-header-content {
  flex: 1;
  min-width: 0;
}

.ai-header-eyebrow {
  margin: 0 0 4px;
  color: #1267e8;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.ai-header h1 {
  margin: 0;
  font-size: 24px;
  letter-spacing: -0.02em;
}

.ai-header-description {
  margin: 6px 0 0;
  color: #718096;
  font-size: 13px;
  line-height: 1.5;
}

.ai-reset-button {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 1px solid #dbe5f1;
  border-radius: 12px;
  background: #fff;
  color: #526b8a;
  cursor: pointer;
}

.ai-reset-button:hover:not(:disabled) {
  color: #1267e8;
  border-color: #bdd7fb;
}

.ai-reset-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}


/* CHAT */

.ai-chat {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e5ebf3;
  border-radius: 22px;
  box-shadow: 0 6px 24px rgba(31, 69, 110, 0.05);
  min-height: 440px;
}

.ai-messages {
  flex: 1;
  min-height: 300px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 6px 4px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}


/* MESSAGE */

.ai-message {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  max-width: 100%;
}

.ai-message--user {
  flex-direction: row-reverse;
}

.ai-avatar {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 11px;
}

.ai-avatar--assistant {
  background: #eaf3ff;
  color: #1267e8;
}

.ai-avatar--user {
  background: #1267e8;
  color: #fff;
}

.ai-message-bubble {
  max-width: min(78%, 520px);
  padding: 12px 14px;
  border-radius: 16px;
  background: #f4f8ff;
  border: 1px solid #e5edf8;
}

.ai-message--user .ai-message-bubble {
  background: #1267e8;
  border-color: #1267e8;
  color: #fff;
}

.ai-message-bubble p {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-message-bubble .ai-typing {
  margin-left: 8px;
  color: #718096;
  font-size: 13px;
}

.ai-message--assistant .ai-message-bubble {
  display: inline-flex;
  align-items: center;
}


/* SPINNER */

.ai-spinner {
  animation: aiSpin 1s linear infinite;
  color: #1267e8;
}

@keyframes aiSpin {
  to {
    transform: rotate(360deg);
  }
}


/* ERROR */

.ai-error {
  padding: 11px 13px;
  border-radius: 12px;
  background: #fff1f1;
  border: 1px solid #ffd2d2;
  color: #b42318;
  font-size: 13px;
}


/* INPUT */

.ai-input-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding-top: 10px;
  border-top: 1px solid #eef2f7;
}

.ai-input-row textarea {
  flex: 1;
  min-height: 46px;
  max-height: 160px;
  padding: 12px 14px;
  border: 1px solid #d8e3ef;
  border-radius: 14px;
  background: #fbfcfe;
  color: #102343;
  font: inherit;
  font-size: 14px;
  line-height: 1.45;
  resize: none;
  outline: none;
  transition: border 0.15s ease, box-shadow 0.15s ease;
}

.ai-input-row textarea:focus {
  border-color: #8db7f5;
  box-shadow: 0 0 0 3px rgba(18, 103, 232, 0.08);
}

.ai-input-row textarea:disabled {
  opacity: 0.6;
}

.ai-send-button {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 14px;
  background: #1267e8;
  color: #fff;
  cursor: pointer;
  transition: transform 0.1s ease, background 0.15s ease;
}

.ai-send-button:hover:not(:disabled) {
  background: #0f5fd7;
  transform: translateY(-1px);
}

.ai-send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-hint {
  margin: 2px 0 0;
  color: #94a3b8;
  font-size: 11px;
  text-align: right;
}


/* MOBILE */

@media (max-width: 520px) {
  .ai-page {
    padding: 12px;
  }

  .ai-header {
    padding: 16px;
    border-radius: 18px;
  }

  .ai-header h1 {
    font-size: 21px;
  }

  .ai-message-bubble {
    max-width: 88%;
  }

  .ai-messages {
    max-height: 55vh;
  }
}
`


export default AiAssistantPage