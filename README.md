# Kabatu Farm — Setup

Two backends are involved: **Next.js** (the app you've been looking at) and **PocketBase**
(the database/API server). Locally on Fedora you'll run both side by side. On the Ubuntu
VPS, both also run side by side — just as long-lived services instead of dev processes.

## 1. Fedora — first-time setup

### Install Node.js
PocketBase ships as a single binary (no Node needed for it), but Next.js needs Node 18+.

```bash
sudo dnf install nodejs npm
node -v   # confirm 18+
```

### Get the project onto disk
Unzip this project (or `git clone` it once you've pushed it somewhere) into a working
folder, e.g. `~/dev/kabatu-farm`.

### Install the app's dependencies
```bash
cd ~/dev/kabatu-farm
npm install
```

### Set up PocketBase locally
```bash
mkdir -p ~/dev/pocketbase && cd ~/dev/pocketbase
# Download the Linux amd64 build for your installed PocketBase version from
# https://github.com/pocketbase/pocketbase/releases — grab the .zip, then:
unzip pocketbase_*_linux_amd64.zip
./pocketbase serve
```
This starts PocketBase at `http://127.0.0.1:8090`. On first run, open
`http://127.0.0.1:8090/_/` in a browser to create your superuser (admin) account.

### Run the collection migrations
Copy `pb_migrations/001_cattle_collection.js` into `~/dev/pocketbase/pb_migrations/`,
then:
```bash
./pocketbase migrate up
```
(Repeat this pattern as you add more collection migrations — one per entity in
`types/farm.ts`.)

### Point Next.js at your local PocketBase
```bash
cd ~/dev/kabatu-farm
cp .env.local.example .env.local
# .env.local already defaults to http://127.0.0.1:8090 — no edit needed for local dev
```

### Run the app
```bash
npm run dev
```
Visit `http://localhost:3000`. Both processes (`pocketbase serve` and `npm run dev`)
need to be running at the same time — two terminal tabs, or a tool like `tmux`.

---

## 2. Replacing Supabase with PocketBase — what actually changes

Nothing needs "replacing." The tech-stack proposal early on suggested Supabase, but no
Supabase code was ever written — every screen so far runs on the mock arrays in
`lib/mock/*.ts`. The only backend-specific file that exists is `lib/pb.ts`, and it's
already written for PocketBase. So the real remaining work, screen by screen, is:

1. Create the PocketBase collection (migration file, same pattern as `001_cattle_collection.js`).
2. Replace the mock import in the relevant page/component with a call through `lib/pb.ts`.
3. Delete the corresponding array from `lib/mock/*.ts` once nothing references it.

Nothing in `types/farm.ts`, the components, or the page layouts needs to change —
they were written against the interfaces, not against Supabase.

---

## 3. Ubuntu VPS — deployment (once you're ready to ship)

```
/opt/kabatu-farm/
├── pocketbase              # the binary
├── pb_data/                # PocketBase's SQLite DB + uploaded files (gitignored)
├── pb_migrations/          # collection schema, versioned in git
├── backups/                # local staging dir for the backup script (gitignored)
├── deploy/
│   ├── pocketbase.service
│   ├── kabatu-backup.sh
│   ├── kabatu-backup.service
│   └── kabatu-backup.timer
└── app/                    # this Next.js project, built with `npm run build`
```

Rough sequence:
1. `useradd -r -m kabatu` — dedicated service user, matches the `User=kabatu` lines in the `.service` files.
2. Copy the PocketBase binary + `pb_migrations/` to `/opt/kabatu-farm/`, run migrations once.
3. Install `deploy/pocketbase.service`, enable it (`systemctl enable --now pocketbase`).
4. `rclone config` once, as the `kabatu` user, to authorize Google Drive.
5. Install `deploy/kabatu-backup.service` + `.timer`, enable the timer.
6. Build the Next.js app (`npm run build`) and run it with `npm start` under its own
   systemd service (same pattern as `pocketbase.service`, different `ExecStart`), or
   with a process manager like `pm2` if you'd rather not hand-write another unit file.
7. Put Caddy or Nginx in front of both — Next.js on one hostname/path, PocketBase's
   `/api/` and `/_/` on another (or a subdomain like `pb.kabatufarm.example.com`) —
   so neither is exposed to the internet without TLS.

I haven't written the Next.js systemd service or the Caddy/Nginx config yet — happy to
once PocketBase is running and you're ready for that step.
# kabatu-farm
