Ячейка — Product & Technical Specification (MVP)

1. Описание проекта

Ячейка — PWA-приложение и Telegram Mini App для поиска и discovery заведений Новосибирска.

Основной UX построен вокруг карты города.

Продукт ориентирован на:

* бары;
* пабы;
* рюмочные;
* клубы;
* рестораны;
* коктейльные бары;
* винные бары;
* крафтовые заведения;
* другие вечерние и nightlife-заведения.

Главная ценность продукта:

* быстро понять атмосферу места;
* визуально исследовать город;
* находить места «куда хочется пойти сегодня»;
* получать discovery-опыт, а не справочник организаций.

Проект не должен выглядеть как аналог 2ГИС или Яндекс.Карт.

Ключевой дифференциатор:

* отсутствие платного ранжирования;
* отсутствие манипулятивного рейтинга;
* акцент на атмосфере и визуальной подаче;
* premium не влияет на честность выдачи.

⸻

2. Основные принципы продукта

2.1 Карта — главный экран

Приложение строится вокруг карты.

Карта — не утилитарный элемент, а часть визуальной идентичности продукта.

UX должен ощущаться как:

* nightlife navigator;
* городской discovery-product;
* атмосферный городской интерфейс.

Не допускается ощущение:

* корпоративного справочника;
* GIS-системы;
* стандартной карты организаций.

⸻

2.2 Визуальный стиль

Стиль:

* минимализм;
* dark-first;
* cinematic UI;
* без агрессивного неона;
* мягкие акценты;
* приглушенные цвета;
* большой акцент на фотографии.

Визуальные принципы:

* много воздуха;
* крупные изображения;
* минимум UI-шумов;
* плавные анимации;
* subtle glow;
* glassmorphism допустим умеренно.

⸻

2.3 Premium не влияет на ранжирование

Premium-заведения:

* не получают boost в выдаче;
* не получают скрытого приоритета;
* не помечаются бейджами premium.

Premium влияет только на:

* визуальную выразительность карточки;
* дополнительные контентные блоки;
* расширенные возможности презентации.

⸻

3. Платформы

3.1 Telegram Mini App

Основной entrypoint.

Функции:

* авторизация;
* запуск приложения;
* шаринг;
* deep links.

⸻

3.2 PWA

PWA существует как:

* standalone web app;
* installable app;
* fallback для пользователей вне Telegram.

Требования:

* mobile-first;
* responsive;
* поддержка iOS/Android;
* installable;
* offline shell допустим позже.

⸻

4. Аутентификация

Только Telegram authentication.

Независимо от того:

* Mini App;
* PWA.

Пользователь должен авторизовываться через Telegram.

Поля пользователя:

* telegramId;
* username;
* firstName;
* lastName;
* avatarUrl;
* createdAt.

Ограничения:

* одна реакция одного пользователя на одно заведение;
* базовая защита от накрутки.

⸻

5. Карта

5.1 Технология

Использовать:

* MapLibre GL JS.

Не использовать:

* Яндекс.Карты как основной рендер;
* 2GIS SDK как основной рендер.

Источник карт:

* OpenStreetMap tiles;
* кастомный map style.

⸻

5.2 Требования к карте

Поддержка:

* custom styles;
* custom markers;
* clustering;
* smooth zoom;
* mobile gestures;
* animated transitions.

⸻

5.3 Поведение карты

Не показывать все заведения одновременно.

Использовать:

* clustering;
* progressive reveal;
* zoom-based density.

Пример:

* на дальнем zoom — районы активности;
* средний zoom — кластеры;
* ближний zoom — отдельные заведения.

⸻

5.4 Маркеры

Не использовать стандартные pin markers.

Использовать:

* glow markers;
* minimal circular markers;
* subtle animation;
* hover expansion;
* preview cards.

⸻

6. Сущность заведения

6.1 Обязательные поля

* id;
* name;
* slug;
* category;
* shortDescription;
* fullDescription;
* address;
* latitude;
* longitude;
* workingHours;
* contacts;
* gallery;
* tags;
* status;
* createdAt;
* updatedAt.

⸻

6.2 Контакты

Поддержка:

* phone;
* Telegram;
* Instagram;
* VK;
* website.

⸻

6.3 Категории

Основная категория одна.

Примеры:

* бар;
* паб;
* ресторан;
* клуб;
* рюмочная;
* коктейльный бар;
* винный бар;
* крафтовый бар;
* кальянная.

⸻

6.4 Теги

Тегов может быть много.

Примеры:

* dog-friendly;
* живая музыка;
* DJ;
* техно;
* коктейли;
* крафт;
* свидание;
* шумно;
* тихо;
* дешево;
* дорого;
* летник;
* настолки;
* спорт-трансляции;
* afterwork;
* веранда.

Теги используются:

* в discovery;
* фильтрации;
* поиске;
* рекомендациях.

⸻

7. Карточка заведения

7.1 Бесплатная карточка

Должна содержать:

* логотип;
* gallery preview;
* описание;
* время работы;
* контакты;
* карту/маршрут;
* теги;
* реакции.

Бесплатная карточка не должна ощущаться кастрированной.

⸻

7.2 Premium карточка

Premium отличается:

* дизайном;
* кастомизацией;
* атмосферностью;
* дополнительными блоками.

Без бейджей premium.

⸻

7.3 Premium-возможности

MVP:

