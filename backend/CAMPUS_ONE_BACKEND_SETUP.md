# Campus One Backend Setup

This backend now supports Campus One server-side SSO bridging while preserving
the app's existing JWT authorization flow.

## What was added

- `GET /auth/campus/session`
  - Validates the incoming Campus One cookie server-side
  - Creates or updates a local user record
  - Creates missing local `students` or `staff` records when needed
  - Issues the app's normal JWT access token and refresh cookie

- `GET /auth/campus/debug`
  - Returns diagnostics for whether the request contains a cookie header
  - Attempts Campus One validation without mutating local records
  - Reports whether an existing local user match was found

- `POST /auth/refresh`
  - Falls back to Campus One cookie bootstrap when the app's local refresh
    cookie is not present yet

## Required environment variables

These are now supported by the backend settings:

- `CAMPUS_ONE_SESSION_URL`
- `CAMPUS_ONE_PROFILE_URL`
- `CAMPUS_ONE_SIGN_IN_URL`
- `CAMPUS_ONE_TIMEOUT_SECONDS`
- `CORS_ORIGINS`

See `.env.example` for the current expected format.

## Important deployment requirement

Campus One uses a cookie scoped to `.builtbysalih.com`. Browser-based SSO will
only work when the request reaching this backend is sent from a domain that can
receive and forward that cookie.

Testing on `localhost` is useful for code verification, but it often cannot
prove full cookie-based SSO because the browser usually will not send the
Campus One cookie to `localhost`.

## Recommended test flow

1. Sign into Campus One in the browser.
2. Call `GET /auth/campus/debug`.
3. Confirm:
   - `has_cookie_header` is `true`
   - `session_valid` is `true`
4. Call `GET /auth/campus/session`.
5. Confirm:
   - a local user was created or updated
   - a local `students` or `staff` record exists
   - a local refresh token row exists

## Role mapping behavior

- Campus `student` -> local `student`
- Campus `staff` -> local `staff`
- Campus `admin` -> local admin staff

For new Campus staff users, the backend defaults the local `staff_type` to
`psychologist` so existing counselor-protected backend behavior continues to
work unless a more specific local staff record already exists.

## Matching behavior

When a Campus user signs in, the backend tries to match local users in this
order:

1. Local `users.id` equals Campus `user.id`
2. Local `users.email` equals Campus `user.email`

If no match is found, a new local user is created.
