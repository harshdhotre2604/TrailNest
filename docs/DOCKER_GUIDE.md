# Dockerizing TrailNest — a step-by-step guide

This is a walkthrough of how TrailNest's three services (MySQL, Express, Next.js) got
containerized: what each line in each `Dockerfile` does, why it's there, how
`docker-compose.yml` wires them together, and how to run and verify the whole thing.
It's written so you can redo this process from scratch on a different project.

## 1. The mental model

Before writing anything, decide on the shape: **one container per service**, all joined
by **one Docker network**, with **one Compose file** as the single source of truth for
how they fit together.

```
┌─────────────────────────────────────────────────────────┐
│  Docker network: trailnest                               │
│                                                            │
│   ┌────────┐      ┌───────────┐      ┌────────────┐      │
│   │   db   │◄─────┤  backend  │◄─────┤  frontend  │      │
│   │ mysql  │      │  express  │      │  next.js   │      │
│   │ :3306  │      │  :4000    │      │  :3000     │      │
│   └────────┘      └───────────┘      └────────────┘      │
│                         ▲                    ▲            │
└─────────────────────────┼────────────────────┼────────────┘
                      published            published
                      host:4000            host:3000
```

Inside the network, containers reach each other **by service name** — `backend` can
open a connection to `db:3306` the same way your laptop resolves `localhost`. Outside
the network (your browser, `curl` from the host), only the ports you explicitly
*publish* (`ports:` in Compose) are reachable, and only via `localhost:<published port>`.

That one distinction — "am I talking to another container, or is the browser/host
talking to me?" — is the source of almost every gotcha in this guide.

## 2. Multi-stage builds: the core Dockerfile pattern

Every Dockerfile here has multiple `FROM` lines. Each `FROM` starts a new **stage**.
Later stages can `COPY --from=<earlier stage>` specific files out of an earlier one,
discarding everything else that stage produced.

Why bother? Because a naive single-stage Dockerfile (`FROM node`, `COPY .`, `RUN npm install`, `CMD ...`)
bakes your entire `node_modules` dev tooling, build caches, and source `.git` history
into the image you ship. Multi-stage builds let you use a "fat" stage to *build* the
app (with all the compilers, dev dependencies, etc.) and then copy only the finished
output into a "thin" stage that actually runs in production. The intermediate stages
never end up in the final image — they exist only during `docker build` and are
discarded afterward.

Both Dockerfiles here follow the same three-stage shape:

```
deps    → installs node_modules only (cached separately from source changes)
builder → copies source in, runs the actual build
runner  → copies just the build output + runtime deps, nothing else
```

## 3. `backend/Dockerfile`, line by line

```dockerfile
# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
```

- `node:20-alpine` — Alpine Linux is a minimal base image (~40MB vs. ~1GB for
  `node:20`). We picked Node 20 because Next.js 16 requires `>=20.9.0` (checked its
  `package.json` `engines` field before choosing — worth doing rather than guessing).
- `COPY package.json package-lock.json ./` *before* copying the rest of the source is
  deliberate: Docker caches each layer, keyed on its inputs. If only `src/` changes but
  `package.json` doesn't, Docker reuses the cached `npm ci` layer instead of
  reinstalling every dependency on every build. This ordering is the single biggest
  lever for fast rebuilds.
- `npm ci` (not `npm install`) installs exactly what's in `package-lock.json` — no
  version drift, and it fails loudly if the lockfile is out of sync instead of quietly
  rewriting it.
- `--omit=dev` skips `devDependencies` (nodemon, etc.) — the running container doesn't
  need them.

```dockerfile
# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

USER node
EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://localhost:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
```

- Fresh `FROM node:20-alpine` again for the final stage — this is what actually ships.
  It never sees `npm`'s package cache, lockfile, or anything from `deps` except the
  `node_modules` folder we explicitly copied.
- `COPY --from=deps /app/node_modules ./node_modules` pulls only the installed
  dependencies from the previous stage — the actual `npm ci` step never re-runs here.
- `USER node` — the official Node images ship a non-root `node` user (uid 1000)
  specifically for this. Running the container as root is unnecessary risk: if the
  app were ever compromised, root-in-container is a much larger blast radius than a
  user that can't install packages or bind to privileged ports.
