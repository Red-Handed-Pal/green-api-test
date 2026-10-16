import { useEffect, useRef, useState, type FormEvent } from 'react'
import { GreenApiError } from '../api/greenApi.ts'
import type { Chat, Message } from '../types.ts'
import { Avatar } from './Avatar.tsx'

type ChatWindowProps = {
  chat: Chat
  messages: Message[]
  onSend: (chatId: string, text: string) => Promise<void>
}

const MAX_LENGTH = 4000

const dayKey = (timestamp: number) =>
  new Date(timestamp * 1000).toDateString()

const formatDay = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })

const formatTime = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })

export const ChatWindow = ({ chat, messages, onSend }: ChatWindowProps) => {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [chat.id, messages.length])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || isSending) return

    setError(null)
    setIsSending(true)
    try {
      await onSend(chat.id, trimmed)
      setText('')
    } catch (caught) {
      setError(
        caught instanceof GreenApiError
          ? caught.message
          : 'Не удалось отправить сообщение',
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section className="chat">
      <header className="chat__header">
        <Avatar name={chat.name} />
        <div>
          <div className="chat__name">{chat.name}</div>
          {chat.phone && <div className="chat__sub">+{chat.phone}</div>}
        </div>
      </header>

      <div className="chat__messages">
        {messages.length === 0 && (
          <p className="chat__empty">Напишите первое сообщение</p>
        )}
        {messages.map((message, index) => {
          const previous = messages[index - 1]
          const isNewDay =
            !previous || dayKey(previous.timestamp) !== dayKey(message.timestamp)
          return (
            <div key={message.id} className="chat__row">
              {isNewDay && (
                <div className="chat__day">{formatDay(message.timestamp)}</div>
              )}
              <div
                className={`bubble bubble--${message.direction}`}
                data-direction={message.direction}
              >
                <span className="bubble__text">{message.text}</span>
                <span className="bubble__time">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {error && <p className="chat__error">{error}</p>}

      <form className="composer" onSubmit={handleSubmit}>
        <input
          className="composer__input"
          placeholder="Сообщение"
          aria-label="Сообщение"
          maxLength={MAX_LENGTH}
          autoComplete="off"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button
          className="composer__send"
          type="submit"
          aria-label="Отправить"
          disabled={text.trim() === '' || isSending}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M12 19V5M12 5l-6 6M12 5l6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </section>
  )
}
