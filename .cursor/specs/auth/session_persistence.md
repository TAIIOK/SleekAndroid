# Session persistence (offline / reload)

## Description

Stored access/refresh tokens must survive app reloads and temporary network failures. The user is logged out only when the server definitively rejects the session (HTTP 401 after failed refresh), not when `/api/user/me` or token refresh fails due to offline or transient errors.

## Requirements

1. [x] On app start, if tokens exist in AsyncStorage, keep `isAuthenticated === true` even when `/api/user/me` fails for non-401 reasons.
2. [x] Clear tokens and force login only on definitive auth failure (`ApiError` with status 401).
3. [x] API client refresh must distinguish `success` / `invalid` / `network`; network failures must not call `clearTokens` or `onSessionExpired`.
4. [x] On non-401 bootstrap failure, hydrate `user` from saved accounts matching the current access token when available.
5. [x] `switchAccount` must not remove the saved account or clear tokens on network/transient errors — only on 401.

## Acceptance Criteria

- Logged in → airplane mode → kill/relaunch app → stays inside the app (not redirected to `/login`).
- Logged in → cold start with network → session restores via `/me`.
- Invalid/expired refresh rejected by server → logout and redirect to login.
- Switch account while offline → saved account is kept; no forced “session expired” removal.

## Notes

- Primary files: `src/providers/AuthProvider.tsx`, `packages/api/src/index.ts`.
- Layouts already gate on `isAuthenticated`, not `user`.
