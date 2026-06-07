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

Start Jaeger with the OpenSearch-backed config:

```sh
docker run --rm --name jaeger -p 16686:16686 -p 4317:4317 -p 4318:4318 -v "$(Get-Location)\jaeger.yaml:/jaeger/config.yaml" jaegertracing/jaeger:2.19.0 --config /jaeger/config.yaml
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

- The standalone Jaeger quickstart can use OpenSearch-backed storage with the mounted `jaeger.yaml` config.
- This repository's Docker Compose stack uses OpenSearch for persistent trace storage.

### Jaeger auth with GitHub

When you run Jaeger through Docker Compose, the UI is protected by `oauth2-proxy` and GitHub login.

Open the UI at http://jaeger.localhost after starting the compose stack.

#### Required env vars

Copy the repository root [`.env.oauth.example`](../../.env.oauth.example) to `.env.oauth` and set these values before running `docker compose up`:

```sh
OAUTH2_PROXY_PROVIDER=github
OAUTH2_PROXY_CLIENT_ID=your-github-oauth-app-client-id
OAUTH2_PROXY_CLIENT_SECRET=your-github-oauth-app-client-secret
OAUTH2_PROXY_COOKIE_SECRET=generate-a-32-byte-base64-secret
OAUTH2_PROXY_REDIRECT_URL=http://localhost:4180/oauth2/callback
OAUTH2_PROXY_UPSTREAMS=http://host.docker.internal:16686
OAUTH2_PROXY_HTTP_ADDRESS=0.0.0.0:4180
OAUTH2_PROXY_EMAIL_DOMAINS=*
```

The compose stack overrides the Jaeger URL and upstream so the same `.env.oauth` file can also be reused for manual `docker run` testing.

#### GitHub access restrictions

Set one of these to restrict who can sign in:

```sh
OAUTH2_PROXY_GITHUB_ORG=your-org
OAUTH2_PROXY_GITHUB_TEAM=your-org:your-team
OAUTH2_PROXY_GITHUB_REPO=your-org/your-repo
```

#### Recommended local settings

These keep the local setup simple on plain HTTP:

```sh
OAUTH2_PROXY_REVERSE_PROXY=true
OAUTH2_PROXY_COOKIE_SECURE=false
OAUTH2_PROXY_SKIP_PROVIDER_BUTTON=true
```

#### Notes

- `OAUTH2_PROXY_CLIENT_SECRET`, `OAUTH2_PROXY_COOKIE_SECRET`, and the GitHub restriction variables can all be set via env.
- `OAUTH2_PROXY_EMAIL_DOMAINS=*` is the simplest local-dev setting when using GitHub org/team restrictions.
- If you later put Jaeger behind HTTPS, set `OAUTH2_PROXY_COOKIE_SECURE=true` and update `OAUTH2_PROXY_REDIRECT_URL` to the HTTPS URL.
