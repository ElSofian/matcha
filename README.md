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

2. Start PostgreSQL in one terminal, if you do not use a system PostgreSQL:

   ```sh
   npm run db:start
   ```

3. In a second terminal, initialize the local environment, migrate the schema,
   create the 500 fixtures and run the static checks:

   ```sh
   npm run setup
   ```

   The command creates `.env` with a local JWT secret when it does not exist.
   Configure the Resend values in `.env` before testing actual emails.

4. Start the application in that second terminal:

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

`npm run db:fame:refresh` recalculates the public rating from received likes,
mutual likes and unique profile visitors from the last 30 days.

## Main routes

- `/discover`: compatible-profile suggestions and advanced search.
- `/activity`: visits, received likes and notifications.
- `/messages`: mutual connections and real-time chat.
- `/profile`: profile, photos, tags and email settings.

## Security rules

- Never commit `.env` or real credentials.
- Passwords are hashed with bcrypt.
- All SQL queries must be parameterized.
- Validate every request on the server, including every upload.
- State-changing routes must apply CSRF protection and rate limiting.

## Evaluation readiness

The evaluation database must contain at least 500 distinct profiles. `npm run
db:seed` creates those fixtures and the local test account:

- username: `demo-unit`
- password: `MatchaDemo!42`
