#!/bin/bash

# Development script with hot reload
echo "🚀 Starting Badminton Bot in development mode..."

# Set development environment
export NODE_ENV=development

# Start with nodemon for hot reload
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build
