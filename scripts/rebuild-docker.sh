#!/bin/bash

# Script to rebuild Docker image with updated dependencies
# Usage: ./scripts/rebuild-docker.sh

set -e

echo "🔄 Rebuilding Docker image with updated dependencies..."

# Stop any running containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down || true

# Remove old images
echo "🗑️ Removing old images..."
docker rmi badminton-bot-app:latest || true
docker rmi badminton-bot-app:arm64 || true

# Build new image
echo "🏗️ Building new Docker image..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Test the image
echo "🧪 Testing the new image..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for container to start
echo "⏳ Waiting for container to start..."
sleep 10

# Check if container is running
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "✅ Docker container is running successfully!"
    echo "🌐 Application should be available at: http://localhost:3100"
    echo "📚 Swagger documentation: http://localhost:3100/api-docs"
else
    echo "❌ Docker container failed to start"
    echo "📋 Container logs:"
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi

echo "🎉 Docker rebuild completed successfully!"
