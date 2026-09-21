# CY//MATCH

Matcha is a 42 dating application built with Next.js, React, Tailwind CSS,
PostgreSQL and Socket.io. The CyberLife theme is a visual layer; the mandatory
Matcha requirements remain authoritative.

## Prerequisites

- Node.js 20.9 or newer
- npm
- PostgreSQL 16 or newer, or the local embedded PostgreSQL development script

## Local setup

1. Install the locked dependencies:

   ```sh
   npm ci
   ```

2. Copy `.env.example` to `.env` and replace every placeholder, especially
   `JWT_SECRET`, the Resend values and the sender address.

3. Start PostgreSQL in one terminal, if you do not use a system PostgreSQL:

   ```sh
   npm run db:start
   ```

4. Apply the database schema:

   ```sh
   npm run db:migrate
   ```

5. Start the application in another terminal:

   ```sh
   npm run dev
   ```

The application listens on `http://localhost:3000` by default.

## Available checks

```sh
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

## Security rules

- Never commit `.env` or real credentials.
- Passwords are hashed with bcrypt.
- All SQL queries must be parameterized.
- Validate every request on the server, including every upload.
- State-changing routes must apply CSRF protection and rate limiting.

## Evaluation readiness

The evaluation database must contain at least 500 distinct profiles. A seed
