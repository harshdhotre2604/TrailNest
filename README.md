# TrailNest

A small, self-contained travel/property-listings app built as a DevOps capstone reference project. TrailNest mirrors a real-world stack (Next.js + Express + MySQL) at compressed scope, with fictional seed data, so it can be freely containerized, deployed, and shared without touching any production system or data.

## Stack

- **Frontend:** Next.js (App Router), React, functional components + hooks
- **Backend:** Node.js + Express, REST API
- **Database:** MySQL, raw `mysql2` connection pool (no ORM)
- **Deployment target (later phase):** Docker + Docker Compose on AWS EC2 (Ubuntu)

## Project structure

```
trailnest/
├── frontend/     # Next.js app (own package.json, own Dockerfile later)
├── backend/      # Express API (own package.json, own Dockerfile later)
├── db/           # schema.sql + seed.sql, mounted as init scripts by Docker Compose later
└── README.md
```

**Why separate top-level `frontend/` and `backend/` directories instead of an npm-workspaces monorepo:** each service becomes its own Docker image with its own build context, dependency tree, and lifecycle. Keeping them as fully independent projects (own `package.json`, own `node_modules`) means each `Dockerfile` only ever `COPY`s its own directory — no workspace-hoisting, no shared `node_modules` to reason about, and no risk of one service's Docker layer cache being invalidated by changes in the other. `db/` sits alongside them because Docker Compose will later mount `db/schema.sql` and `db/seed.sql` directly into the MySQL container's init directory.

## Modules (compressed scope)

1. **Property listings** — grid/detail pages, a short add-property form (owner-only)
2. **Leads / inquiries** — a contact form on each property page, an internal leads list for owners
3. **Basic auth** — email/password login for the `owner` role only

No payments, booking calendar, reviews, or multi-role complexity — see the project's original scope notes for the full list of non-goals.

## Getting started (local dev, pre-Docker)

```bash
# backend
cd backend
cp .env.example .env   # fill in local MySQL credentials
npm install
npm run dev             # http://localhost:4000

# frontend (separate terminal)
cd frontend
npm install
npm run dev              # http://localhost:3000
```

Create the database and load the schema/seed data:

```bash
mysql -u root -p -e "CREATE DATABASE trailnest_dev"
mysql -u root -p trailnest_dev < db/schema.sql
mysql -u root -p trailnest_dev < db/seed.sql
```

Docker/Compose setup comes in a later phase once the app itself is verified working.
