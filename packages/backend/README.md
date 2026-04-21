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
pnpm prisma:push
pnpm prisma:seed
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
