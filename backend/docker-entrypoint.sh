#!/bin/bash
set -e

echo "Waiting for MySQL at ${DB_HOST:-mysql}:3306..."
for i in $(seq 1 60); do
  if bundle exec ruby -e "
    require 'mysql2'
    c = Mysql2::Client.new(
      host: ENV['DB_HOST'] || 'mysql',
      username: 'root',
      password: ENV['DB_PASSWORD'] || 'password'
    )
    c.query('SELECT 1')
    c.close
  " 2>/dev/null; then
    echo "MySQL is ready."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "MySQL did not become ready in time."
    exit 1
  fi
  echo "Attempt $i/60: MySQL not ready, sleeping 2s..."
  sleep 2
done

bundle exec rails db:create
bundle exec rails db:migrate

exec bundle exec rails server -b 0.0.0.0 -p 3000
