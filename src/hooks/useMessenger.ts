import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import {
  createGreenApi,
  GreenApiError,
  type NotificationBody,
} from '../api/greenApi.ts'
import { formatPhone, normalizePhone } from '../phone.ts'
import {
  messengerReducer,
  type MessengerState,
} from '../state/messengerReducer.ts'
import { storage } from '../storage.ts'
import type { Chat, Credentials, Message } from '../types.ts'

const RETRY_DELAY_MS = 3000
const EMPTY_POLL_DELAY_MS = 500

const chatsKey = (idInstance: string) => `chats:${idInstance}`
const messagesKey = (idInstance: string) => `messages:${idInstance}`

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })

const extractText = (body: NotificationBody): string | null => {
  const data = body.messageData
  if (!data) return null
  if (data.typeMessage === 'textMessage') {
    return data.textMessageData?.textMessage ?? null
  }
  if (data.typeMessage === 'extendedTextMessage') {
    return data.extendedTextMessageData?.text ?? null
  }
  return null
}

const toMessage = (body: NotificationBody): Message | null => {
  const { typeWebhook, idMessage, senderData } = body
  if (!idMessage || !senderData?.chatId) return null

  const isIncoming = typeWebhook === 'incomingMessageReceived'
  const isOutgoing =
    typeWebhook === 'outgoingMessageReceived' ||
    typeWebhook === 'outgoingAPIMessageReceived'
  if (!isIncoming && !isOutgoing) return null

  const text = extractText(body)
  if (text === null) return null

  return {
    id: idMessage,
    chatId: senderData.chatId,
    direction: isIncoming ? 'incoming' : 'outgoing',
    text,
    timestamp: body.timestamp ?? Math.floor(Date.now() / 1000),
  }
}

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof GreenApiError ? error.message : fallback

export const useMessenger = (credentials: Credentials) => {
  const { idInstance, apiTokenInstance } = credentials
  const api = useMemo(
    () => createGreenApi({ idInstance, apiTokenInstance }),
    [idInstance, apiTokenInstance],
  )

  const [state, dispatch] = useReducer(
    messengerReducer,
    idInstance,
    (id): MessengerState => ({
      chats: storage
        .read<Chat[]>(chatsKey(id), [])
        .filter((chat) => typeof chat.id === 'string' && typeof chat.name === 'string'),
      messages: storage.read<Message[]>(messagesKey(id), []),
      activeChatId: null,
    }),
  )
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [settingsWarning, setSettingsWarning] = useState<string | null>(null)

  useEffect(() => {
    storage.write(chatsKey(idInstance), state.chats)
  }, [idInstance, state.chats])

  useEffect(() => {
    storage.write(messagesKey(idInstance), state.messages)
  }, [idInstance, state.messages])

  useEffect(() => {
    const controller = new AbortController()

    api
      .getSettings(controller.signal)
      .then((settings) => {
        if (settings.incomingWebhook === 'yes') return
        setSettingsWarning(
          'В настройках инстанса выключены входящие уведомления (incomingWebhook). Ответы собеседников не будут приходить.',
        )
      })
      .catch(() => {
        // the warning is a hint only; polling reports real connection problems
      })

    return () => controller.abort()
  }, [api])

  const handleNotification = useCallback((body: NotificationBody) => {
    const message = toMessage(body)
    const sender = body.senderData
    if (!message || !sender) return

    // For outgoing notifications senderName/senderPhoneNumber describe our own
    // account, so the counterpart's details are only taken from incoming ones.
    const isIncoming = message.direction === 'incoming'
    const phone =
      isIncoming && sender.senderPhoneNumber
        ? String(sender.senderPhoneNumber)
        : null
    const name =
      (isIncoming ? sender.senderContactName || sender.senderName : null) ||
      sender.chatName ||
      (phone ? formatPhone(phone) : null)

    dispatch({ type: 'receive-message', message, hint: { name, phone } })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    const poll = async () => {
      while (!signal.aborted) {
        try {
          const notification = await api.receiveNotification(signal)
          setConnectionError(null)
          if (!notification) {
            await wait(EMPTY_POLL_DELAY_MS, signal)
            continue
          }

          handleNotification(notification.body)
          await api.deleteNotification(notification.receiptId, signal)
        } catch (error) {
          if (signal.aborted) return
          setConnectionError(errorMessage(error, 'Не удалось получить сообщения'))
          await wait(RETRY_DELAY_MS, signal)
        }
      }
    }

    void poll()
    return () => controller.abort()
  }, [api, handleNotification])

  const openChat = useCallback((chatId: string) => {
    dispatch({ type: 'open-chat', chatId })
  }, [])

  const createChat = useCallback(
    async (rawPhone: string) => {
      const phoneNumber = normalizePhone(rawPhone)
      if (phoneNumber === null) {
        throw new Error('Введите номер в формате +7 999 123-45-67')
      }

      const phone = String(phoneNumber)
      const known = state.chats.find((chat) => chat.phone === phone)
      if (known) {
        dispatch({ type: 'open-chat', chatId: known.id })
        return
      }

      const { exist, chatId } = await api.checkAccount(phoneNumber)
      if (!exist || !chatId) {
        throw new Error('Этот номер не зарегистрирован в MAX')
      }

      dispatch({
        type: 'add-chat',
        chat: { id: chatId, name: formatPhone(phone), phone, unread: 0 },
      })
    },
    [api, state.chats],
  )

  const sendMessage = useCallback(
    async (chatId: string, text: string) => {
      const idMessage = await api.sendMessage(chatId, text)
      dispatch({
        type: 'receive-message',
        message: {
          id: idMessage,
          chatId,
          direction: 'outgoing',
          text,
          timestamp: Math.floor(Date.now() / 1000),
        },
        hint: { name: null, phone: null },
      })
    },
    [api],
  )

  const activeChat = state.chats.find((chat) => chat.id === state.activeChatId)
  const activeMessages = useMemo(
    () => state.messages.filter((message) => message.chatId === state.activeChatId),
    [state.messages, state.activeChatId],
  )

  return {
    chats: state.chats,
    messages: state.messages,
    activeChat: activeChat ?? null,
    activeMessages,
    connectionError,
    settingsWarning,
    openChat,
    createChat,
    sendMessage,
  }
}
