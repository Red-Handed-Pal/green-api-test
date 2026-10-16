export type Credentials = {
  idInstance: string
  apiTokenInstance: string
}

export type Chat = {
  id: string
  name: string
  phone: string | null
  unread: number
}

export type MessageDirection = 'incoming' | 'outgoing'

export type Message = {
  id: string
  chatId: string
  direction: MessageDirection
  text: string
  timestamp: number
}
