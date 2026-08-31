# Kabatu Farm — Setup & Deployment

A full-stack farm management app for Kabatu Farm (Nairobi County, Kenya) — dairy cattle, sheep,
poultry, crops, inventory, tasks, and financials, for a multi-user, multi-enterprise operation.

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS, PocketBase v0.23.4
(self-hosted), Docker Compose on an Ubuntu VPS behind Nginx + Let's Encrypt.

**Roles (exactly six, enforced by PocketBase collection rules — see `lib/authz.ts`):**
`owner | farm_manager | enterprise_lead | worker | vet_agronomist | accountant`

**Current status:** all 8 modules (Cattle, Dairy records, Sheep, Poultry, Crops, Inventory,
Tasks, Financials) are wired to real PocketBase collections — no mock data remains except one
unused leftover array. See `tracker.md` for a detailed, continuously-updated log of what's done,
what's verified against a live instance vs. build-only, and what's still open. `HANDOFF.md`
documents the original module-by-module migration process, kept for history.

---

## 1. Local development

Two backends run side by side locally: **Next.js** (this app) and **PocketBase** (the
database/API server). You can run PocketBase either as a native binary or via Docker Compose —
pick whichever is more convenient.

### Install Node.js

```bash
sudo dnf install nodejs npm   # or apt, depending on distro
node -v   # confirm 20.9+ (Next.js 16 / React 19 requirement)
```

### Get the project onto disk and install dependencies

```bash
git clone <this repo> ~/dev/kabatu-farm
cd ~/dev/kabatu-farm
npm install
```

### Option A — PocketBase as a native binary (fastest local loop)

```bash
mkdir -p ~/dev/pocketbase && cd ~/dev/pocketbase
# Download the v0.23.4 Linux amd64 build from
# https://github.com/pocketbase/pocketbase/releases — matches the version pinned in
# pocketbase/Dockerfile, so local migrations behave the same as production.
unzip pocketbase_0.23.4_linux_amd64.zip
cp -r ~/dev/kabatu-farm/pb_migrations ./pb_migrations
./pocketbase serve --dev   # --dev surfaces pb_hooks runtime errors in the console
```
This starts PocketBase at `http://127.0.0.1:8090`. On first run, open
`http://127.0.0.1:8090/_/` to create your superuser account, then apply migrations:
```bash
./pocketbase migrate up
```

### Option B — PocketBase via Docker Compose (matches production more closely)

```bash
cp env.example .env   # or .env.example — both are kept in sync; see note below
docker compose up pocketbase
```
This builds `pocketbase/Dockerfile` (pinned to v0.23.4) and serves it on
`http://127.0.0.1:8095` (the default `KABATU_PB_HOST_PORT`), bind-mounting
`./pb_data`, `./pb_migrations`, and `./pb_hooks` so migrations/hooks are picked up without
rebuilding the image.

### Point Next.js at your local PocketBase

```bash
cp .env.local.example .env.local
# Defaults to http://127.0.0.1:8090 (Option A). If using Option B, change it to
# http://127.0.0.1:8095 to match KABATU_PB_HOST_PORT.
```

### Run the app

```bash
npm run dev
```
Visit `http://localhost:3000`.

> Note on env files: `.env.example` and `env.example` are currently duplicates (one with, one
> without the leading dot). Keep both in sync if you edit either — this hasn't been consolidated
> yet.

---

## 2. Project structure
