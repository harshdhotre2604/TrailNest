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
├── frontend/     # Next.js app + Dockerfile
├── backend/      # Express API + Dockerfile
├── db/           # schema.sql + seed.sql, mounted as MySQL init scripts by Compose
├── docker-compose.yml
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

## Running with Docker Compose

```bash
cp .env.example .env   # fill in DB_ROOT_PASSWORD, DB_PASSWORD, JWT_SECRET
docker compose up --build
```

This starts three services on a shared `trailnest` bridge network:

| Service    | Container port | Published on host | Notes                                                        |
|------------|-----------------|--------------------|----------------------------------------------------------------|
| `db`       | 3306            | *(none)*           | `mysql:8.0`; `db/schema.sql` + `db/seed.sql` auto-run on first start via `/docker-entrypoint-initdb.d/` |
| `backend`  | 4000            | 4000               | waits on `db`'s healthcheck before starting                   |
| `frontend` | 3000            | 3000               | waits on `backend`'s healthcheck before starting               |

Once all three report healthy (`docker compose ps`), open **http://localhost:3000**.

**Why two different API URLs?** Server-rendered pages (the property grid, detail page) run *inside* the frontend container and reach the backend over the Compose network at `http://backend:4000/api` (set as `INTERNAL_API_URL`, read at runtime — no rebuild needed to change it). Code that runs in the visitor's browser (the inquiry form, login, dashboard) can't resolve that hostname, so it uses `NEXT_PUBLIC_API_URL` instead — a value baked into the JS bundle at *build time*, pointing at the backend's host-published port (`http://localhost:4000/api` locally; the public domain/IP once deployed to EC2). Changing `NEXT_PUBLIC_API_URL` means rebuilding the frontend image.

**Local MySQL conflict:** the `db` service doesn't publish port 3306 to the host, since a local MySQL install (used for the non-Docker dev flow above) is usually already sitting on that port. Uncomment/add a `ports: ["3307:3306"]` mapping under `db` if you want a GUI tool to inspect the containerized database directly.

Tear down with `docker compose down` (add `-v` to also drop the `db_data` volume and start from a fresh database next time).

## AWS EC2 deployment

Not yet — planned for the next phase once the Compose setup above is verified working end to end.
