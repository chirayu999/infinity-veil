# NIGHTWATCH — Local Development Setup

Use Docker to run the full stack (MySQL, Redis, Rails, Sidekiq, frontend) with one command. Seed the database and open the app.

---

## Prerequisites

- Docker and Docker Compose installed on your machine.
- Repo cloned (e.g. to `~/elastic-ai/infinity-veil` or your path).

---

## 1. One-time setup

**Create backend env file** (required for `docker compose` to start):

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set your Elastic/Kibana and Slack values. For a minimal run you can leave them empty; Kibana and Slack features will not work until you set them.

---

## 2. Seed the database and start all servers

From the repo root:

```bash
docker compose up --build
```

On first run, the backend runs `db:create` and `db:migrate` automatically.

**Seed the database** (optional, run once after the stack is up):

```bash
docker compose run --rm backend bundle exec rails db:seed
```

Open the app at **http://localhost:8080**. The API (and Sidekiq Web if mounted) is on port 3000.

---

## 3. After code or dependency changes

- **Code changes:** Rails and Vite pick up changes automatically (source is mounted). No restart needed.
- **Dependency or env changes:** Restart the affected services:

  ```bash
  docker compose restart backend sidekiq frontend
  ```

  Or rebuild and restart:

  ```bash
  docker compose up -d --build
  ```

---

## 4. Env vars for Docker

`docker-compose.yml` sets `DB_HOST`, `REDIS_URL`, `DB_PASSWORD`, `FRONTEND_URL`, and `NIGHTWATCH_DASHBOARD_URL` for the backend. Secrets (Kibana, Slack, agent IDs) are read from `backend/.env`. Keep that file out of version control.

---

## 5. Optional: run in background

```bash
docker compose up -d --build
```

Logs: `docker compose logs -f`. Stop: `docker compose down`.

---

## 6. Sidekiq Queue Reference

| Queue      | Job                               | Trigger                               |
| ---------- | --------------------------------- | ------------------------------------- |
| `critical` | `HuntCycleJob`                    | Every 15 min (cron) + manual          |
| `default`  | `SlackNotificationJob`            | After high-confidence threat detected |
| `default`  | `SlackInteractionJob`             | Slack button click webhook            |
| `default`  | `AutoActionsJob`                  | After high-confidence threat detected |
| `low`      | `FalsePositiveAnalysisJob`        | Daily at 2:00 AM (cron)               |
| `low`      | `SyncExceptionToElasticsearchJob` | After exception pattern confirmed     |

---

## 7. Troubleshooting

**Docker: `no such file or directory` for backend/.env**

Create the env file before running `docker compose up`: `cp backend/.env.example backend/.env`. Edit with your secrets (or leave placeholders for a minimal run).

**MySQL: `Access denied for user 'root'@'localhost'`** (local setup only)

See [Local setup without Docker](#appendix-local-setup-without-docker) and the MySQL secure-install steps there.

**Redis / Sidekiq / ActionCable issues**

Check that the stack is up (`docker compose ps`) and that `backend/.env` is not overriding `REDIS_URL` in a way that breaks the backend (Docker sets `REDIS_URL=redis://redis:6379/0`).

---

## Appendix: Local setup without Docker

If you cannot or prefer not to use Docker, you can run each service on the host.

**Prerequisites:** WSL 2 with Ubuntu 22.04+ (or similar), Ruby 3.2+ (e.g. rbenv/rvm), Node.js 18+, MySQL, Redis.

1. **MySQL:** Install, start, set root password to `password`, create DBs:
   ```bash
   sudo apt install -y mysql-server && sudo service mysql start
   # In MySQL: ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';
   cd backend && bundle exec rails db:create
   ```

2. **Redis:** Install and start:
   ```bash
   sudo apt install -y redis-server && sudo service redis-server start
   ```

3. **Backend env:** Create `backend/.env` from `backend/.env.example`. Set `DB_HOST=localhost`, `REDIS_URL=redis://localhost:6379/0`, and your Kibana/Slack keys.

4. **Backend deps and DB:** `cd backend && bundle install && bundle exec rails db:migrate db:seed`

5. **Start all servers** in separate terminals:
   - Terminal 1: `sudo service mysql start` (if not already)
   - Terminal 2: `sudo service redis-server start` (if not already)
   - Terminal 3: `cd backend && bundle exec rails s -p 3000`
   - Terminal 4: `cd backend && bundle exec sidekiq -C config/sidekiq.yml`
   - Terminal 5: `cd frontend && npm install && npm run dev`

Frontend runs at http://localhost:5173 (or the port in `frontend/vite.config.ts`). It proxies `/api` and `/cable` to the Rails server on port 3000.

**Troubleshooting (local):** MySQL "Access denied" → secure root with `mysql_native_password` as above. Redis "Could not connect" → `sudo service redis-server start` and `redis-cli ping`. Sidekiq/ActionCable → ensure `REDIS_URL` in `backend/.env` matches the running Redis.
