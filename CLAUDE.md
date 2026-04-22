# RED - Freelance Marketplace Platform

## Project Overview

RED is a freelance marketplace platform where users can post projects/jobs and other users can apply to work on them. The platform starts free for all users and will scale to support thousands of users with premium features.

## Tech Stack

### Core Framework
- **Next.js 16.0.5** with App Router (Server Components, RSC)
- **React 19** with React Compiler enabled
- **TypeScript** (strict mode enabled)
- **Node.js** target: ES2017

### Styling & UI
- **Tailwind CSS 4** (latest with PostCSS)
- **Lucide React** for icons
- Geist fonts (Sans & Mono)

### Backend & Database
- **Vercel Postgres** (`@vercel/postgres`) - PostgreSQL database
- **NextAuth v4** (`next-auth@4.24.13`) - Authentication with Google OAuth
- **Vercel** - Hosting and serverless functions

### Forms & Validation
- **React Hook Form** (`react-hook-form@7.67.0`)
- **Zod 4** (`zod@4.1.13`) - Schema validation
- **@hookform/resolvers** - Connect Zod with React Hook Form

### Development Tools
- ESLint with Next.js config
- TypeScript 5

## Project Structure

```
red/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Auth routes group
│   │   │   ├── login/           # Login page
│   │   │   └── register/        # Registration page
│   │   ├── api/                 # API routes
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/ # NextAuth handler
│   │   │   ├── projects/        # Project CRUD endpoints
│   │   │   └── applications/    # Application CRUD endpoints
│   │   ├── dashboard/           # Protected dashboard
│   │   │   ├── projects/        # User's projects
│   │   │   │   └── new/         # Create new project
│   │   │   └── applications/    # User's applications
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Home page
│   │   └── globals.css          # Global styles
│   ├── lib/
│   │   ├── auth.ts             # NextAuth configuration
│   │   └── db.ts               # Database initialization & queries
│   └── types/
│       └── next-auth.d.ts      # NextAuth type extensions
├── public/                      # Static assets
├── .env.local                   # Environment variables (NOT in git)
└── package.json
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  image VARCHAR(255),
  subscription_tier VARCHAR(50) DEFAULT 'free',  -- 'free' | 'premium'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Projects Table
```sql
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  budget DECIMAL(10,2),
  employer_id INTEGER REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'open',  -- 'open' | 'in_progress' | 'completed' | 'cancelled'
  skills_required TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Applications Table
```sql
CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  freelancer_id INTEGER REFERENCES users(id),
  proposal TEXT,
  bid DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending' | 'accepted' | 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, freelancer_id)  -- One application per user per project
);
```

## Development Commands

```bash
# Development server (localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Environment Variables

### Local Development (`.env.local`)

```bash
# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth configuration - LOCAL
NEXTAUTH_URL=http://localhost:3000  # For local development
NEXTAUTH_SECRET=your_generated_secret  # Generate with: openssl rand -base64 32
```

**Important:** When testing locally, `NEXTAUTH_URL` must be `http://localhost:3000` otherwise you'll be redirected to production.

### Production (Vercel Dashboard)

Set these in **Vercel Dashboard → Settings → Environment Variables → Production**:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth configuration - PRODUCTION
NEXTAUTH_URL=https://red-1xra.vercel.app  # Your production URL
NEXTAUTH_SECRET=your_generated_secret  # Same secret as local

