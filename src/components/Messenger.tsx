import { useMessenger } from '../hooks/useMessenger.ts'
import type { Credentials } from '../types.ts'
import { ChatWindow } from './ChatWindow.tsx'
import { Sidebar } from './Sidebar.tsx'

type MessengerProps = {
  credentials: Credentials
  onLogout: () => void
}

export const Messenger = ({ credentials, onLogout }: MessengerProps) => {
  const {
    chats,
    messages,
    activeChat,
    activeMessages,
    connectionError,
    settingsWarning,
    openChat,
    createChat,
    sendMessage,
  } = useMessenger(credentials)

  const banner = connectionError ?? settingsWarning

  return (
    <div className="messenger">
      {banner && <div className="banner">{banner}</div>}
      <div className="messenger__body">
        <Sidebar
          idInstance={credentials.idInstance}
          chats={chats}
          messages={messages}
          activeChatId={activeChat?.id ?? null}
          onOpenChat={openChat}
          onCreateChat={createChat}
          onLogout={onLogout}
        />
        {activeChat ? (
          <ChatWindow
            key={activeChat.id}
            chat={activeChat}
            messages={activeMessages}
            onSend={sendMessage}
          />
        ) : (
          <section className="chat chat--placeholder">
            <p>Выберите чат или создайте новый по номеру телефона</p>
          </section>
        )}
      </div>
    </div>
  )
}
