# Creating Prisma Migrations

This guide explains how to create and manage database migrations using Prisma Migrate.

## Quick Start

### 1. Modify Your Schema

Update the `schema.prisma` file with your desired database changes.

```prisma
model Post {
  id    Int     @id @default(autoincrement())
  title String
  content String
  // Add new field
  published Boolean @default(false)
}
```

### 2. Create a Migration

Run the migration command to generate a migration file:

```bash
pnpm prisma migrate dev --name <migration_name>
```

Replace `<migration_name>` with a descriptive name for your changes, using snake_case. For example:

```bash
pnpm prisma migrate dev --name add_published_field_to_posts
```

### 3. What Happens Automatically

- Prisma generates a new migration file in the `migrations/` folder
- The migration file contains the SQL statements needed to update the schema
- The migration is automatically applied to your development database
- The Prisma Client is regenerated

## Common Commands

| Command | Purpose |
|---------|---------|
| `pnpm prisma migrate dev --name <name>` | Create and apply a new migration in development |
| `pnpm prisma migrate status` | Check the status of all migrations |
| `pnpm prisma migrate resolve --rolled-back <name>` | Manually mark a migration as rolled back |
| `pnpm prisma migrate reset` | Reset the database and reapply all migrations (⚠️ deletes data) |
| `pnpm prisma migrate deploy` | Apply pending migrations in production |

## Best Practices

- **Descriptive names**: Use clear, concise names that describe the change
- **Small, focused changes**: Create one migration per logical change
- **Test migrations**: Always test migrations in development before deploying
- **Review migration files**: Check the generated SQL to ensure it's correct
- **Commit migrations**: Version control all migration files with your code

## Tips

- Use `pnpm prisma migrate status` to see which migrations have been applied
- Migration files are immutable once created—if you need to fix a mistake, create a new migration
- Never manually edit SQL in migration files; instead, create a new migration with corrections

## Further Documentation

For comprehensive information about Prisma Migrate, visit the official documentation:
https://www.prisma.io/docs/orm/prisma-migrate/getting-started

This includes advanced topics like:
- Handling conflicts and edge cases
- Production deployments
- Schema validation
- Customizing migrations
