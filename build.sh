#!/bin/bash

# Detect architecture
ARCH=$(uname -m)

echo "Detected architecture: $ARCH"

if [[ "$ARCH" == "arm64" || "$ARCH" == "aarch64" ]]; then
    echo "Using ARM64 Dockerfile"
    export DOCKERFILE=Dockerfile.arm64
else
    echo "Using standard Dockerfile"
    export DOCKERFILE=Dockerfile
fi

# Build and run
docker-compose up --build
