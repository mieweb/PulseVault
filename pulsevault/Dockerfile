FROM node:20-alpine

# Install FFmpeg (required for worker, optional for API server)
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Copy .env file if it exists (for environment variables)
COPY .env* ./

# Create media directories
RUN mkdir -p /media/uploads /media/videos /media/audit

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Run the application
CMD ["npm", "start"]
