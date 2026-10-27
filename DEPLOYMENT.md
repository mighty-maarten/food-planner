# Deployment

Food Planner runs on the home server (Proxmox) in its own LXC, behind the reverse proxy LXC that
serves every public site. The steady-state reference of the server is `homeserver-setup.md` in
the `home-server` repository; the one-time move to the shared proxy is
`proxy-cutover-2026-10.md` there.

```
Internet → Telenet modem (bridge) → UCG-Ultra (port forward 80/443)
  → LXC 104 proxy (192.168.1.97): Caddy, HTTPS for food-planner.mighty.be and img-manager.mighty.be
      → LXC 105 food-planner (192.168.1.96:3000)
          └── Docker Compose (/opt/food-planner)
              ├── app: the API serving the built client (Node 26)
              └── postgres: PostgreSQL 18, data in ./data/postgres
```

| What        | Value                                                     |
| ----------- | --------------------------------------------------------- |
| URL         | https://food-planner.mighty.be                            |
| LXC         | 105 `food-planner`, 192.168.1.96 (UniFi DHCP reservation) |
| Directory   | `/opt/food-planner` (git clone of this repository)        |
| Config      | `/opt/food-planner/.env.production` (not in git)          |
| Health      | `curl http://192.168.1.96:3000/status`                    |
| Logs        | `docker compose logs -f app` (JSON lines)                 |
| DB backups  | `/opt/food-planner/backups` (nightly dump) + vzdump       |

## Deploy a new version

```sh
ssh root@192.168.1.96
cd /opt/food-planner
git pull
docker compose up -d --build
docker compose logs -f app      # "Nest application successfully started", Ctrl+C to stop
```

Migrations run when the app starts, before it accepts requests. The installed app picks up the new
version on its next start (the service worker updates itself).

### Roll back

```sh
git log --oneline -5
git checkout <previous commit>
docker compose up -d --build
```

A migration is not undone by this. When a release added one, restore the dump of the night before
(see "Restore the database") or fix forward.

## Accounts

There is no sign-up. Run the user CLI in the app container (it asks for the password):

```sh
docker compose exec app npm run user -- list
docker compose exec app npm run user -- create --email jane@example.com --name Jane
docker compose exec app npm run user -- set-password --email jane@example.com   # also logs out all devices
docker compose exec app npm run user -- delete --email jane@example.com
```

## Import the old menus

Once, after the first start. The reviewed file is on the Mac (`import/review.txt`, see the README):

```sh
# On the Mac
scp import/review.txt root@192.168.1.96:/tmp/review.txt

# On the LXC
cd /opt/food-planner
docker compose cp /tmp/review.txt app:/tmp/review.txt
docker compose exec app npm run import -- load --review /tmp/review.txt --dry-run
docker compose exec app npm run import -- load --review /tmp/review.txt
rm /tmp/review.txt
```

Running it again is safe: existing dishes only get their count updated.

## Configuration

`.env.production`, from `.env.production.example`. All variables are in the README
("Configuration"). The essentials:

- `APP_ENV=production`, `TRUST_PROXY_HOPS=1` (Caddy on the proxy LXC)
- `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME`: the postgres container creates the
  database and its user from these on its first start
- `JWT_SECRET`: `openssl rand -base64 48`. Changing it logs out every device.

After a change: `docker compose up -d`.

## Backups

- **vzdump** (Proxmox, all LXCs): daily at 02:00 to `/mnt/backups`, synced to
  `s3://mighty-proxmox-backups` at 03:00. Restores the whole LXC.
- **Database dump** (`scripts/backup-db.sh`): daily at 01:30 to `/opt/food-planner/backups`,
  14 days kept. Part of the vzdump of the same night, so it is off-site too. Restores only the
  database, into any PostgreSQL 18. Cron line (`crontab -e` as root):

    ```
    30 1 * * * /opt/food-planner/scripts/backup-db.sh >> /var/log/food-planner-backup.log 2>&1
    ```

### Restore the database

```sh
cd /opt/food-planner
docker compose stop app
docker compose cp backups/food-planner-YYYY-MM-DD.dump postgres:/tmp/restore.dump
docker compose exec postgres sh -c \
  'pg_restore -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" --clean --if-exists /tmp/restore.dump'
docker compose start app
```

## First installation

Done once; the details of the shared steps (LXC, DHCP reservation, Docker) are in the cutover
runbook in the `home-server` repository.

1. **LXC 105** `food-planner` from the Debian 13 template: unprivileged, `nesting=1,keyctl=1`
   (Docker), 2 cores, 2 GB RAM, 16 GB disk, `ip=dhcp`. Start it, note its MAC, add the UniFi
   DHCP reservation → `192.168.1.96`, reboot it.
2. **Docker**: `apt update && apt install -y curl git && curl -fsSL https://get.docker.com | sh`
3. **Code**: a read-only deploy key for the private repository:

    ```sh
    ssh-keygen -t ed25519 -f ~/.ssh/food-planner -N '' -C food-planner-lxc
    cat ~/.ssh/food-planner.pub   # GitHub → repo → Settings → Deploy keys → Add (read-only)
    printf 'Host github.com\n  IdentityFile ~/.ssh/food-planner\n' >> ~/.ssh/config
    git clone git@github.com:mighty-maarten/food-planner.git /opt/food-planner
    ```

4. **Config**: `cp .env.production.example .env.production`, fill in the secrets
   (`openssl rand -base64 24` for the database password, `openssl rand -base64 48` for
   `JWT_SECRET`), `chmod 600 .env.production`.
5. **Start**: `docker compose up -d --build`, then `curl http://localhost:3000/status` →
   `{"status":"ok"}`.
6. **Accounts** and **import** (above), the **backup cron line** (above).
7. **Proxy**: `food-planner.mighty.be` in the Caddyfile of the proxy LXC, DNS A record, Uptime
   Kuma monitor on `https://food-planner.mighty.be/status`.

## Troubleshooting

- **App restarts in a loop**: `docker compose logs app`. An invalid `.env.production` is reported
  by name (`Invalid configuration: ...`).
- **502 from the proxy**: is the app up (`docker compose ps`, healthy)? Is 192.168.1.96:3000
  reachable from the proxy LXC (`curl http://192.168.1.96:3000/status`)?
- **Live updates don't arrive** (shop mode): the event stream needs the proxy to stream
  `text/event-stream` responses, which Caddy does by default. Check
  `curl -N -H "Authorization: Bearer <token>" https://food-planner.mighty.be/api/plans/<id>/events`
  prints a `data: {"kind":"ping"}` line every 25 seconds.
- **Logged out on every visit**: the refresh cookie is `Secure`; the site must be opened over
  HTTPS (the proxy), not on `http://192.168.1.96:3000`.
