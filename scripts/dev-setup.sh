#!/bin/bash

# PulseVault Development Setup Script
# This script helps set up a local development environment

set -e

echo "🩸 PulseVault Development Setup"
echo "================================"

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 20+"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker not found. Redis container won't be started."
    SKIP_DOCKER=1
fi

echo "✅ Prerequisites OK"

# Navigate to pulsevault directory
cd "$(dirname "$0")/../pulsevault"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Copy .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file..."
    cp .env.example .env
    
    # Generate a secure HMAC secret
    SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-me-$(date +%s)")
    
    # Replace the secret in .env
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/HMAC_SECRET=.*/HMAC_SECRET=$SECRET/" .env
    else
        sed -i "s/HMAC_SECRET=.*/HMAC_SECRET=$SECRET/" .env
    fi
    
    echo "✅ .env created with secure HMAC_SECRET"
else
    echo "✅ .env already exists"
fi

# Create storage directories
echo ""
echo "Creating storage directories..."
STORAGE_BASE="/tmp/pulsevault"
mkdir -p "$STORAGE_BASE"/{uploads,videos,audit}

# Update .env to use temp storage for development
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|MEDIA_ROOT=.*|MEDIA_ROOT=$STORAGE_BASE|" .env
    sed -i '' "s|UPLOAD_DIR=.*|UPLOAD_DIR=$STORAGE_BASE/uploads|" .env
    sed -i '' "s|VIDEO_DIR=.*|VIDEO_DIR=$STORAGE_BASE/videos|" .env
    sed -i '' "s|AUDIT_DIR=.*|AUDIT_DIR=$STORAGE_BASE/audit|" .env
else
    sed -i "s|MEDIA_ROOT=.*|MEDIA_ROOT=$STORAGE_BASE|" .env
    sed -i "s|UPLOAD_DIR=.*|UPLOAD_DIR=$STORAGE_BASE/uploads|" .env
    sed -i "s|VIDEO_DIR=.*|VIDEO_DIR=$STORAGE_BASE/videos|" .env
    sed -i "s|AUDIT_DIR=.*|AUDIT_DIR=$STORAGE_BASE/audit|" .env
fi

echo "✅ Storage directories created at $STORAGE_BASE"

# Start Redis if Docker is available
if [ -z "$SKIP_DOCKER" ]; then
    echo ""
    echo "Starting Redis container..."
    
    if docker ps | grep -q pulsevault-redis-dev; then
        echo "✅ Redis already running"
    else
        docker run -d \
            --name pulsevault-redis-dev \
            -p 6379:6379 \
            redis:7-alpine
        
        echo "✅ Redis container started"
    fi
fi

# Generate SSL certificates for Docker Compose (optional)
if [ -z "$SKIP_DOCKER" ]; then
    echo ""
    echo "Generating SSL certificates for Docker Compose..."
    PROJECT_ROOT="$(dirname "$0")/.."
    SSL_DIR="$PROJECT_ROOT/nginx/ssl"
    mkdir -p "$SSL_DIR"
    
    if [ ! -f "$SSL_DIR/cert.pem" ] || [ ! -f "$SSL_DIR/key.pem" ]; then
        if command -v openssl &> /dev/null; then
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout "$SSL_DIR/key.pem" \
                -out "$SSL_DIR/cert.pem" \
                -subj "/CN=localhost" 2>/dev/null
            chmod 644 "$SSL_DIR/cert.pem" 2>/dev/null || true
            chmod 600 "$SSL_DIR/key.pem" 2>/dev/null || true
            echo "✅ SSL certificates generated"
        else
            echo "⚠️  OpenSSL not found, skipping SSL certificate generation"
        fi
    else
        echo "✅ SSL certificates already exist"
    fi
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start the API server:"
echo "     cd pulsevault && npm run dev"
echo ""
echo "  2. In another terminal, start the transcoding worker:"
echo "     cd pulsevault && npm run worker"
echo ""
echo "  3. Access the API at http://localhost:3000"
echo "  4. Check metrics at http://localhost:3000/metrics"
echo ""
echo "Storage location: $STORAGE_BASE"
echo ""
if [ -z "$SKIP_DOCKER" ]; then
    echo "For full Docker Compose stack:"
    echo "  cd .. && docker-compose up -d"
    echo ""
fi
echo "To stop Redis:"
echo "  docker stop pulsevault-redis-dev"
echo "  docker rm pulsevault-redis-dev"
