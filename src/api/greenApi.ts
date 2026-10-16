import type { Credentials } from '../types.ts'

const API_URL = 'https://api.green-api.com'
// GET and DELETE calls are retried on network errors; the API is occasionally slow to connect
const NETWORK_ATTEMPTS = 3
// For unknown idInstance the API accepts the connection and never answers
const LOGIN_TIMEOUT_MS = 25000

export type StateInstance =
  | 'authorized'
  | 'notAuthorized'
  | 'blocked'
  | 'sleepMode'
  | 'starting'
  | 'yellowCard'

export type CheckAccountResult = {
  exist: boolean
  chatId: string
}

export type InstanceSettings = {
  incomingWebhook: string
}

export type SenderData = {
  chatId: string
  chatName?: string
  senderName?: string
  senderContactName?: string
  senderPhoneNumber?: number
}

export type MessageData = {
  typeMessage: string
  textMessageData?: { textMessage: string }
  extendedTextMessageData?: { text: string }
}

export type NotificationBody = {
  typeWebhook: string
  timestamp?: number
  idMessage?: string
  senderData?: SenderData
  messageData?: MessageData
}

export type Notification = {
  receiptId: number
  body: NotificationBody
}

export class GreenApiError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'GreenApiError'
    this.status = status
  }
}

type Method = 'GET' | 'POST' | 'DELETE'

type RequestOptions = {
  method?: Method
  body?: unknown
  signal?: AbortSignal
  /** Give up on a single attempt after this many milliseconds. */
  timeoutMs?: number
  /** Overrides the default number of attempts. */
  attempts?: number
}

const describeStatus = (status: number): string => {
  switch (status) {
    case 400:
      return 'Некорректный запрос'
    case 401:
    case 403:
      return 'Неверный idInstance или apiTokenInstance'
    case 429:
      return 'Слишком много запросов, попробуйте позже'
    case 466:
    case 469:
      return 'Превышен лимит проверок номеров, попробуйте позже'
    default:
      return `Ошибка сервера (${status})`
  }
}

export const createGreenApi = ({ idInstance, apiTokenInstance }: Credentials) => {
  const buildUrl = (method: string, query = '') =>
    `${API_URL}/waInstance${idInstance}/${method}/${apiTokenInstance}${query}`

  const request = async <T>(
    url: string,
    {
      method = 'GET',
      body,
      signal,
      timeoutMs,
      attempts: requestedAttempts,
    }: RequestOptions = {},
  ): Promise<T | null> => {
    // POST is not retried: a lost response could otherwise send a message twice
    const attempts =
      requestedAttempts ?? (method === 'POST' ? 1 : NETWORK_ATTEMPTS)
    let response: Response | null = null

    for (let attempt = 1; attempt <= attempts && !response; attempt++) {
      const attemptSignal = timeoutMs
        ? AbortSignal.any(
            signal
              ? [signal, AbortSignal.timeout(timeoutMs)]
              : [AbortSignal.timeout(timeoutMs)],
          )
        : signal

      try {
        response = await fetch(url, {
          method,
          signal: attemptSignal,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        })
      } catch (error) {
        if (signal?.aborted) throw error
        if (attempt === attempts) {
          throw new GreenApiError('Нет соединения с GREEN-API')
        }
      }
    }

    if (!response) throw new GreenApiError('Нет соединения с GREEN-API')

    if (!response.ok) {
      throw new GreenApiError(describeStatus(response.status), response.status)
    }

    const text = await response.text()
    if (!text || text === 'null') return null
    return JSON.parse(text) as T
  }

  const getStateInstance = async (signal?: AbortSignal) => {
    const result = await request<{ stateInstance: StateInstance }>(
      buildUrl('getStateInstance'),
      { signal, timeoutMs: LOGIN_TIMEOUT_MS, attempts: 1 },
    )
    if (!result) throw new GreenApiError('Пустой ответ сервера')
    return result.stateInstance
  }

  const getSettings = async (signal?: AbortSignal) => {
    const result = await request<InstanceSettings>(buildUrl('getSettings'), {
      signal,
    })
    if (!result) throw new GreenApiError('Пустой ответ сервера')
    return result
  }

  const checkAccount = async (phoneNumber: number) => {
    const result = await request<CheckAccountResult>(buildUrl('checkAccount'), {
      method: 'POST',
      body: { phoneNumber },
    })
    if (!result) throw new GreenApiError('Пустой ответ сервера')
    return result
  }

  const sendMessage = async (chatId: string, message: string) => {
    const result = await request<{ idMessage: string }>(buildUrl('sendMessage'), {
      method: 'POST',
      body: { chatId, message },
    })
    if (!result) throw new GreenApiError('Пустой ответ сервера')
    return result.idMessage
  }

  // With an empty queue the server waits for receiveTimeout and answers
  // 408 with no body, so that status means "nothing new", not a failure.
  const receiveNotification = async (signal: AbortSignal) => {
    try {
      return await request<Notification>(
        buildUrl('receiveNotification', '?receiveTimeout=10'),
        { signal },
      )
    } catch (error) {
      if (error instanceof GreenApiError && error.status === 408) return null
      throw error
    }
  }

  const deleteNotification = (receiptId: number, signal?: AbortSignal) =>
    request<{ result: boolean }>(
      `${buildUrl('deleteNotification')}/${receiptId}`,
      { method: 'DELETE', signal },
    )

  return {
    getStateInstance,
    getSettings,
    checkAccount,
    sendMessage,
    receiveNotification,
    deleteNotification,
  }
}

export type GreenApi = ReturnType<typeof createGreenApi>
