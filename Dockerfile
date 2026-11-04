# Portable container for any host that runs Docker (Fly.io, Railway, Koyeb, Google Cloud Run, a VPS ...).
# Debian-based image so bcrypt's prebuilt native binary works.
FROM node:22-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Hosts inject PORT; the app reads it. Never bake secrets into the image.
EXPOSE 4000
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
