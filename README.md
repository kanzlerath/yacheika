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

3. Поднимите проект:

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

- `GET /api/venues` - список заведений с фильтрами `category`, `tag`, `search`, `userLat`, `userLng`.
- `GET /api/venues/:id` - карточка заведения.
- `POST /api/venues` - создание или обновление заведения.
- `DELETE /api/venues/:id` - удаление заведения.
- `POST /api/venues/:id/react` - реакции `like`, `not_my_place`, `vibe_tag`.
- `GET /api/events` и `POST /api/events` - события.
- `GET /api/collections` и `POST /api/collections` - подборки.
- `GET /api/analytics` и `POST /api/analytics` - сбор MVP-аналитики.
- `POST /api/storage/upload` - загрузка файла в MinIO.

## Админка

Админка встроена во frontend и открывается кнопкой `Админка CRUD` в шапке приложения. В ней можно редактировать заведения, координаты, галереи, premium-оформление, события и смотреть поток аналитики.

## Текущие ограничения MVP

- Авторизация Telegram пока представлена dev-симулятором пользователей.
- TypeORM `synchronize` включен для локальной разработки.
- Frontend сейчас на Vite/React, хотя исходное ТЗ допускает дальнейшее решение по Next.js.
- Расписание заведений хранится текстом, поэтому фильтр "открыто сейчас" требует отдельного улучшения.
