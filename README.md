# Ячейка

PWA и Telegram Mini App-ready MVP для discovery заведений Новосибирска. Основной экран строится вокруг MapLibre-карты, карточек заведений, подборок, событий и реакций без звездочного рейтинга.

## Стек

- Frontend: React, Vite, TypeScript, Tailwind CSS 4, MapLibre GL, Motion.
- Backend: NestJS, TypeORM.
- Database: PostgreSQL 15 + PostGIS.
- Storage: MinIO / S3-compatible API.
- Runtime: Docker Compose.

## Структура

```text
frontend/            React/Vite клиент, карта, карточки, админка
backend/             NestJS API, TypeORM entities, seed, storage
docker-compose.yml   Локальная оркестрация сервисов
.env.example         Пример окружения для Docker Compose
```

## Быстрый запуск

1. Убедитесь, что установлен Docker Desktop.
2. Создайте локальный `.env` из примера:

```bash
cp .env.example .env
```

3. Для реального входа через Telegram заполните в `.env`:

- `TELEGRAM_BOT_TOKEN` - токен бота из BotFather.
- `TELEGRAM_CLIENT_ID`, `TELEGRAM_CLIENT_SECRET`, `TELEGRAM_REDIRECT_URI` - OAuth/OIDC-настройки Telegram Login. Для production redirect URI: `https://thescope.ru/api/auth/telegram/callback`.
- `AUTH_SESSION_SECRET` - длинный случайный секрет для подписи app session.
- `DOMAIN_NAME=thescope.ru` - production-домен для redirect и secure cookies.
- `ADMIN_OWNER_EMAIL=luzhkoff00@gmail.com`, `ADMIN_OWNER_PASSWORD_HASH`, `ADMIN_SESSION_SECRET` - первичный owner-доступ к `/admin`. `ADMIN_OWNER_PASSWORD_HASH` хранится как base64-encoded bcrypt hash без символов `$`.

Хэш пароля owner-аккаунта генерируется в backend-папке. Команда выводит base64-строку без символов `$`, ее и нужно вставить в GitHub Secret:

```bash
npm run admin:hash -- "your-password"
```

4. Поднимите проект:

```bash
docker compose up --build
```

При первом запуске backend создаст таблицы, подготовит MinIO bucket и наполнит базу демонстрационными заведениями, подборками, событиями, пользователями и реакциями.

## Локальные адреса

| Сервис | Адрес | Назначение |
| --- | --- | --- |
| Frontend | http://localhost:3002 | Основное приложение и встроенная админка |
| Backend API | http://localhost:4002 | NestJS REST API |
| MinIO Console | http://localhost:9001 | UI хранилища, `minioadmin` / `minioadmin` |
| MinIO API | http://localhost:9000 | S3-compatible endpoint для файлов |
| PostgreSQL | localhost:5432 | `postgres` / `postgres`, база `yacheyka` |

## Полезные команды

```bash
# Запуск в foreground
docker compose up --build

# Запуск в background
docker compose up -d --build

# Остановка контейнеров
docker compose down

# Полный сброс базы и MinIO файлов
docker compose down -v
docker compose up --build

# Логи всех сервисов
docker compose logs -f

# Логи конкретного сервиса
docker compose logs -f backend
docker compose logs -f frontend
```

## Проверка сборки

В текущем Docker-сценарии зависимости установлены внутри контейнерных volumes, поэтому проверки надежнее запускать внутри контейнеров:

```bash
docker exec yacheyka_frontend npm run lint
docker exec yacheyka_frontend npm run build
docker exec yacheyka_backend npm run build
```

## API

Основные endpoints:

- `GET /api/auth/telegram/start` - старт Telegram OAuth/OIDC Authorization Code Flow с PKCE.
- `GET /api/auth/telegram/callback` - callback из Telegram, проверяет `state`, обменивает `code` и ставит временный httpOnly cookie для получения app session.
- `GET /api/auth/me` - проверка текущей app session по `Authorization: Bearer <token>` или auth-cookie после callback.
- `POST /api/auth/logout` - очистка auth-cookie.
- `POST /api/admin/login` - вход в отдельную админку по email/password.
- `GET /api/admin/me` - проверка admin session.
- `POST /api/admin/logout` - выход из админки.
- `GET /api/venues` - список заведений с фильтрами `category`, `tag`, `search`, `userLat`, `userLng`.
- `GET /api/venues/:id` - карточка заведения.
- `POST /api/venues` - создание или обновление заведения, только admin session.
- `DELETE /api/venues/:id` - удаление заведения, только admin session.
- `POST /api/venues/:id/react` - реакции `like`, `not_my_place`, `vibe_tag`, только authenticated Telegram session.
- `GET /api/users/me/reactions` - реакции текущего Telegram-пользователя.
- `GET /api/events` - события.
- `POST /api/events` и `DELETE /api/events/:id` - управление событиями, только admin session.
- `GET /api/collections` - подборки.
- `POST /api/collections` и `DELETE /api/collections/:id` - управление подборками, только admin session.
- `GET /api/analytics` - поток аналитики, только admin session.
- `POST /api/analytics` - запись MVP-событий, только authenticated Telegram session.
- `POST /api/storage/upload` - загрузка файла в MinIO, только admin session.

## Telegram auth

Frontend больше не использует dev-переключатель пользователей. Кнопка входа отправляет пользователя на backend endpoint `/api/auth/telegram/start`, чтобы `state` и PKCE verifier не создавались и не проверялись в браузере.

Backend использует Telegram OAuth/OIDC Authorization Code Flow с PKCE, проверяет `state`, обменивает `code` на токены через `https://oauth.telegram.org/token`, валидирует `id_token` по JWKS и claims, создает или обновляет пользователя в PostgreSQL и выдает server-signed session token. Сессия больше не передается через query string; frontend получает ее через `/api/auth/me`.

Telegram auth больше не дает admin-доступ. Он используется только для пользовательских действий: реакции, лайки и пользовательский профиль.

## Админка

Админка вынесена на отдельный route `/admin` и не отображается в обычном пользовательском интерфейсе. Доступ защищен отдельной таблицей `admin_users`, bcrypt-хэшем пароля и httpOnly admin session cookie. Первый owner создается при старте backend из `ADMIN_OWNER_EMAIL` и `ADMIN_OWNER_PASSWORD_HASH`.

## Текущие ограничения MVP

- TypeORM `synchronize` включен для локальной разработки.
- Frontend сейчас на Vite/React, хотя исходное ТЗ допускает дальнейшее решение по Next.js.
- Расписание заведений хранится текстом, поэтому фильтр "открыто сейчас" требует отдельного улучшения.
- Без заполненных Telegram OIDC env-переменных вход через Telegram не стартует.
