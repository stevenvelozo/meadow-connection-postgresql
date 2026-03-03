#!/bin/bash
# Stop and remove the PostgreSQL test server Docker container

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Stopping PostgreSQL test server..."
docker compose -f "${SCRIPT_DIR}/docker-compose.yml" down -v

echo "PostgreSQL test server stopped and volumes removed."
