# @blurple-canvas-web/backend

## Getting started

### Prerequisites

1. Create a copy of [`.env.example`](./.env.example) and rename it `.env`.

### Database setup

Set `DATABASE_URL` in `.env` to a running PostgreSQL instance.

Our schema and views require PostgreSQL 9.4 or newer.

For local development, install PostgreSQL locally, create a database (for example, `canvas`), and set `DATABASE_URL` in `.env` to that database.

Before pushing schema changes or seeding, build once so the seed script can import the built Prisma client:

```sh
pnpm build
```

Then apply schema changes and seed test data:

```sh
pnpm prisma:migrate
pnpm prisma:seed
```

If you do not want to use the test data, you should at least add the web guild (used internally) via:

```sh
pnpm prisma:seed --seedings web_guild
```

### Running

```sh
pnpm dev # Start the API locally with hot reloading
```

### Building

You can transpile the API to JavaScript using:

```sh
pnpm build

pnpm start # This will run the built code
```

### 🧪 Testing

Run the unit tests with:

```sh
pnpm test
```

If you want the tests to be automatically rerun when uncommitted test files are changed, run:

```sh
pnpm test:watch
```

### Generating types

We use [Prisma](https://www.prisma.io) for connecting to our database. Running `pnpm install` also automatically generates type definitions for all the database tables used.

### Prisma Migrations

Whenever you make changes to the database schema, you need to create a new migration. This is done using Prisma Migrate, which generates SQL migration files based on changes to the `schema.prisma` file.

For instructions on how to create and manage database migrations using Prisma Migrate, see [MIGRATIONS_README.md](./prisma/MIGRATIONS_README.md).

### Tracing (OpenTelemetry & Jaeger)

- Run full prod stack:

```bash
docker compose up -d
```

- Run dev stack (backend + local Jaeger/OpenSearch):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

- Run lightweight local-only stack (Jaeger + OpenSearch) while running the backend on your host:

```bash
docker compose -f docker-compose.local.yml up -d
```

- Environment (host `pnpm dev`):

```bash
OTEL_SERVICE_NAME=canvas-backend
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
```

- Environment (backend inside Compose):

```bash
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://jaeger:4318/v1/traces
```

- Jaeger UI: http://localhost:16686

- Files:
  - jaeger.yaml — base config
  - jaeger.dev.yaml — dev overrides
  - docker-compose.local.yml — minimal Jaeger/OpenSearch for host-backed development
