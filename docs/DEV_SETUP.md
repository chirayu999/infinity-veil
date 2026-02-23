# NIGHTWATCH — Local Development Setup

Step-by-step guide to set up MySQL, Redis, and Sidekiq on WSL Ubuntu for the Rails backend.

---

## Prerequisites

- WSL 2 with Ubuntu 22.04+
- Ruby 3.2+ (via `rbenv` or `rvm`)
- Node.js 18+ (for the frontend)
- The repo cloned to `~/elastic-ai`

---

## 1. MySQL Setup

### 1.1 Install MySQL

```bash
sudo apt update
sudo apt install -y mysql-server
sudo service mysql start
```

Verify it's running:

```bash
sudo service mysql status
```

### 1.2 Secure the installation and set root password

```bash
sudo mysql
```

Inside the MySQL shell:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';
FLUSH PRIVILEGES;
EXIT;
```

> Use `password` for local dev or choose your own. Update `backend/config/database.yml` to match.

### 1.3 Update database.yml

Edit `backend/config/database.yml` — set the root password:

```yaml
default: &default
  adapter: mysql2
  encoding: utf8mb4
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  username: root
  password: password        # <-- set this
  host: <%= ENV.fetch("DB_HOST") { "localhost" } %>
```

### 1.4 Create the database

```bash
cd backend
bundle exec rails db:create
```

Expected output:

```
Created database 'nightwatch_development'
Created database 'nightwatch_test'
```

---

## 2. Redis Setup

### 2.1 Install Redis

```bash
sudo apt install -y redis-server
```

### 2.2 Start Redis

```bash
sudo service redis-server start
```

### 2.3 Verify

```bash
redis-cli ping
# Expected: PONG
```

Redis will run on `redis://localhost:6379` by default. The Rails app reads `REDIS_URL` from the environment (falls back to `redis://localhost:6379/0`).

---

## 3. Environment Variables

Create `backend/.env` (never commit this):

```bash
# backend/.env

# MySQL
DB_HOST=localhost

# Redis
REDIS_URL=redis://localhost:6379/0

# Elastic / Kibana
KIBANA_URL=https://YOUR-DEPLOYMENT.kb.us-east-1.aws.elastic.cloud
KIBANA_API_KEY=YOUR_BASE64_API_KEY

# Elastic Agent IDs (from Kibana Agent Builder)
COMMANDER_AGENT_ID=your-commander-agent-id
SCANNER_AGENT_ID=your-scanner-agent-id
TRACER_AGENT_ID=your-tracer-agent-id
ADVOCATE_AGENT_ID=your-advocate-agent-id

# Slack
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_CHANNEL=#security-ops

# App
NIGHTWATCH_DASHBOARD_URL=http://localhost:5173
```

Install `dotenv-rails` to auto-load this in development (add to `Gemfile`):

```ruby
gem "dotenv-rails", groups: [:development, :test]
```

---

## 4. Bundle Install

```bash
cd backend
bundle install
```

---

## 5. Run Database Migrations

```bash
cd backend
bundle exec rails db:migrate
```

---

## 6. Start Sidekiq

Sidekiq requires Redis and the Rails app to be running.

### 6.1 Start the Rails API server

```bash
cd backend
bundle exec rails server -p 3000
```

### 6.2 Start Sidekiq (in a second terminal)

```bash
cd backend
bundle exec sidekiq -C config/sidekiq.yml
```

The `config/sidekiq.yml` file configures queues. Sidekiq-Cron will pick up `config/schedule.yml` automatically on boot.

### 6.3 Verify Sidekiq Web UI (optional)

If you add `mount Sidekiq::Web => '/sidekiq'` to `routes.rb`, visit:

```
http://localhost:3000/sidekiq
```

---

## 7. Start the Frontend

```bash
cd frontend    # or the repo root (symlinked)
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`. It proxies API calls to `http://localhost:3000`.

---

## 8. Full Process Checklist

Run these in separate terminals:


| Terminal | Command                                                   | Purpose                       |
| -------- | --------------------------------------------------------- | ----------------------------- |
| 1        | `sudo service mysql start`                                | MySQL database                |
| 2        | `sudo service redis-server start`                         | Redis (ActionCable + Sidekiq) |
| 3        | `cd backend && bundle exec rails s -p 3000`               | Rails API                     |
| 4        | `cd backend && bundle exec sidekiq -C config/sidekiq.yml` | Background jobs               |
| 5        | `cd frontend && npm run dev`                              | React frontend                |


---

## 9. Sidekiq Queue Reference


| Queue      | Job                               | Trigger                               |
| ---------- | --------------------------------- | ------------------------------------- |
| `critical` | `HuntCycleJob`                    | Every 15 min (cron) + manual          |
| `default`  | `SlackNotificationJob`            | After high-confidence threat detected |
| `default`  | `SlackInteractionJob`             | Slack button click webhook            |
| `default`  | `AutoActionsJob`                  | After high-confidence threat detected |
| `low`      | `FalsePositiveAnalysisJob`        | Daily at 2:00 AM (cron)               |
| `low`      | `SyncExceptionToElasticsearchJob` | After exception pattern confirmed     |


---

## 10. Troubleshooting

**MySQL: `Access denied for user 'root'@'localhost'`**

```bash
sudo mysql -u root
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';
FLUSH PRIVILEGES;
EXIT;
```

**Redis: `Could not connect to Redis`**

```bash
sudo service redis-server start
redis-cli ping   # Should return PONG
```

**Sidekiq not processing jobs**

Check that `REDIS_URL` matches the running Redis instance. Run `redis-cli ping` and check `bundle exec sidekiq` logs.

**ActionCable WebSocket not connecting**

Make sure `config/cable.yml` has `adapter: redis` for development and `REDIS_URL` is set correctly.