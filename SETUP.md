# PulseVault Setup Guide

## 🚀 Development Setup

**Prerequisites:** Node.js 20+, Docker

```bash
# 1. Clone and setup
git clone https://github.com/mieweb/pulsevault.git
cd pulsevault
./scripts/setup.sh

# 2. Start services (2 terminals)
cd pulsevault && npm run dev        # Terminal 1
cd pulsevault && npm run worker     # Terminal 2

# 3. Test
curl http://localhost:3000/
```

**✅ Done!** API at `http://localhost:3000`

---

## 🐳 Docker Compose Setup

**Prerequisites:** Docker & Docker Compose

```bash
# 1. Run setup script (creates .env, generates HMAC_SECRET, SSL certs, etc.)
./scripts/setup.sh

# 2. Start all services
docker-compose up -d

# 3. Test
curl http://localhost/
./test-full-infrastructure.sh
```

**✅ Done!** Full stack running (Nginx, Prometheus, Grafana, Loki, etc.)

---

## 🏭 Production Setup

### 1. Server Preparation

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Storage Setup

```bash
# Create encrypted volume (recommended)
sudo cryptsetup luksFormat /dev/sdX
sudo cryptsetup open /dev/sdX pulsevault-media
sudo mkfs.ext4 /dev/mapper/pulsevault-media
sudo mount /dev/mapper/pulsevault-media /mnt/media

# Create directories
sudo mkdir -p /mnt/media/{uploads,videos,audit}
sudo chown -R 1000:1000 /mnt/media
sudo chmod -R 750 /mnt/media
```

### 3. Configure Environment

```bash
cd /opt/pulsevault
./scripts/setup.sh  # Creates .env and generates HMAC_SECRET
nano pulsevault/.env  # Update: NODE_ENV=production, storage paths for production
```

### 4. SSL Certificates

```bash
# Let's Encrypt (recommended)
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
sudo chown -R $USER:$USER nginx/ssl
```

### 5. Deploy

```bash
# For production, update docker-compose.yml volumes section:
# Change: media-storage: (named volume)
# To: /mnt/media:/media (bind mount)
docker-compose up -d --build

# Configure firewall
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable

# Verify
docker-compose ps
curl https://yourdomain.com/health
```

### 6. Monitoring & Backups

- **Grafana:** `http://yourdomain.com:3001` (admin/admin)
- **Prometheus:** `http://yourdomain.com:9090`
- **Backups:** 
  ```bash
  # Backup script (add to crontab)
  rsync -av /mnt/media/videos/*/meta.json /backup/metadata/
  rsync -av /mnt/media/audit/ /backup/audit/
  rsync -av /mnt/media/videos/ /backup/videos/
  ```

**✅ Production ready!**

---

## 📖 API Reference

### Upload Endpoints

**POST /uploads** - Start resumable upload (tus protocol)
- Headers: `Upload-Length`, `Tus-Resumable: 1.0.0`
- Response: `201 Created` with `Location` header

**PATCH /uploads/:id** - Upload chunks
- Headers: `Upload-Offset`, `Content-Type: application/offset+octet-stream`
- Response: `204 No Content`

**POST /uploads/finalize** - Finalize upload
- Body: `{uploadId, filename, userId, metadata}`
- Response: `{videoId, status, size, checksum, transcoding}`

### Media Endpoints

**POST /media/sign** - Generate signed URL
- Body: `{videoId, path, expiresIn}`
- Response: `{url, expiresAt, expiresIn}`

**GET /media/videos/:id/:path?token=...** - Stream media (supports Range requests)

**GET /media/videos/:id/metadata?token=...** - Get video metadata

**GET /media/videos/:id/renditions?token=...** - List available renditions

For detailed API documentation, see [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md).

---

## 📋 Quick Checklist

### Development
- [ ] Node.js 20+ installed
- [ ] `./scripts/setup.sh` completed
- [ ] API server running (`npm run dev`)
- [ ] Worker running (`npm run worker`)

### Docker Compose
- [ ] Docker installed
- [ ] `./scripts/setup.sh` completed
- [ ] `docker-compose up -d` successful
- [ ] All services healthy

### Production
- [ ] Server prepared (Docker, storage)
- [ ] Encrypted storage mounted
- [ ] `.env` configured
- [ ] SSL certificates (Let's Encrypt)
- [ ] Services running
- [ ] Firewall configured
- [ ] Backups configured

---

## 🔧 Troubleshooting

**Port in use:**
```bash
sudo lsof -i :3000  # Find process
sudo systemctl stop apache2  # Stop conflicting service
```

**Permission denied:**
```bash
sudo chown -R 1000:1000 /mnt/media
sudo chmod -R 750 /mnt/media
```

**Redis connection failed:**
```bash
docker ps | grep redis
docker exec pulsevault-redis redis-cli ping
```

**Services not starting:**
```bash
docker-compose logs
docker-compose up -d --build
```

---

