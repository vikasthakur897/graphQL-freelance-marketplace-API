# Freelance Marketplace GraphQL API

Production-ready backend scaffold for a freelance marketplace platform built with Node.js, Apollo Server, Prisma, PostgreSQL, JWT auth, and TypeScript.

## Features

- JWT access and refresh token auth
- RBAC for `CLIENT`, `FREELANCER`, and `ADMIN`
- Prisma schema for users, projects, proposals, contracts, payments, reviews, and notifications
- GraphQL queries, mutations, and subscriptions scaffold
- Zod validation and seed data

## Structure

- `src/app.ts` - Apollo server bootstrap
- `src/config` - constants, database, and JWT helpers
- `src/graphql` - schema and resolvers
- `src/middleware` - auth, context, validation
- `src/services` - business logic
- `prisma/schema.prisma` - database schema
- `prisma/seed.ts` - sample seed data

## Env

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/freelance_marketplace"
PORT=4000
JWT_SECRET=super-secret-access
JWT_REFRESH_SECRET=super-secret-refresh
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10
GRAPHQL_DEPTH_LIMIT=7
CORS_ORIGIN=http://localhost:3000
```

## Run

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

## Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["npm", "run", "start"]
```

## docker-compose.yml

```yaml
version: "3.9"
services:
  api:
    build: .
    ports:
      - "4000:4000"
    env_file:
      - .env
    depends_on:
      - postgres
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: freelance_marketplace
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
```

## Deployment Notes

- Add a real email provider for verification and resets.
- Add Redis or another store for durable rate limiting.
- Add WebSocket transport for production-grade subscriptions.
- Run migrations before starting the app in production.
