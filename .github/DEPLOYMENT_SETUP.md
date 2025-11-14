# 🚀 GitHub Actions Deployment Setup

## Required GitHub Secrets

Add these secrets to your GitHub repository:
**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### 1. DOCKER_USERNAME
```
quanluonluon
```

### 2. DOCKER_PASSWORD
Your Docker Hub access token or password
- Create token: https://hub.docker.com/settings/security

### 3. EC2_HOST
```
Your EC2 public IP or domain
Example: 54.123.45.67 or gigafitapi.nguyencong-mobi.online
```

### 4. EC2_USER
```
ubuntu
```
(or `ec2-user` for Amazon Linux)

### 5. EC2_PEM_KEY
Copy the entire contents of your `.pem` file:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...
-----END RSA PRIVATE KEY-----
```

---

## EC2 Server Initial Setup

### 1. SSH to EC2
```bash
ssh -i your-key.pem ubuntu@your-ec2-host
```

### 2. Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

### 3. Install Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 4. Create deployment directory
```bash
sudo mkdir -p /opt/gigafit-api
sudo chown $USER:$USER /opt/gigafit-api
cd /opt/gigafit-api
```

### 5. Clone repository
```bash
git clone https://github.com/YOUR_USERNAME/giga-fit.git .
```

### 6. Create .env file
```bash
nano .env
```

Paste your environment variables (see `env.template` in root directory)

### 7. Ensure Traefik network exists
```bash
docker network create traefik_net
```

---

## Deployment Process

### Automatic (via GitHub Actions)
```bash
git push origin main
```
GitHub Actions will automatically:
- Build Docker image (multi-platform)
- Push to Docker Hub
- SSH to EC2
- Pull latest code & images
- Run `docker-compose up -d`
- Clean up old images

### Manual
```bash
cd /opt/gigafit-api
git pull origin main
docker-compose pull
docker-compose up -d
docker image prune -f
```

---

## Monitoring

```bash
# View logs
docker-compose logs -f app

# Check status
docker-compose ps

# Restart
docker-compose restart app
```