- `HEALTHCHECK` — Docker will periodically run this command *inside* the container.
  We use Node's built-in `fetch` (stable since Node 18) instead of `curl`/`wget`
  because Alpine doesn't ship either by default, and installing them just for a
  healthcheck is unnecessary image bloat. `start_period=10s` gives the app time to
  boot before the first check counts against it; `retries=5` means it has to fail
  five checks in a row before Docker marks the container `unhealthy`.
- `CMD ["node", "src/server.js"]` — exec form (JSON array), not shell form
  (`CMD node src/server.js`). Exec form runs the process directly as PID 1, so it
  receives `SIGTERM` correctly on `docker stop` instead of that signal going to an
  intermediate `/bin/sh` that may not forward it.

`backend/.dockerignore` keeps `node_modules`, `.env`, and `.git` out of the build
context entirely — without it, `docker build` would upload gigabytes of local
`node_modules` to the Docker daemon before even starting, and a stray `COPY . .`
could accidentally bake your local `.env` secrets into an image layer.

## 4. `frontend/Dockerfile`, line by line

The frontend follows the same three-stage shape, but Next.js adds two real wrinkles.

```dockerfile
# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
```

Same reasoning as the backend — cached layer for dependencies. (No `--omit=dev` here:
the build step itself needs `next` and friends, which for this project live in
`dependencies`, not `devDependencies`.)

```dockerfile
# ---- builder ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build
```

**Wrinkle #1 — build-time vs. runtime environment variables.** Next.js inlines any
`NEXT_PUBLIC_*` environment variable directly into the JavaScript bundle *at build
time*, because that code ends up running in the visitor's browser, which has no
concept of Docker or `.env` files. That means:

