import { useState, type FormEvent } from 'react'
import { createGreenApi, GreenApiError } from '../api/greenApi.ts'
import type { Credentials } from '../types.ts'

type LoginFormProps = {
  onLogin: (credentials: Credentials) => void
}

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const credentials = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
    }

    setError(null)
    setIsChecking(true)
    try {
      const state = await createGreenApi(credentials).getStateInstance()
      if (state !== 'authorized') {
        setError(
          'Инстанс не авторизован в MAX. Отсканируйте QR-код в личном кабинете GREEN-API.',
        )
        return
      }
      onLogin(credentials)
    } catch (caught) {
      setError(
        caught instanceof GreenApiError ? caught.message : 'Не удалось войти',
      )
    } finally {
      setIsChecking(false)
    }
  }

  const canSubmit = idInstance.trim() !== '' && apiTokenInstance.trim() !== ''

  return (
    <main className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <h1 className="login__title">Чат MAX</h1>
        <p className="login__hint">
          Введите данные инстанса из личного кабинета GREEN-API
        </p>

        <label className="field">
          <span className="field__label">idInstance</span>
          <input
            className="field__input"
            inputMode="numeric"
            autoComplete="off"
            value={idInstance}
            onChange={(event) => setIdInstance(event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">apiTokenInstance</span>
          <input
            className="field__input"
            type="password"
            autoComplete="off"
            value={apiTokenInstance}
            onChange={(event) => setApiTokenInstance(event.target.value)}
          />
        </label>

        {error && <p className="login__error">{error}</p>}

        <button
          className="button"
          type="submit"
          disabled={!canSubmit || isChecking}
        >
          {isChecking ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </main>
  )
}
