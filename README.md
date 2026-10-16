# Чат MAX на GREEN-API

Минимальный веб-интерфейс для отправки и получения текстовых сообщений в мессенджере MAX через сервис [GREEN-API](https://green-api.com/max). Внешний вид ориентирован на [web.max.ru](https://web.max.ru/).

Стек: React 19, TypeScript, Vite. Дополнительных библиотек нет.

Онлайн-версия: https://red-handed-pal.github.io/green-api-test/

## Что умеет

- Вход по `idInstance` и `apiTokenInstance` из личного кабинета GREEN-API (проверяется состояние инстанса `authorized`).
- Создание чата по номеру телефона получателя (метод `checkAccount` возвращает `chatId`).
- Отправка текстовых сообщений — метод [SendMessage](https://green-api.com/v3/docs/api/sending/SendMessage/).
- Получение сообщений через HTTP API: [ReceiveNotification](https://green-api.com/v3/docs/api/receiving/technology-http-api/ReceiveNotification/) и [DeleteNotification](https://green-api.com/v3/docs/api/receiving/technology-http-api/DeleteNotification/).
- Список чатов с превью, временем и счётчиком непрочитанных; история сохраняется в `localStorage`.

## Требования

- Node.js 20.19+ или 22.12+
- Инстанс GREEN-API для MAX в статусе «Авторизован»
- В настройках инстанса включены уведомления `incomingWebhook` (для ответов собеседника) и `outgoingAPIMessageWebhook` / `outgoingWebhook` (чтобы сообщения, отправленные с телефона, тоже попадали в чат). Поле `webhookUrl` должно быть пустым, так как используется HTTP API.

Если `incomingWebhook` выключен, приложение покажет предупреждение. Включить уведомления можно в личном кабинете либо методом [SetSettings](https://green-api.com/v3/docs/api/account/SetSettings/); новые настройки применяются в течение нескольких минут.

## Локальный запуск

```bash
npm install
npm run dev
```

Приложение откроется на `http://localhost:5173`.

Другие команды:

```bash
npm run build     # проверка типов и production-сборка в dist/
npm run preview   # локальный просмотр сборки
npm run lint      # oxlint
```

## Деплой

Сайт публикуется на GitHub Pages workflow-ом [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): при каждом пуше в `master` запускаются `npm ci`, `npm run lint`, `npm run build`, после чего папка `dist` выкладывается на Pages. В репозитории в **Settings → Pages → Source** должен быть выбран **GitHub Actions**. Базовый путь `/green-api-test/` включается только в CI (переменная `GITHUB_ACTIONS`), локально приложение работает с корня.

## Как пользоваться

1. Введите `idInstance` и `apiTokenInstance`, нажмите «Войти».
2. В левой колонке введите номер получателя (например, `+7 999 123-45-67`) и нажмите «Создать чат».
3. Напишите сообщение и нажмите Enter или кнопку отправки.
4. Ответ получателя появится в чате автоматически (опрос очереди уведомлений идёт в фоне).

## Структура

```
src/
  api/greenApi.ts            клиент GREEN-API (fetch, повторы для GET/DELETE)
  state/messengerReducer.ts  состояние чатов и сообщений, дедупликация по idMessage
  hooks/useMessenger.ts      polling уведомлений, создание чата, отправка, сохранение
  components/                LoginForm, Sidebar, ChatWindow, Messenger, Avatar
  phone.ts                   нормализация и форматирование номера
  storage.ts                 безопасная обёртка над localStorage
```

## Замечания

- Учётные данные хранятся в `localStorage` браузера, пока вы не нажмёте «Выйти». Запросы идут напрямую из браузера на `https://api.green-api.com`, серверной части нет.
- Поддерживаются только текстовые сообщения (`textMessage` и `extendedTextMessage`); остальные типы игнорируются.
- Номер получателя проверяется методом `checkAccount`, у которого есть лимит проверок на тарифе, поэтому уже созданный чат повторно номер не проверяет.
- Допустимы российские (+7) и белорусские (+375) номера.
