FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# At build time, set API URL to /api so nginx proxies it on the same origin
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---- Serve with nginx ----
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# nginx config is injected via docker-compose volume mount
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
