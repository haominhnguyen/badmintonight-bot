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

# Generate Prisma client if not generated
echo "Checking for Prisma client..."
if [ ! -d "node_modules/.prisma/client" ]; then
  echo "Prisma client not found. Generating..."
  npx prisma generate
else
  echo "Prisma client already generated."
fi

# Start the rest of the services with hot reload
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build
