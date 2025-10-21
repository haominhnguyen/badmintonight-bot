#!/bin/bash

# Script to tag Docker images with version from package.json
# Usage: ./scripts/docker-tag-version.sh

set -e

echo "🏷️ Tagging Docker images with version..."

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
echo "📦 Package version: $VERSION"

# Get git commit hash
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "🔗 Git commit: $GIT_COMMIT"

# Get current timestamp
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
echo "⏰ Timestamp: $TIMESTAMP"

# Build image tags
IMAGE_NAME="badminton-bot"
TAGS=(
    "$IMAGE_NAME:latest"
    "$IMAGE_NAME:$VERSION"
    "$IMAGE_NAME:$VERSION-$GIT_COMMIT"
    "$IMAGE_NAME:$VERSION-$TIMESTAMP"
    "$IMAGE_NAME:v$VERSION"
)

echo "🏗️ Building Docker image..."
docker build -t $IMAGE_NAME .

echo "🏷️ Tagging images..."
for tag in "${TAGS[@]}"; do
    echo "  Tagging: $tag"
    docker tag $IMAGE_NAME $tag
done

echo "📋 Available tags:"
docker images | grep $IMAGE_NAME

echo "✅ Docker images tagged successfully!"
echo ""
echo "📦 Image tags created:"
for tag in "${TAGS[@]}"; do
    echo "  - $tag"
done

echo ""
echo "🚀 To push to registry:"
echo "  docker push $IMAGE_NAME:latest"
echo "  docker push $IMAGE_NAME:$VERSION"
echo "  docker push $IMAGE_NAME:$VERSION-$GIT_COMMIT"
echo ""
echo "🧪 To test locally:"
echo "  docker run -p 3100:3100 $IMAGE_NAME:$VERSION"
