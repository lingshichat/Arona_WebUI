#!/bin/bash
cat << 'NGINX_CONF' > /etc/nginx/sites-available/openclaw
server {
    server_name openclaw.lingshichat.top;

    # Removed auth_basic

    location / {
        proxy_pass http://127.0.0.1:18790;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120;
    }

    location /gateway/ {
        proxy_pass http://100.68.146.126:18789/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/openclaw.lingshichat.top/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/openclaw.lingshichat.top/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = openclaw.lingshichat.top) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name openclaw.lingshichat.top;
    return 404; # managed by Certbot
}
NGINX_CONF

/etc/init.d/nginx reload || service nginx reload || systemctl reload nginx
