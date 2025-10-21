#!/bin/bash

# Script to push Docker images with version tags to registry
# Usage: ./scripts/docker-push-version.sh [registry-url]

set -e

# Get registry URL from parameter or use default
REGISTRY=${1:-"your-registry.com"}
echo "🏷️ Pushing Docker images to registry: $REGISTRY"

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
echo "📦 Package version: $VERSION"

# Get git commit hash
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "🔗 Git commit: $GIT_COMMIT"

# Build image tags with registry
IMAGE_NAME="$REGISTRY/badminton-bot"
TAGS=(
    "$IMAGE_NAME:latest"
    "$IMAGE_NAME:$VERSION"
    "$IMAGE_NAME:$VERSION-$GIT_COMMIT"
    "$IMAGE_NAME:v$VERSION"
)

echo "🏗️ Building Docker image..."
docker build -t $IMAGE_NAME .

echo "🏷️ Tagging images..."
for tag in "${TAGS[@]}"; do
    echo "  Tagging: $tag"
    docker tag badminton-bot $tag
done

echo "📤 Pushing images to registry..."
for tag in "${TAGS[@]}"; do
    echo "  Pushing: $tag"
    docker push $tag
done

echo "✅ Docker images pushed successfully!"
echo ""
echo "📦 Images pushed:"
for tag in "${TAGS[@]}"; do
    echo "  - $tag"
done

echo ""
echo "🌐 Images are now available at:"
echo "  $REGISTRY/badminton-bot:latest"
echo "  $REGISTRY/badminton-bot:$VERSION"
echo "  $REGISTRY/badminton-bot:$VERSION-$GIT_COMMIT"
echo "  $REGISTRY/badminton-bot:v$VERSION"
