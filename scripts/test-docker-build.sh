#!/bin/bash

# Simple script to test Docker build locally
# Usage: ./scripts/test-docker-build.sh

set -e

echo "🧪 Testing Docker build locally..."

# Build the image
echo "🏗️ Building Docker image..."
docker build -t badminton-bot-test .

# Test if the image can start (without database)
echo "🧪 Testing image startup..."
docker run --rm -d --name badminton-test -p 3100:3100 badminton-bot-test

# Wait a moment
sleep 5

# Check if container is still running
if docker ps | grep -q "badminton-test"; then
    echo "✅ Docker image built and started successfully!"
    echo "🌐 Test server running on: http://localhost:3100"
    echo "📚 Swagger docs: http://localhost:3100/api-docs"
    
    # Show container logs
    echo "📋 Container logs:"
    docker logs badminton-test
    
    # Clean up
    echo "🧹 Cleaning up..."
    docker stop badminton-test
    docker rmi badminton-bot-test
    
    echo "🎉 Docker build test completed successfully!"
else
    echo "❌ Docker container failed to start"
    echo "📋 Container logs:"
    docker logs badminton-test
    docker stop badminton-test || true
    docker rmi badminton-bot-test || true
    exit 1
fi
