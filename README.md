<div align="center">

# 🚀 OutreachHub

**AI-Powered B2B Prospecting & Email Marketing Platform**

An all-in-one SaaS platform for overseas customer acquisition, combining AI-driven lead prospecting, email campaign automation, and intelligent reply classification — built for Chinese enterprises expanding into international markets.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.14-2D3748?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38BDF8?logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

</div>

---

## ✨ Features

### 🔍 AI-Powered Prospecting
- **Company & Contact Search** — Search by industry, position, location via RocketReach API
- **AI Keyword Suggestions** — GPT-4o generates search keywords and position filters
- **Customer Profiling** — AI-generated interest scores and customer profiles

### 📧 Email Marketing Campaigns
- **Campaign Types** — Single blast, multi-step sequences, and A/B testing
- **Smart Scheduling** — Immediate, scheduled, or recurring sends with per-hour/per-day throttling
- **AI Email Generation** — GPT-4o crafts personalized cold emails, subject lines, and translations
- **Email Templates** — Reusable templates with variable interpolation (`{{firstName}}`, `{{companyName}}`)

### 📬 Email Deliverability
- **BullMQ Send Queue** — Redis-backed queue with graceful fallback to direct SMTP
- **Email Verification** — MillionVerifier API integration for address validation
- **Health Scoring** — Per-account health tracking with daily send limits
- **Email Tracking** — Pixel-based open tracking and click tracking

### 🤖 Intelligent Reply Handling
- **IMAP Reply Monitoring** — Automatic inbox scanning for campaign replies
- **AI Reply Classification** — 10 categories (Interested, Not Interested, Out of Office, Question, Unsubscribe, Auto-reply, Forward, Negotiation, Referral, Unknown) with confidence scoring
- **Auto Status Updates** — Contact status automatically updated based on reply classification

### 🏢 CRM & Contact Management
- **Full CRUD** — Contacts and companies with rich data fields
- **CSV Import** — Parse → Preview → Confirm bulk import pipeline
- **Tag & Status System** — Organize contacts with tags and workflow statuses

### 🔐 Multi-Tenant Architecture
- **Plan-Based Limits** — FREE / BASIC / PRO / ENTERPRISE tiers
- **Tenant Isolation** — Separate data and resource limits per organization
- **JWT Authentication** — Secure cookie-based auth with bcrypt password hashing

### 🌐 Developer Experience
- **i18n** — Chinese (zh) and English (en) with runtime locale switching
- **Dark Mode** — Light / Dark / System theme with localStorage persistence
- **PWA Support** — Installable web app with manifest and app shortcuts
- **SEO Optimized** — Open Graph, Twitter Cards, JSON-LD structured data
- **Real-time Dashboard** — SSE-powered live stats and activity charts

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router), React 18, TypeScript |
| **Database** | PostgreSQL via Prisma ORM |
| **Auth** | JWT + bcryptjs, cookie-based middleware |
| **Email Sending** | Nodemailer (SMTP) + BullMQ queue (Redis) |
| **Email Receiving** | IMAP + mailparser |
| **AI** | OpenAI GPT-4o |
| **Prospecting** | RocketReach API |
| **Email Verification** | MillionVerifier API |
| **UI** | Radix UI, Tailwind CSS, Lucide Icons |
| **State** | Zustand |
| **Tables** | TanStack React Table |
| **Charts** | Recharts |
| **Validation** | Zod |
| **Testing** | Jest (unit) + Playwright (E2E) |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis (optional, for email queue — falls back to direct send if unavailable)

### Installation

```bash
# Clone the repository
git clone https://github.com/Wuchangyue-zh/outreachHub.git
cd outreachHub

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration (see below)

# Set up the database
npx prisma db push
npx prisma db seed

# Start the development server
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | JWT signing secret (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | App base URL (e.g. `http://localhost:3000`) |
| `OPENAI_API_KEY` | OpenAI API key for AI features |
| `OPENAI_MODEL` | Model to use (default: `gpt-4o`) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | SMTP server config for sending emails |
| `SMTP_FROM_NAME` | Sender display name |
| `IMAP_HOST` / `IMAP_PORT` / `IMAP_USER` / `IMAP_PASSWORD` | IMAP config for reply monitoring |
| `MILLION_VERIFIER_API_KEY` | Email verification service key |
| `ROCKETREACH_API_KEY` | Prospect data API key |
| `REDIS_URL` | Redis connection (optional, for email queue) |

---

## 📁 Project Structure

```
outreachHub/
├── prisma/
│   ├── schema.prisma          # Database schema (User, Contact, Campaign, etc.)
│   └── seed.ts                # Seed data
├── src/
│   ├── app/
│   │   ├── api/               # 20+ API routes
│   │   │   ├── auth/          # Login, register, logout
│   │   │   ├── campaigns/     # Campaign CRUD & stats
│   │   │   ├── contacts/      # Contact CRUD & CSV import
│   │   │   ├── companies/     # Company CRUD
│   │   │   ├── email/         # Send, tracking (open/click)
│   │   │   ├── email-queue/   # Queue management
│   │   │   ├── imap/          # Reply monitoring
│   │   │   ├── ai/            # AI generation
│   │   │   └── prospecting/   # RocketReach integration
│   │   ├── dashboard/         # Main dashboard
│   │   ├── campaigns/         # Campaign management UI
│   │   ├── contacts/          # Contact management UI
│   │   ├── companies/         # Company database UI
│   │   ├── templates/         # Email template editor
│   │   ├── prospecting/       # AI prospecting UI
│   │   ├── settings/          # SMTP & account config
│   │   └── login/register/    # Auth pages
│   ├── components/            # Reusable UI components
│   ├── hooks/                 # Custom React hooks (i18n, SSE)
│   ├── lib/                   # Core business logic
│   │   ├── email.ts           # SMTP transport
│   │   ├── email-queue.ts     # BullMQ queue
│   │   ├── email-tracking.ts  # Open/click tracking
│   │   ├── email-verify.ts    # Address verification
│   │   ├── imap.ts            # Reply monitoring
│   │   ├── openai.ts          # AI generation
│   │   ├── rocketreach.ts     # Prospect search
│   │   ├── reply-classifier.ts# AI reply classification
│   │   └── i18n.ts            # Internationalization
│   ├── store/                 # Zustand state stores
│   └── middleware.ts          # Auth route protection
├── e2e/                       # Playwright E2E tests
└── scripts/                   # Utility scripts
```

---

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests (requires running server)
npx playwright install
npx playwright test
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

---

## 📮 Contact

If you have any questions or suggestions, please open an issue on GitHub.
