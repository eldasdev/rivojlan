# CourseHub – Online Courses Platform

A full-stack web application similar to Coursera, built with **Next.js** (App Router), **Prisma**, **PostgreSQL**, **NextAuth.js**, and **Tailwind CSS**. It supports three roles: **Students**, **Authors** (course creators), and **Administrators**.

## Features

- **User authentication**: Email/password and Google OAuth (NextAuth.js), registration, forgot/reset password
- **Role-based access**: Student dashboard, Author dashboard, Admin dashboard with protected routes
- **Courses**: Create, edit, publish; modules with text/video (YouTube/Vimeo); categories and search
- **Enrollments**: Enroll in courses, track progress (module completion, percentage), certificates on completion
- **Reviews & ratings**: Students can rate and comment on courses (when enrolled)
- **Notifications**: In-app notifications (e.g. new enrollments for authors)
- **Admin**: User management (roles), course moderation (approve/reject, publish), platform analytics

## Tech Stack

- **Frontend & Backend**: Next.js 16 (App Router), React 19
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js v5 (beta) – credentials + Google OAuth
- **Styling**: Tailwind CSS 4
- **Validation**: Zod
- **Passwords**: bcryptjs

## Setup

### 1. Clone and install

```bash
cd courses
npm install
```

### 2. Environment variables

Create a `.env` file in the project root (see `.env.example` if you add one):

```env
# Database (PostgreSQL – local, Supabase, Neon, etc.)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"

# NextAuth / Auth.js v5 (required for session to work)
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="your-secret"       # Required. e.g. run: openssl rand -base64 32
# Or for compatibility: NEXTAUTH_SECRET="your-secret"

# Google OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

### 3. Database

**Create tables first** (required before seeding):

```bash
# Generate Prisma client
npm run db:generate

# Push schema to DB (creates all tables) – good for dev
npm run db:push

# Or use migrations instead
npm run db:migrate
```

**Then seed** sample users and courses:

```bash
npm run db:seed
```

**Seed users:**

| Role   | Email                 | Password   |
|--------|------------------------|------------|
| Admin  | admin@coursehub.dev    | admin123   |
| Author | author@coursehub.dev   | author123  |
| Student| student@coursehub.dev | student123 |

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Troubleshooting: "Prisma client missing Payout model" / `prisma.payout` undefined

If the admin Revenue & Payouts page or APIs return a 500 error about `findMany`/`create` on undefined:

1. **Stop the dev server** (Ctrl+C).
2. Run **`npx prisma generate`** (or `npm run db:generate`).
3. Ensure the DB has the Payout table: **`npm run db:push`** (or run migrations).
4. Delete the Next.js cache: **`rm -r .next`** (Windows: `Remove-Item -Recurse -Force .next`).
5. Start the dev server again: **`npm run dev`**.

## Project structure

- `src/app/` – App Router pages and API routes
  - `api/auth/` – NextAuth + register, forgot-password, reset-password
  - `api/courses/` – CRUD, modules, publish, reviews
  - `api/enroll/`, `api/enrollments/`, `api/modules/`, `api/notifications/`, `api/users/`, `api/author/`, `api/admin/`
  - `login/`, `register/`, `forgot-password/`, `reset-password/`
  - `dashboard/` – Student dashboard
  - `author/` – Author dashboard and course create/edit
  - `admin/` – Admin dashboard, users, courses
  - `courses/` – Browse, detail, learn (enrolled)
  - `profile/`
- `src/components/` – UI (Button, Input, Card), layout (Navbar), providers (SessionProvider)
- `src/lib/` – Prisma client, auth config, validations (Zod), utils
- `src/middleware.ts` – Route protection and role checks
- `prisma/` – schema.prisma, seed.ts

## Deployment (e.g. Vercel)

1. Set environment variables in the Vercel project (DATABASE_URL, NEXTAUTH_URL, AUTH_SECRET, optional Google OAuth).
2. Use a hosted PostgreSQL (Supabase, Neon, etc.) and set `DATABASE_URL`.
3. Run migrations (or `prisma db push`) against the production DB before or after first deploy.
4. Deploy: `vercel` or connect the Git repo.

## Scripts

| Command        | Description                |
|----------------|----------------------------|
| `npm run dev`  | Start dev server           |
| `npm run build`| Build for production       |
| `npm run start`| Start production server    |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push`      | Push schema to DB     |
| `npm run db:migrate`   | Run migrations        |
| `npm run db:seed`      | Seed data             |
| `npm run db:studio`    | Open Prisma Studio    |

## Security notes

- Passwords are hashed with bcrypt.
- NextAuth uses JWT for session (configurable).
- Inputs are validated with Zod on API routes.
- Middleware restricts dashboard routes by role; API routes also check session/role where needed.

## Optional next steps

- **Stripe**: Add payment for paid courses (checkout, webhooks).
- **Email**: Use Resend/SendGrid for password reset and notifications.
- **Certificates**: Generate PDF when a student completes 100% of a course.
- **Quizzes**: Store quiz questions in DB, submit answers, and score in the learn flow.