# Vercel Postgres (auto-injected by Vercel - don't add manually)
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
```

**Note:** Never commit `.env.local` to git (already in `.gitignore`)

## Code Style & Conventions

### TypeScript
- Use **strict mode** (already enabled)
- Prefer **interfaces** for object shapes
- Use **type** for unions and primitives
- Always use explicit return types for functions
- Use `@/*` path alias for imports (e.g., `import { db } from '@/lib/db'`)

### React Components
- Use **functional components** with hooks
- Prefer **Server Components** by default (App Router)
- Add `'use client'` directive only when needed (interactivity, useState, useEffect)
- Name files with PascalCase for components (e.g., `ProjectCard.tsx`)
- Name files with kebab-case for routes (e.g., `page.tsx`, `layout.tsx`)

### Naming Conventions
- **Components**: PascalCase (e.g., `ProjectCard`, `ApplicationList`)
- **Functions**: camelCase (e.g., `createProject`, `getUserById`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_PROJECTS_FREE`)
- **Types/Interfaces**: PascalCase (e.g., `User`, `ProjectStatus`)
- **Files**: kebab-case for routes, PascalCase for components

### Database Queries
- Use `@vercel/postgres` sql template literals
- Always handle errors with try/catch
- Use transactions for multi-step operations
- Example:
```typescript
import { sql } from '@/lib/db';

export async function createProject(data: ProjectData) {
  try {
    const result = await sql`
      INSERT INTO projects (title, description, employer_id)
      VALUES (${data.title}, ${data.description}, ${data.employerId})
      RETURNING *
    `;
    return result.rows[0];
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}
```

### Form Validation
- Use **Zod schemas** for validation
- Integrate with **React Hook Form** using `@hookform/resolvers`
- Example:
```typescript
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const projectSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  budget: z.number().positive('Budget must be positive'),
});

type ProjectForm = z.infer<typeof projectSchema>;

const form = useForm<ProjectForm>({
  resolver: zodResolver(projectSchema),
});
```

### API Routes
- Place in `src/app/api/` directory
- Export named functions: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`
- Use `NextRequest` and `NextResponse` types
- Validate request bodies with Zod
- Return proper HTTP status codes
- Example:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({ title: z.string() });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = schema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Process request...
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Authentication

### Current Setup
- **NextAuth v4** with two providers:
  - **Google OAuth** — login social
  - **Credentials (Email + Password)** — `bcryptjs` con salt rounds=12
- Session JWT-based (stateless, no DB calls in middleware)
- Protected routes guarded by `src/proxy.ts` (Next.js 16 proxy file)

### Auth Providers — Rules
- **DO NOT add GitHub OAuth** — out of scope for this platform
- Google OAuth and Email+Password are the only supported providers
- Magic links (passwordless email) can be added in the future via Resend
- Never store plain-text passwords — always use `bcrypt.hash(password, 12)`
- Google-only users have `password_hash = NULL` in DB — they cannot use credentials login
- New email/password users are created via `POST /api/auth/register` (not directly in NextAuth)

### Usage in Server Components
```typescript
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  // session.user.id, session.user.role, session.user.subscription
}
```

### Usage in Client Components
```typescript
'use client';
import { signIn, signOut } from 'next-auth/react';

// Google login
<button onClick={() => signIn('google', { callbackUrl: '/dashboard' })}>
  Continuar con Google
</button>

// Email/password login
const result = await signIn('credentials', { email, password, redirect: false });

// Logout
<button onClick={() => signOut()}>Salir</button>
```

### Admin Management
- **NEVER hardcode admin emails in source code**
- Admins are designated exclusively via environment variables:
  - `ADMIN_EMAILS=email1@gmail.com,email2@gmail.com` (comma-separated, preferred)
  - `ADMIN_EMAIL=email@gmail.com` (legacy single-email, still supported)
- Roles are assigned when `/api/init-db` is called (runs `seedCategories()`)
- To promote a new admin: add their email to `ADMIN_EMAILS` env var and call `/api/init-db` again
- Admin role check: `session.user.role === 'admin'`

## Subscription Tiers

### Free Tier
- Max 3 projects posted
- Max 10 applications submitted
- Basic search functionality

### Premium Tier (Future)
- Max 15 projects posted
- Max 100 applications submitted
- Advanced analytics
- Priority support
- Featured listings

## Security Standards (Non-Negotiable Rules)

These rules apply to ALL new features and routes. They are mandatory, not optional.

### Route Protection
- All `/dashboard/*` routes are protected by `src/proxy.ts` (Next.js 16 proxy/middleware)
- Any new protected route group must be added to the `matcher` in `src/proxy.ts`
- Server Components and API routes must independently verify session — the proxy is defense-in-depth, not the only guard

### API Route Authorization Template
Every API route that modifies data or reads sensitive data MUST follow this pattern:
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // For admin-only routes:
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ...
}
```

### Endpoint Security Rules
- **NEVER** create public endpoints that expose user lists, env vars, or DB schema
- `/api/debug` — development-only (`NODE_ENV !== 'development'` returns 404)
- `/api/init-db` — requires admin session OR `x-init-secret` header in production
- `/api/users` — admin-only
- Any new admin endpoint MUST check `session.user.role === 'admin'`
- Use 404 (not 403) to hide existence of sensitive endpoints from unauthenticated users

### Input Validation
- Validate ALL API request bodies with Zod before processing
- Use `schema.safeParse()` (not `schema.parse()`) and return 400 on failure
- Reference Zod v4 API: use `validation.error.issues[0].message` (not `.errors`)
- Never trust `session.user.id` from client — always resolve from server session

### Database Security
- Always use parameterized queries via `sql\`...\`` template literals or `pool.query(query, params[])`
- Never concatenate user input into SQL strings
- Never log full connection strings or credentials
- passwords stored as `bcrypt` hash with salt rounds=12 in `users.password_hash`

### HTTP Security Headers
Headers are configured in `next.config.ts` and applied to all routes:
- `X-Frame-Options: SAMEORIGIN` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Strict-Transport-Security` — enforces HTTPS
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — disables camera/microphone/geolocation

### Environment Variables
- Never commit `.env.local` to git (in `.gitignore`)
- Production secrets only in Vercel Dashboard env vars
- Validate all user inputs with Zod
- Use CSRF protection (NextAuth handles this automatically)

## Important Notes

### Security (legacy notes — see Security Standards above)
- Never commit `.env.local` to git
- Validate all user inputs with Zod
- Sanitize database queries (use parameterized queries with `sql` template literals)
- Use CSRF protection (NextAuth handles this)

### Performance
- Use **Server Components** by default (faster, less JavaScript)
- Implement **database indexes** when scaling:
  - Index on `users.email`
  - Index on `projects.status`, `projects.employer_id`
  - Index on `applications.project_id`, `applications.freelancer_id`
- Use **React Compiler** (already enabled) for automatic optimizations

### Deployment
- Deploy to **Vercel** (already configured)
- Vercel auto-injects database environment variables
- Set environment variables in Vercel dashboard
- Automatic deployments on git push

## Common Tasks

### Initialize Database
```typescript
import { initDatabase } from '@/lib/db';
await initDatabase(); // Creates all tables if they don't exist
```

### Create a New API Route
1. Create file in `src/app/api/[route-name]/route.ts`
2. Export HTTP method functions (GET, POST, etc.)
3. Validate input with Zod
4. Return NextResponse with proper status codes

### Add a New Page
1. Create folder in `src/app/` with route name
2. Add `page.tsx` file
3. Export default function component
4. For protected routes, check auth in the component

### Add Database Migration
- Manually run SQL commands in Vercel Postgres dashboard, or
- Add migration logic to `initDatabase()` function in `lib/db.ts`

## Known Issues

_(none currently)_

## Future Enhancements

- [ ] Add shadcn/ui components
- [ ] Implement TanStack Query for client-side data fetching
- [ ] Add email notifications (Resend or SendGrid)
- [ ] Implement search functionality (PostgreSQL full-text search)
- [ ] Add file upload for user avatars and project images
- [ ] Payment integration (Stripe) for premium subscriptions
- [ ] Rate limiting for API routes
- [ ] Analytics dashboard
- [ ] Admin panel
- [ ] Real-time notifications (WebSockets or Server-Sent Events)

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [NextAuth Docs](https://next-auth.js.org/)
- [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Zod Docs](https://zod.dev/)
- [Vercel Deployment](https://red-1xra.vercel.app/)