* custom colors;
* branded theme;
* hero image;
* расширенная галерея;
* event blocks;
* CTA blocks;
* featured drinks;
* mood/status blocks.

⸻

7.4 Mood block

Примеры:

* сегодня техно;
* живая музыка;
* quiet evening;
* happy hour;
* afterparty.

⸻

8. Реакции и рейтинг

Не использовать звездочный рейтинг.

Использовать:

* like;
* not_my_place;
* vibe-tags.

Показывать:

* количество likes;
* отношение likes/reactive feedback;
* популярные vibe-теги.

Не использовать:

* токсичные дизлайки;
* текстовые отзывы на MVP.

⸻

9. Discovery

Главный вопрос приложения:

«Куда хочется пойти сегодня?»

А не:

«Где находится заведение?»

⸻

9.1 Discovery-фильтры

Поддержка:

* nearby;
* по категориям;
* по тегам;
* по атмосфере;
* открыто сейчас;
* есть событие сегодня.

⸻

9.2 Подборки

Редакторские коллекции.

Примеры:

* вечер в центре;
* коктейльный маршрут;
* дешевые бары;
* живая музыка;
* для свидания.

Сущность:

* collection.

Поля:

* title;
* description;
* cover;
* venueIds;
* publishedAt.

⸻

10. События

На MVP события живут внутри карточки заведения.

Не делать отдельную сложную афишу.

Поддержка:

* title;
* date;
* time;
* description;
* cover image.

Фильтр:

* «сегодня есть событие».

Отдельный экран афиши — Phase 2.

⸻

11. Админка

Нужна с MVP.

11.1 Функции

* CRUD заведений;
* загрузка изображений;
* редактирование координат;
* управление premium;
* управление тегами;
* управление категориями;
* создание подборок;
* управление событиями.

⸻

11.2 Геопозиция

Flow:

* ввод адреса;
* геокодинг;
* отображение точки;
* ручная корректировка через карту.

⸻

12. Статусы заведений

Поддерживаем:

* draft;
* published;
* hidden;
* archived.

Premium:

* premiumActive;
* premiumUntil;
* premiumTheme;
* premiumConfig.

⸻

13. Аналитика

На MVP:

* только сбор событий.

Логировать:

* open venue;
* like;
* reaction;
* open route;
* click phone;
* click social;
* open event.

UI аналитики — позже.

⸻

14. Архитектура

14.1 Frontend

Stack:

* Next.js;
* TypeScript;
* TailwindCSS;
* Framer Motion;
* Zustand;
* TanStack Query;
* MapLibre GL.

⸻

14.2 Backend

Stack:

* NestJS.

Функции:

* REST API;
* Telegram auth;
* venue management;
* reactions;
* collections;
* analytics;
* admin API.

⸻

14.3 Database

Stack:

* PostgreSQL;
* PostGIS.

⸻

14.4 Storage

Использовать:

* S3-compatible storage.

Локально:

* MinIO.

⸻

14.5 Infra

Docker Compose:

* frontend;
* backend;
* postgres/postgis;
* minio.

Redis — optional.

⸻

15. API сущности

15.1 User

* id;
* telegramId;
* username;
* avatarUrl;
* createdAt.

⸻

15.2 Venue

* id;
* name;
* slug;
* categoryId;
* tags[];
* description;
* coordinates;
* gallery[];
* contacts;
* reactions;
* premiumConfig;
* createdAt.

⸻

15.3 Reaction

* id;
* userId;
* venueId;
* type;
* createdAt.

⸻

15.4 Event

* id;
* venueId;
* title;
* description;
* startAt;
* coverUrl.

⸻

15.5 Collection

* id;
* title;
* description;
* coverUrl;
* venueIds[];
* createdAt.

⸻

16. Локальная разработка

16.1 Требования

* Docker;
* Docker Compose;
* Node.js LTS.

⸻

16.2 Запуск

Команда:

docker compose up --build

Сервисы:

* frontend: localhost:3000;
* backend: localhost:4000;
* admin: localhost:3001;
* postgres;
* minio.

⸻

16.3 Telegram Mini App локально

Использовать:

* local tunnel;
* ngrok/cloudflared.

Необходимо:

* HTTPS URL;
* настройка Telegram Bot;
* Mini App URL.

⸻

17. UX-принципы

Обязательные

* mobile-first;
* минимальное количество экранов;
* быстрый доступ к заведению;
* карта всегда доступна;
* плавные анимации;
* высокая отзывчивость интерфейса.

⸻

Не делать на MVP

* комментарии;
* чат;
* полноценную соцсеть;
* текстовые отзывы;
* сложные recommendation engines;
* user-generated venues;
* бронирование столов.

⸻

18. Roadmap

MVP

* карта;
* карточки заведений;
* Telegram auth;
* реакции;
* теги;
* premium themes;
* admin panel;
* collections;
* events inside venues.

⸻

Phase 2

* отдельная афиша;
* advanced discovery;
* аналитика для заведений;
* push notifications;
* stories;
* AI recommendations;
* персонализация.

⸻

19. Product positioning

Ячейка — не справочник заведений.

Это:

* городская nightlife-карта;
* discovery-продукт;
* визуальный навигатор по атмосфере города.

Главная задача интерфейса:

Помочь пользователю быстро понять:

* какое это место;
* какая там атмосфера;
* хочется ли туда идти сегодня.