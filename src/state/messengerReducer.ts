import { formatPhone } from '../phone.ts'
import type { Chat, Message } from '../types.ts'

export type MessengerState = {
  chats: Chat[]
  messages: Message[]
  activeChatId: string | null
}

export type ChatHint = {
  name: string | null
  phone: string | null
}

export type MessengerAction =
  | { type: 'open-chat'; chatId: string }
  | { type: 'add-chat'; chat: Chat }
  | { type: 'receive-message'; message: Message; hint: ChatHint }

const hasMessage = (messages: Message[], id: string) =>
  messages.some((message) => message.id === id)

const withChat = (chats: Chat[], chatId: string, hint: ChatHint): Chat[] => {
  const existing = chats.find((chat) => chat.id === chatId)
  if (!existing) {
    return [
      { id: chatId, name: hint.name ?? chatId, phone: hint.phone, unread: 0 },
      ...chats,
    ]
  }

  const phone = existing.phone ?? hint.phone
  const hasPlaceholderName =
    existing.phone !== null && existing.name === formatPhone(existing.phone)
  const name = hasPlaceholderName && hint.name ? hint.name : existing.name
  if (phone === existing.phone && name === existing.name) return chats

  return chats.map((chat) =>
    chat.id === chatId ? { ...chat, phone, name } : chat,
  )
}

export const messengerReducer = (
  state: MessengerState,
  action: MessengerAction,
): MessengerState => {
  switch (action.type) {
    case 'open-chat':
      return {
        ...state,
        activeChatId: action.chatId,
        chats: state.chats.map((chat) =>
          chat.id === action.chatId ? { ...chat, unread: 0 } : chat,
        ),
      }

    case 'add-chat': {
      const exists = state.chats.some((chat) => chat.id === action.chat.id)
      return {
        ...state,
        activeChatId: action.chat.id,
        chats: exists ? state.chats : [action.chat, ...state.chats],
      }
    }

    case 'receive-message': {
      const { message, hint } = action
      if (hasMessage(state.messages, message.id)) return state

      const chats = withChat(state.chats, message.chatId, hint)
      const isUnread =
        message.direction === 'incoming' && state.activeChatId !== message.chatId

      return {
        ...state,
        messages: [...state.messages, message],
        chats: isUnread
          ? chats.map((chat) =>
              chat.id === message.chatId
                ? { ...chat, unread: chat.unread + 1 }
                : chat,
            )
          : chats,
      }
    }
  }
}
