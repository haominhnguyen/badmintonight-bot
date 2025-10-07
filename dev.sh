#!/bin/bash

# Development script with hot reload
echo "🚀 Starting Badminton Bot in development mode..."

# Set development environment
export NODE_ENV=development

# Start only the database container first
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d postgres

# Wait for the database to be healthy
until docker-compose -f docker-compose.yml -f docker-compose.override.yml exec postgres pg_isready -U badminton_user -d badminton_bot; do
  echo "Waiting for Postgres to be ready..."
  sleep 2
done

# Check if Prisma migration history exists
if [ ! -d "prisma/migrations" ] || [ -z "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "No Prisma migrations found. Creating initial migration..."
  npx prisma migrate dev --name init
else
  echo "Prisma migrations found. Deploying..."
  npx prisma migrate deploy
fi

# Always generate Prisma client
# npx prisma generate
# for test only
npm install
npx prisma generate
npx prisma migrate deploy

# Start the rest of the services with hot reload
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build