- `ARG NEXT_PUBLIC_API_URL` declares a build argument (passed via
  `docker build --build-arg` or Compose's `build.args`).
- `ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL` copies that build arg into an
  environment variable so `npm run build` can actually see it (`ARG` alone isn't
  visible to the build process, only to the Dockerfile instructions themselves).
- Whatever value it has *at build time* is permanently baked into the compiled
  output. Changing it later means rebuilding the image — setting it as a plain
  Compose `environment:` value on the running container would do nothing, because by
  the time the container starts, the JS bundle is already compiled.

This is why `lib/api.js` in this project deliberately uses **two different
variables**:

```js
const API_URL =
  typeof window === 'undefined'
    ? process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
```

- `typeof window === 'undefined'` is true when this code is executing on the server
  (inside the frontend container, rendering a page) — there it can use
  `INTERNAL_API_URL`, a normal (non-`NEXT_PUBLIC_`) runtime env var that Compose sets
  to `http://backend:4000/api`, resolved fresh on every request, no rebuild required.
- Otherwise the code is running in the visitor's browser, which only knows about
  `NEXT_PUBLIC_API_URL` — baked in at build time, pointing at wherever the backend is
  *publicly* reachable (`http://localhost:4000/api` locally; your EC2 domain later).

If you only remember one thing from this whole guide, make it this: **server code and
browser code inside the same Next.js app are not on the same network**, and Docker
Compose is exactly the situation that makes that fact impossible to ignore.

```dockerfile
# ---- runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER node
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://localhost:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
```

**Wrinkle #2 — `output: 'standalone'`.** Added to `next.config.js`:

```js
const nextConfig = {
  output: 'standalone',
  // ...
};
```

By default, running a built Next.js app (`next start`) needs the *entire*
`node_modules` tree present, because Next itself and all your dependencies have to be
resolvable at runtime. `output: 'standalone'` makes `next build` trace exactly which
files are actually needed to run the app and copies only those — plus a
self-contained `server.js` — into `.next/standalone`. That's what lets the `runner`
stage skip `npm install` entirely and just copy three folders.

**Wrinkle #3 — the `HOSTNAME` gotcha (a real bug we hit).** Docker automatically sets
the `HOSTNAME` environment variable inside every container to that container's ID
(e.g. `427afc83926c`). Next's standalone `server.js` reads `process.env.HOSTNAME` and
binds the HTTP server to *that specific address* rather than to all network
interfaces. The result: the app worked fine from the host machine (`curl
localhost:3000` succeeded, because Docker's port-publishing proxy routes directly to
the container's network IP), but the in-container `HEALTHCHECK` — which runs *inside*
the container and asks for `http://localhost:3000/` — got `fetch failed`, because
nothing was actually listening on `127.0.0.1`. We caught this because
`docker compose ps` reported the frontend container as `unhealthy` despite the app
clearly running. Setting `ENV HOSTNAME=0.0.0.0` overrides Docker's default and makes
the server bind to all interfaces, including loopback. This is a well-known trap
specific to combining Next.js standalone output with Docker — worth remembering for
any future Next.js container.

`frontend/.dockerignore` mirrors the backend's, plus `.next` (no point uploading a
local build artifact into the build context that's about to be rebuilt from
scratch).

## 5. `docker-compose.yml`, section by section

```yaml
services:
  db:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:?DB_ROOT_PASSWORD is required}
      MYSQL_DATABASE: ${DB_NAME:-trailnest_dev}
      MYSQL_USER: ${DB_USER:-trailnest}
      MYSQL_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD is required}
```

- `db` uses the **official `mysql:8.0` image** directly — no custom Dockerfile needed,
  since we're not changing MySQL itself, only configuring and seeding it.
- `${VAR:?message}` is Compose's "required" syntax: if `DB_ROOT_PASSWORD` isn't set
  (e.g. you forgot to create `.env`), Compose refuses to start with a clear error
  instead of silently launching MySQL with an empty root password.
- `${VAR:-default}` is the "optional with a fallback" syntax — used for values that
  are fine to default (like the database name) but not for secrets.
- Compose automatically reads a file literally named `.env` sitting next to
  `docker-compose.yml` and substitutes these `${...}` references from it. That file
  is gitignored; `.env.example` documents the shape without real values.

```yaml
    volumes:
      - db_data:/var/lib/mysql
      - ./db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
      - ./db/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql:ro
```

- `db_data:/var/lib/mysql` is a **named volume** — MySQL's actual data files live
  here, managed by Docker, surviving container restarts/recreations. Without this,
  every `docker compose down` would wipe the database.
- The official MySQL image runs every `.sql`/`.sh` file it finds in
  `/docker-entrypoint-initdb.d/`, in filename order, **but only the very first time
  the data directory is empty**. That's why they're numbered `01-`/`02-` (schema
  before seed data, which has foreign-key dependencies on it) and mounted `:ro`
  (read-only — the container has no business writing back to files in your repo).

```yaml
    healthcheck:
      test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost', '-u', 'root', '-p${DB_ROOT_PASSWORD}']
      interval: 5s
      timeout: 5s
      retries: 10
```

`mysqladmin ping` ships inside the MySQL image, so no extra tooling is needed. This
healthcheck is what everything downstream waits on (next section).

```yaml
  backend:
    build:
      context: ./backend
    depends_on:
      db:
        condition: service_healthy
    environment:
      DB_HOST: db
      # ...
```

- `depends_on: db: condition: service_healthy` — plain `depends_on` (without a
  condition) only waits for the container to *start*, not for the service inside it
  to actually be ready. MySQL takes a few seconds after starting before it accepts
  connections; without `service_healthy`, the backend would race MySQL and
  potentially crash-loop on its first few connection attempts. This is exactly why we
  wrote `db`'s healthcheck first.
- `DB_HOST: db` — this is the payoff of Compose's built-in networking: services
  address each other by their **service name** as a hostname, automatically resolved
  by Docker's embedded DNS. No IP addresses, no manual network config.

```yaml
  frontend:
    build:
      context: ./frontend
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:4000/api}
    depends_on:
      backend:
        condition: service_healthy
    environment:
      INTERNAL_API_URL: http://backend:4000/api
```

- `build.args` is how the `.env` file's `NEXT_PUBLIC_API_URL` reaches the Dockerfile's
  `ARG` — this only takes effect on `docker compose build` / the build step of `up
  --build`, never on a plain restart.
- `INTERNAL_API_URL` is a normal runtime `environment:` entry — read fresh by the
  Node process on every request, exactly the "no rebuild needed" half of the split
  described in section 4.

```yaml
volumes:
  db_data:

networks:
  trailnest:
    driver: bridge
```

Every service also lists `networks: [trailnest]`, putting them all on the same
user-defined bridge network. (Compose creates a default network automatically even
without this, but naming it explicitly makes the `docker network ls` output legible
and is one less thing to wonder about later.)

## 6. Running it — the actual commands, in order

```bash
# one-time setup
cp .env.example .env
# edit .env: fill in DB_ROOT_PASSWORD, DB_PASSWORD, JWT_SECRET with real values

# build both custom images (db uses the public mysql:8.0 image, nothing to build)
docker compose build

# start everything, detached (-d = don't tie up your terminal)
docker compose up -d

# watch it come up
docker compose ps
```

`docker compose ps` should eventually show all three as `healthy`. If `frontend` or
`backend` shows `starting`, give it a few more seconds — `start_period` in the
healthcheck is intentionally forgiving of slow boots.

**Useful commands while iterating:**

```bash
docker compose logs -f backend        # tail one service's logs
docker compose logs -f                # tail all of them, interleaved

docker compose up -d --build frontend # rebuild + restart just one service
                                       # (use this after any code change — Compose
                                       # does NOT auto-rebuild on file changes)

docker exec -it trailnest-backend-1 sh   # shell into a running container
docker exec trailnest-backend-1 node -e "console.log(process.env.DB_HOST)"

docker compose down                   # stop and remove containers (data volume kept)
docker compose down -v                # also delete db_data — next `up` starts fresh
```

**Verifying it's actually working**, not just "healthy":

```bash
curl http://localhost:4000/api/health        # {"status":"ok","db":"connected"}
curl http://localhost:4000/api/properties    # real seeded data, through the container
curl http://localhost:3000/                  # SSR page — proves frontend→backend
                                              # container-to-container networking works
```

That last check matters more than it looks: a 200 from `curl localhost:3000/` only
proves the frontend container itself is up. Whether the *page content* actually
contains real property names is what proves the harder part — that server-rendered
code inside the frontend container successfully reached the backend container over
`INTERNAL_API_URL`, not just that both containers happen to be running.

## 7. Redoing this yourself on a new project — the checklist

1. **Decide the service boundary.** One container per independently-deployable piece
   (here: db / backend / frontend). Each gets its own directory and, if it's your own
   code, its own Dockerfile.
2. **Check your runtime's minimum version requirement** (e.g. a framework's
   `engines` field in `package.json`) before picking a base image tag — don't guess.
