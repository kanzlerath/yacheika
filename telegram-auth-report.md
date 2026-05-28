# Telegram Auth Implementation Report

## Scope

Implemented real Telegram authentication for the MVP and removed the dev user switcher from the runtime flow.

Telegram auth is now user-only. Admin access is handled by the separate `/admin` login flow backed by `admin_users`.

## Backend

- Added `AuthModule` with `GET /api/auth/telegram/start`, `GET /api/auth/telegram/callback`, `GET /api/auth/me`, and `POST /api/auth/logout`.
- Uses Telegram OAuth/OIDC Authorization Code Flow with PKCE.
- Verifies callback `state` and validates Telegram `id_token` through JWKS and claims before trusting user data.
- Stores or updates Telegram users in PostgreSQL.
- Issues a server-signed HMAC session token.
- Added guards:
  - `TelegramAuthGuard` for authenticated user actions.
  - `AdminGuard` for admin-only APIs through an httpOnly admin session cookie.
- Added `admin_users` table and `/api/admin/login`, `/api/admin/me`, `/api/admin/logout`.

Protected endpoints:

- `POST /api/venues`
- `DELETE /api/venues/:id`
- `POST /api/events`
- `DELETE /api/events/:id`
- `POST /api/collections`
- `DELETE /api/collections/:id`
- `GET /api/analytics`
- `POST /api/storage/upload`

User-bound endpoints:

- `GET /api/users/me/reactions`
- `POST /api/venues/:id/react`
- `POST /api/analytics`

## Frontend

- Replaced mock Telegram user switcher with a redirect-based Telegram login button.
- PWA mode starts login through `/api/auth/telegram/start`; OIDC state and PKCE verifier stay server-side.
- Stores the backend session token in `localStorage`.
- Sends `Authorization: Bearer <token>` only for user reactions and analytics events.
- Admin UI lives at `/admin` and is not linked from the public app.

## Environment

Required variables:

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CLIENT_ID=...
TELEGRAM_CLIENT_SECRET=...
TELEGRAM_REDIRECT_URI=https://thescope.ru/api/auth/telegram/callback
AUTH_SESSION_SECRET=...
DOMAIN_NAME=thescope.ru
ADMIN_OWNER_EMAIL=luzhkoff00@gmail.com
ADMIN_OWNER_PASSWORD_HASH=...
ADMIN_SESSION_SECRET=...
```

Frontend no longer needs Telegram build-time env variables. The backend owns the OIDC redirect, state, and token exchange.

## Verification

Commands run:

```bash
docker exec yacheyka_backend npm run build
docker exec yacheyka_frontend npm run lint
docker exec yacheyka_frontend npm run build
```

Backend admin access is no longer derived from Telegram identity. A regular Telegram session cannot call admin APIs; `/api/analytics`, CRUD endpoints, and storage upload require the admin session cookie created by `/api/admin/login`.

Browser smoke at `http://localhost:3002`:

- Page title: `Ячейка — Nightlife Navigator`.
- Login gate renders.
- Admin button is not present before authentication.
- No relevant Vite/React console errors.

## Deployment Notes

Telegram Login requires the configured bot domain to match the deployed frontend domain. For local Telegram testing, expose the app through HTTPS tunnel and set that URL in BotFather / Login settings.

Without Telegram env variables the app intentionally stays on the login gate and shows a configuration warning. There is no dev bypass in the committed auth flow.

## References

- Telegram Login: https://core.telegram.org/bots/telegram-login
