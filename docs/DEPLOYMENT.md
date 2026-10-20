# PRODUCTION DEPLOYMENT GUIDE: SMART COLLEGE COMPLAINT SYSTEM

## 1. Runtime Environment Configuration

The application is architected as a Node.js + Express + React Single Page Application. In production, Vite compiles optimized client bundles into the `dist/` directory, while Express serves the REST API endpoints and static assets on port `3000`.

### Environment Variables (`.env`)
```ini
PORT=3000
NODE_ENV=production
JWT_SECRET=production-secure-32-byte-secret-token-key-2026
```

---

## 2. Production Build Commands

```bash
# 1. Clean previous builds
npm run clean

# 2. Build client assets
npm run build

# 3. Start production server
npm start
```

---

## 3. Database Migration & Cloud SQL / PostgreSQL Setup

While the system is bundled with a persistent relational SQLite WASM engine for instant local zero-dependency execution, it is designed for drop-in migration to PostgreSQL / Cloud SQL / Supabase:

1. Replace `server/db.ts` SQLite connection with `pg` Pool or Drizzle ORM PostgreSQL connection string.
2. Execute the DDL script in `docs/DATABASE.md`.
3. Provide `DATABASE_URL=postgresql://user:password@host:5432/dbname`.

---

## 4. Containerization (Dockerfile)

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/utils ./src/utils
EXPOSE 3000
CMD ["node", "--loader", "tsx", "server.ts"]
```