3. **Write each Dockerfile as `deps → build → runtime` stages.** Copy only
   manifest/lockfiles before `RUN npm ci` so dependency installation stays cached
   across source-only changes.
4. **Run as a non-root user** in the final stage if the base image provides one.
5. **Add a `HEALTHCHECK`** that hits something real (a health endpoint, or the root
   page) — not just "process is running," which tells you nothing about whether the
   app can actually serve traffic.
6. **Write a `.dockerignore`** before your first build — `node_modules`, `.env`,
   `.git`, build output directories.
7. **In `docker-compose.yml`:** one service per container, a named volume for
   anything with state (databases), `depends_on` + `condition: service_healthy` for
   startup ordering, and a single `.env` file (gitignored, with a committed
   `.env.example`) as the source of all configurable values.
8. **If your frontend framework has a build-time/runtime env split** (Next.js's
   `NEXT_PUBLIC_*` is the common case, but plenty of bundlers do this) — figure out up
   front which values are needed by browser code (must be a build arg) versus
   server-only code (can be a plain runtime env var), the same way section 4 does
   here. This is the single most common source of "works with `npm run dev`, breaks
   in Docker" bugs.
9. **Build, bring up, then verify with real requests** — not just `docker compose
   ps` showing green. Hit an endpoint that proves data actually flows between
   containers, the way the SSR check does here.

## 8. What's next

EC2 deployment: provisioning an Ubuntu instance, security groups (SSH from your IP
only; HTTP/HTTPS public), installing Docker + the Compose plugin, and getting this
same `docker-compose.yml` running there with real secrets instead of local dev ones.
