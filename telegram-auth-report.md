# Telegram Auth Implementation Report

## Scope

Implemented real Telegram authentication for the MVP and removed the dev user switcher from the runtime flow.

Admin access is limited to:

- Telegram id: `1859857121`
- Telegram username: `nick_luzhkov`

## Backend

- Added `AuthModule` with `GET /api/auth/telegram/start`, `GET /api/auth/telegram/callback`, `GET /api/auth/me`, and `POST /api/auth/logout`.
- Uses Telegram OAuth/OIDC Authorization Code Flow with PKCE.
- Verifies callback `state` and validates Telegram `id_token` through JWKS and claims before trusting user data.
- Stores or updates Telegram users in PostgreSQL.
- Issues a server-signed HMAC session token.
- Added guards:
  - `TelegramAuthGuard` for authenticated user actions.
  - `AdminGuard` for admin-only APIs.

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
- Sends `Authorization: Bearer <token>` for reactions, analytics, admin CRUD and image uploads.
- Shows the `Админка CRUD` button only when backend returns `isAdmin=true`.

## Environment

Required variables:

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CLIENT_ID=...
TELEGRAM_CLIENT_SECRET=...
TELEGRAM_REDIRECT_URI=https://thescope.ru/api/auth/telegram/callback
AUTH_SESSION_SECRET=...
DOMAIN_NAME=thescope.ru
ADMIN_TELEGRAM_ID=1859857121
ADMIN_TELEGRAM_USERNAME=nick_luzhkov
```

Frontend no longer needs Telegram build-time env variables. The backend owns the OIDC redirect, state, and token exchange.

## Verification

Commands run:

```bash
docker exec yacheyka_backend npm run build
docker exec yacheyka_frontend npm run lint
docker exec yacheyka_frontend npm run build
```

Backend auth smoke with a temporary test token:

- Valid Telegram Login Widget signature accepted.
- Modified signature rejected.
- Admin login for `1859857121 / nick_luzhkov` returned `isAdmin=true`.
- Regular Telegram user returned `isAdmin=false`.
- `GET /api/analytics` without token returned `401`.
- `GET /api/analytics` with regular user token returned `403`.
- `GET /api/analytics` with admin token returned `200`.
- `POST /api/venues/:id/react` with authenticated user token returned `201`.

Browser smoke at `http://localhost:3002`:

- Page title: `Ячейка — Nightlife Navigator`.
- Login gate renders.
- Admin button is not present before authentication.
- No relevant Vite/React console errors.

## Deployment Notes

Telegram Login Widget requires the configured bot domain to match the deployed frontend domain. For local Telegram Mini App testing, expose `localhost:3002` through HTTPS tunnel and set that URL in BotFather / Mini App settings.

Without Telegram env variables the app intentionally stays on the login gate and shows a configuration warning. There is no dev bypass in the committed auth flow.

## References

- Telegram Mini Apps validation: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
- Telegram Login Widget authorization check: https://core.telegram.org/widgets/login#checking-authorization
