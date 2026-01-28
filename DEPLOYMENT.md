# 🚀 Deployment Guide - Vita HR Frontend

## 📋 Prerequisites

- Docker installed on server
- Docker Compose installed
- Backend API running on port 8000

## 🔧 Setup Steps

### 1. Clone the repository
```bash
cd /path/to/server
git clone <repository-url>
cd vita-hr
```

### 2. Create environment file
```bash
cp .env.production.example .env.production
```

Edit `.env.production`:
```env
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:8000/api/v1
```

**Important:** Replace `YOUR_SERVER_IP` with your actual server IP or domain.

### 3. Build and run with Docker Compose
```bash
# Build the image
docker-compose build

# Start the container
docker-compose up -d

# Check logs
docker-compose logs -f frontend
```

### 4. Verify deployment
Open browser: `http://YOUR_SERVER_IP:3012`

## 🔄 Update Deployment

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🛑 Stop the application
```bash
docker-compose down
```

## 📊 Monitor logs
```bash
# View all logs
docker-compose logs -f

# View frontend logs only
docker-compose logs -f frontend
```

## 🔍 Troubleshooting

### Container not starting
```bash
docker-compose logs frontend
```

### Check running containers
```bash
docker ps -a
```

### Remove all containers and rebuild
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Access container shell
```bash
docker-compose exec frontend sh
```

## 🌐 Production Configuration

### Nginx Reverse Proxy (Optional)
If you want to use domain name instead of IP:port

Create `/etc/nginx/sites-available/vita-hr`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3012;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/vita-hr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔐 SSL Certificate (Optional)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 📝 Notes

- Frontend runs on port: **3012**
- Backend should run on port: **8000**
- Make sure firewall allows port 3012
- For production, consider using SSL/TLS
