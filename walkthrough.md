# Walkthrough

Короткий сценарий проверки локального MVP после `docker compose up --build`.

## 1. Старт сервисов

```bash
docker compose ps
```

Ожидаемо:

- `yacheyka_db` healthy;
- `yacheyka_minio` healthy;
- `yacheyka_backend` running on `localhost:4002`;
- `yacheyka_frontend` running on `localhost:3002`.

## 2. Основной экран

1. Откройте http://localhost:3002.
2. Если Telegram env-переменные еще не заполнены, ожидаемо появится экран `Вход только через Telegram`.
3. После настройки `TELEGRAM_BOT_TOKEN`, `AUTH_SESSION_SECRET` и `VITE_TELEGRAM_BOT_USERNAME` войдите через Telegram Login Widget или откройте Mini App из Telegram.
4. Проверьте, что после входа видна темная карта Новосибирска.
5. На desktop список заведений находится слева, карта справа.
6. На mobile нажмите `Открыть подборки`, чтобы открыть список.

Ожидаемо: список показывает seeded-заведения и редакторские подборки.

## 3. Карточка заведения

1. Выберите заведение из списка или на карте.
2. Проверьте compact-карточку снизу.
3. Раскройте карточку кнопкой со стрелкой вверх.
4. Проверьте вкладки `О заведении`, `Народный вайб`, `События сегодня`.

Ожидаемо: реакции, описание, галерея, контакты и маршрут доступны без ошибок.

## 4. Реакции

1. В карточке нажмите `Хочу пойти`.
2. Нажмите `Не моё место`.
3. Проверьте, что эти реакции взаимоисключаются.

Ожидаемо: реакции сохраняются за текущим Telegram-пользователем из server-verified session token.

## 5. Админка

1. Войдите Telegram-пользователем @nick_luzhkov, id `1859857121`.
2. Нажмите `Админка CRUD`.
3. Выберите существующее заведение.
4. Измените текстовое поле и сохраните.
5. Проверьте, что изменения появились на карте/в карточке после обновления данных.
6. Попробуйте загрузить изображение через поля gallery/cover/hero.

Ожидаемо: файл попадает в MinIO, а frontend получает публичный URL.

Для любого другого Telegram-пользователя кнопка админки не отображается, а backend admin endpoints возвращают `403`.

## 6. MinIO

1. Откройте http://localhost:9001.
2. Войдите как `minioadmin` / `minioadmin`.
3. Проверьте bucket `yacheyka-gallery`.

Ожидаемо: bucket создан автоматически, загруженные файлы доступны по публичным URL через `localhost:9000`.

## 7. API smoke

```bash
curl -s http://localhost:4002/api/venues
curl -s http://localhost:4002/api/collections
curl -s http://localhost:4002/api/events
```

Ожидаемо: endpoints возвращают JSON без ошибок.

Защищенные endpoints должны отвечать без token:

```bash
curl -i http://localhost:4002/api/analytics
```

Ожидаемо: `401 Unauthorized` при настроенном `AUTH_SESSION_SECRET`.
