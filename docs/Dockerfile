# Build Docusaurus static site
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Serve built site (baseUrl is /docs/, so content is under build/docs/ and build/assets/)
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/build ./build
EXPOSE 3001
# Listen on all interfaces; serve build at root so /docs/ is served from build/docs/
CMD ["serve", "build", "-s", "-l", "3001", "--no-clipboard"]
