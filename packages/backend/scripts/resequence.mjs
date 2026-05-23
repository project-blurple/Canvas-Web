import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { PrismaClient } = require(
  resolve(scriptDir, "..", "build", "client", "generated", "client.js"),
);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before running db:resequence.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

const resequenceSql = `
DO $$
DECLARE
  sequence_record record;
  max_value bigint;
BEGIN
  FOR sequence_record IN
    SELECT
      sequence_namespace.nspname AS sequence_schema,
      sequence_class.relname AS sequence_name,
      table_namespace.nspname AS table_schema,
      table_class.relname AS table_name,
      column_attribute.attname AS column_name
    FROM pg_class sequence_class
    JOIN pg_namespace sequence_namespace
      ON sequence_namespace.oid = sequence_class.relnamespace
    JOIN pg_depend dependency
      ON dependency.objid = sequence_class.oid
    JOIN pg_class table_class
      ON table_class.oid = dependency.refobjid
    JOIN pg_namespace table_namespace
      ON table_namespace.oid = table_class.relnamespace
    JOIN pg_attribute column_attribute
      ON column_attribute.attrelid = table_class.oid
     AND column_attribute.attnum = dependency.refobjsubid
    WHERE sequence_class.relkind = 'S'
      AND dependency.deptype IN ('a', 'i')
      AND table_namespace.nspname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY
      table_namespace.nspname,
      table_class.relname,
      column_attribute.attname
  LOOP
    EXECUTE format(
      'SELECT max(%I) FROM %I.%I',
      sequence_record.column_name,
      sequence_record.table_schema,
      sequence_record.table_name
    ) INTO max_value;

    IF max_value IS NULL THEN
      EXECUTE format(
        'SELECT setval(%L, 1, false)',
        format('%I.%I', sequence_record.sequence_schema, sequence_record.sequence_name)
      );
      RAISE NOTICE 'Reset %.% from empty table %.%',
        sequence_record.sequence_schema,
        sequence_record.sequence_name,
        sequence_record.table_schema,
        sequence_record.table_name;
    ELSE
      EXECUTE format(
        'SELECT setval(%L, %s, true)',
        format('%I.%I', sequence_record.sequence_schema, sequence_record.sequence_name),
        max_value
      );
      RAISE NOTICE 'Reset %.% to % from %.%',
        sequence_record.sequence_schema,
        sequence_record.sequence_name,
        max_value,
        sequence_record.table_schema,
        sequence_record.table_name;
    END IF;
  END LOOP;
END $$;
`;

async function main() {
  await prisma.$executeRawUnsafe(resequenceSql);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
