import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const viewDefinitions = [
  ["public", "most_frequent_color"],
  ["public", "color_place_frequency"],
  ["public", "most_frequent_color_guild"],
  ["public", "color_place_frequency_guild"],
  ["public", "leaderboard_guild"],
  ["public", "leaderboard"],
  ["public", "user_stats"],
  ["public", "guild_stats"],
];

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function main() {
  for (const [schema, viewName] of viewDefinitions) {
    const sqlFilePath = new URL(
      `./views/${schema}/${viewName}.sql`,
      import.meta.url,
    );
    const selectQuery = await readFile(sqlFilePath, "utf8");
    const statement = [
      `DROP VIEW IF EXISTS ${quoteIdentifier(schema)}.${quoteIdentifier(viewName)} CASCADE;`,
      `CREATE VIEW ${quoteIdentifier(schema)}.${quoteIdentifier(viewName)} AS`,
      selectQuery.trim(),
      ";",
    ].join("\n");

    const result = spawnSync("prisma", ["db", "execute", "--stdin"], {
      input: statement,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: process.platform === "win32",
    });

    if (result.error) {
      throw new Error(
        `Failed to launch Prisma CLI while applying ${schema}.${viewName}: ${result.error.message}`,
      );
    }

    if (result.status !== 0) {
      process.stdout.write(result.stdout ?? "");
      process.stderr.write(result.stderr ?? "");
      throw new Error(`Failed to apply view ${schema}.${viewName}`);
    }

    console.log(`Successfully applied view ${schema}.${viewName}`);
  }
}

await main();
