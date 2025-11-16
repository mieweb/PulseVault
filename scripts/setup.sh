#!/bin/bash

# PulseVault Project Setup Script
# This script sets up the PulseVault project environment
#
# Note: The script does not start any services; it only prepares the environment.
# Services are started via docker-compose up -d or by running npm run dev and npm run worker manually.

set -e

echo "🩸 PulseVault Project Setup"
echo "=========================="

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
    echo "⚠️  Docker not found. SSL certificate generation will be skipped."
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
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env file created from .env.example"
    else
        echo "❌ .env.example not found! Please create .env.example first."
        exit 1
    fi
fi

# Generate a secure HMAC secret if not already set or if it's the default
if ! grep -q "^HMAC_SECRET=" .env || grep -q "^HMAC_SECRET=your-secret-key-here-change-in-production" .env || grep -q "^HMAC_SECRET=change-me" .env; then
    echo ""
    echo "Generating secure HMAC_SECRET..."
    SECRET=$(openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || echo "change-me-$(date +%s)")
    
    # Use perl for safer replacement that handles special characters
    if command -v perl &> /dev/null; then
        perl -i -pe "s|^HMAC_SECRET=.*|HMAC_SECRET=$SECRET|" .env
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # Escape special characters for sed on macOS
        ESCAPED_SECRET=$(echo "$SECRET" | sed 's/[[\.*^$()+?{|]/\\&/g')
        sed -i '' "s|^HMAC_SECRET=.*|HMAC_SECRET=$ESCAPED_SECRET|" .env
    else
        ESCAPED_SECRET=$(echo "$SECRET" | sed 's/[[\.*^$()+?{|]/\\&/g')
        sed -i "s|^HMAC_SECRET=.*|HMAC_SECRET=$ESCAPED_SECRET|" .env
    fi
    echo "✅ HMAC_SECRET updated"
fi

# Create storage directories
echo ""
echo "Creating storage directories..."
STORAGE_BASE="/tmp/pulsevault"
mkdir -p "$STORAGE_BASE"/{uploads,videos,audit}

# Update .env to use temp storage for development
# Use perl for safer replacement, fallback to sed
if command -v perl &> /dev/null; then
    perl -i -pe "s|^MEDIA_ROOT=.*|MEDIA_ROOT=$STORAGE_BASE|" .env
    perl -i -pe "s|^UPLOAD_DIR=.*|UPLOAD_DIR=$STORAGE_BASE/uploads|" .env
    perl -i -pe "s|^VIDEO_DIR=.*|VIDEO_DIR=$STORAGE_BASE/videos|" .env
    perl -i -pe "s|^AUDIT_DIR=.*|AUDIT_DIR=$STORAGE_BASE/audit|" .env
elif [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^MEDIA_ROOT=.*|MEDIA_ROOT=$STORAGE_BASE|" .env
    sed -i '' "s|^UPLOAD_DIR=.*|UPLOAD_DIR=$STORAGE_BASE/uploads|" .env
    sed -i '' "s|^VIDEO_DIR=.*|VIDEO_DIR=$STORAGE_BASE/videos|" .env
    sed -i '' "s|^AUDIT_DIR=.*|AUDIT_DIR=$STORAGE_BASE/audit|" .env
else
    sed -i "s|^MEDIA_ROOT=.*|MEDIA_ROOT=$STORAGE_BASE|" .env
    sed -i "s|^UPLOAD_DIR=.*|UPLOAD_DIR=$STORAGE_BASE/uploads|" .env
    sed -i "s|^VIDEO_DIR=.*|VIDEO_DIR=$STORAGE_BASE/videos|" .env
    sed -i "s|^AUDIT_DIR=.*|AUDIT_DIR=$STORAGE_BASE/audit|" .env
fi

echo "✅ Storage directories created at $STORAGE_BASE"

# Generate SSL certificates for Docker Compose
if command -v docker &> /dev/null; then
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
echo "Note: This script only prepares the environment. Services are not started automatically."
echo "      Start services via docker-compose up -d or run npm run dev and npm run worker manually."
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
echo "For full Docker Compose stack:"
echo "  cd .. && docker-compose up -d"
echo ""
echo "To stop all services:"
echo "  docker-compose down"
