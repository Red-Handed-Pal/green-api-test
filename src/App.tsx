import { useState } from 'react'
import { LoginForm } from './components/LoginForm.tsx'
import { Messenger } from './components/Messenger.tsx'
import { storage } from './storage.ts'
import type { Credentials } from './types.ts'
import './App.css'

const CREDENTIALS_KEY = 'credentials'

export const App = () => {
  const [credentials, setCredentials] = useState<Credentials | null>(() =>
    storage.read<Credentials | null>(CREDENTIALS_KEY, null),
  )

  const handleLogin = (next: Credentials) => {
    storage.write(CREDENTIALS_KEY, next)
    setCredentials(next)
  }

  const handleLogout = () => {
    storage.remove(CREDENTIALS_KEY)
    setCredentials(null)
  }

  if (!credentials) return <LoginForm onLogin={handleLogin} />

  return (
    <Messenger
      key={credentials.idInstance}
      credentials={credentials}
      onLogout={handleLogout}
    />
  )
}
