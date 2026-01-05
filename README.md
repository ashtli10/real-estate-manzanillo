# Habitex Real Estate Platform

**Last Updated: 2026-01-04**

## Overview

Habitex is a real estate marketplace platform for agents in Mexico, built with React, Vite, Supabase, and Stripe. It provides a modern, mobile-first experience for property seekers and agents, with advanced features like AI-powered video generation, credit-based billing, and robust access control.

---

## 🚀 Features

- **Public Pages:**
  - Landing page with search and filters
  - Properties listing with advanced filters and sorting
  - Property detail pages with image galleries, video, and agent info
  - Agent profile pages (domain.com/username)

- **Agent Dashboard:**
  - Property management (CRUD, reorder, status)
  - Profile settings and public profile preview
  - Subscription and credit management (Stripe integration)
  - AI Tools: Video generator with multi-step wizard

- **Admin Panel:**
  - User invitations and onboarding
  - Trial management
  - Platform analytics

- **AI Video Generator:**
  - Select property images, generate AI-enhanced frames
  - Script generation and editing
  - Final video rendering and download
  - Credit-based usage with instant refunds on failure

- **Internationalization:**
  - Spanish (default) and English support
  - Language preference saved in profile and localStorage

- **SEO & Branding:**
  - Dynamic meta tags, Schema.org, Open Graph, Twitter Cards
  - Dynamic sitemap, robots.txt, canonical URLs
  - Brand assets in /public/branding

---

## 🗄️ Database

- **Supabase PostgreSQL** with strict Row Level Security (RLS)
- Key tables: `profiles`, `user_roles`, `invitation_tokens`, `subscriptions`, `credits`, `credit_transactions`, `audit_logs`, `properties`, `property_drafts`, `video_generation_jobs`
- Storage buckets: `properties` (public images), `jobs` (AI assets)
- Helper functions for credit management, subscription status, and invitations

---

## 💳 Payments

- **Stripe** integration for:
  - Monthly subscription (199 MXN/month, 50 free credits/month)
  - Credit packs (20, 50, 100, 650, 1350 credits)
  - Webhooks for subscription lifecycle and credit management

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Backend:** Supabase (DB, Auth, Storage, Realtime)
- **Payments:** Stripe
- **Hosting:** Vercel
- **Maps:** Google Maps API
- **i18n:** react-i18next

---

## 📦 Project Structure

- `/src` - Main app code (components, hooks, pages, lib, i18n)
- `/api` - Serverless API routes (properties, stripe, video, prefill)
- `/public` - Static assets (branding, robots.txt, manifest)
- `/test` - Test setup and utilities
- `/docs` - Architecture, database schema, and project plan

---

## 🏁 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Configure environment:**
   - Copy `.env.example` to `.env` and fill in Supabase/Stripe keys
3. **Run development server:**
   ```bash
   npm run dev
   ```
4. **Build for production:**
   ```bash
   npm run build
   ```

---

## 📚 Documentation

- **System Architecture:** See `ARCHITECTURE.md`
- **Database Schema:** See `DATABASE_SCHEMA.md`
- **Project Plan & Roadmap:** See `PROJECT_PLAN.md`

---

## 🔒 Security

- Strict RLS on all tables
- No sensitive data in client code
- Edge Functions for sensitive logic
- Input validation and rate limiting on all APIs
- Principle of least privilege for all roles

---

## 📝 Contributing

1. Read the documentation in `/docs` before making changes
2. Keep docs in sync with code (update Last Edited date)
3. Follow security and coding guidelines
4. Open issues or pull requests for discussion

---

## 📄 License

MIT License. See `LICENSE` file.
