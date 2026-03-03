#!/bin/bash
# Start the PostgreSQL test server in Docker
# Uses port 25432 to avoid conflicts with any local PostgreSQL instance

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting PostgreSQL test server on port 25432..."
docker compose -f "${SCRIPT_DIR}/docker-compose.yml" up -d

echo "Waiting for PostgreSQL to be ready..."
until docker compose -f "${SCRIPT_DIR}/docker-compose.yml" exec -T postgresql-test pg_isready -U postgres 2>/dev/null; do
	sleep 2
	echo "  ...still waiting"
done

echo "PostgreSQL test server is ready on port 25432"
echo "  Host: 127.0.0.1"
echo "  Port: 25432"
echo "  User: postgres"
echo "  Password: testpassword"
echo "  Database: testdb"
