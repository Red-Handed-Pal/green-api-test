import { useState, type FormEvent } from 'react'
import type { Chat, Message } from '../types.ts'
import { Avatar } from './Avatar.tsx'

type SidebarProps = {
  idInstance: string
  chats: Chat[]
  messages: Message[]
  activeChatId: string | null
  onOpenChat: (chatId: string) => void
  onCreateChat: (phone: string) => Promise<void>
  onLogout: () => void
}

const formatTime = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })

export const Sidebar = ({
  idInstance,
  chats,
  messages,
  activeChatId,
  onOpenChat,
  onCreateChat,
  onLogout,
}: SidebarProps) => {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsCreating(true)
    try {
      await onCreateChat(phone)
      setPhone('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось создать чат')
    } finally {
      setIsCreating(false)
    }
  }

  const lastMessageOf = (chatId: string) =>
    messages.findLast((message) => message.chatId === chatId)

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <div>
          <div className="sidebar__title">Чаты</div>
          <div className="sidebar__account">Инстанс {idInstance}</div>
        </div>
        <button className="link-button" type="button" onClick={onLogout}>
          Выйти
        </button>
      </header>

      <form className="new-chat" onSubmit={handleSubmit}>
        <input
          className="new-chat__input"
          type="tel"
          placeholder="Номер телефона получателя"
          aria-label="Номер телефона получателя"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <button
          className="button button--compact"
          type="submit"
          disabled={phone.trim() === '' || isCreating}
        >
          {isCreating ? '…' : 'Создать чат'}
        </button>
        {error && <p className="new-chat__error">{error}</p>}
      </form>

      <ul className="chat-list">
        {chats.length === 0 && (
          <li className="chat-list__empty">
            Введите номер телефона, чтобы начать чат
          </li>
        )}
        {chats.map((chat) => {
          const last = lastMessageOf(chat.id)
          const isActive = chat.id === activeChatId
          return (
            <li key={chat.id}>
              <button
                type="button"
                className={`chat-item${isActive ? ' chat-item--active' : ''}`}
                onClick={() => onOpenChat(chat.id)}
              >
                <Avatar name={chat.name} />
                <span className="chat-item__body">
                  <span className="chat-item__name">{chat.name}</span>
                  <span className="chat-item__preview">
                    {last ? last.text : 'Нет сообщений'}
                  </span>
                </span>
                <span className="chat-item__meta">
                  {last && (
                    <span className="chat-item__time">
                      {formatTime(last.timestamp)}
                    </span>
                  )}
                  {chat.unread > 0 && (
                    <span className="chat-item__badge">{chat.unread}</span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
