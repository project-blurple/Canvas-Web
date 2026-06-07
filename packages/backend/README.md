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

### OpenTelemetry tracing

The backend can export traces to Jaeger over OTLP.

#### Local Jaeger setup

Start Jaeger with OTLP enabled:

```sh
docker run --rm --name jaeger ^
	-p 16686:16686 ^
	-p 4317:4317 ^
	-p 4318:4318 ^
	-e COLLECTOR_OTLP_ENABLED=true ^
	jaegertracing/all-in-one:latest
```

Open the Jaeger UI at http://localhost:16686.

#### Backend env vars

Set these values in your local [`.env`](./.env) file:

```sh
OTEL_SERVICE_NAME=canvas-backend
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
```

If you run the backend inside Docker Compose, set the OTLP endpoint to http://jaeger:4318/v1/traces instead.

#### Notes

- Jaeger stores traces in memory in this local setup, so they are cleared when the container stops.
- OpenSearch can be used as a more persistent storage backend, but isn't necessary for local development.
