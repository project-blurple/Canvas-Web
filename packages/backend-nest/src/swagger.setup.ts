import { isDeepStrictEqual } from "node:util";

import type { NestExpressApplication } from "@nestjs/platform-express";
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";

import {
  BOT_API_KEY_SECURITY,
  GUARDS_EXTENSION,
  SESSION_SECURITY,
} from "@/auth/require-auth.decorator";

const NESTJS_ZOD_OUTPUT_SUFFIX = "_Output";

function stripOutputSuffix(doc: OpenAPIObject): OpenAPIObject {
  const schemas = doc.components?.schemas;
  if (!schemas) return doc;

  const renamedRefs = new Map<string, string>();
  for (const name of Object.keys(schemas)) {
    if (!name.endsWith(NESTJS_ZOD_OUTPUT_SUFFIX)) continue;
    const plainName = name.slice(0, -NESTJS_ZOD_OUTPUT_SUFFIX.length);

    const existing = schemas[plainName];
    if (existing && !isDeepStrictEqual(existing, schemas[name])) continue;

    schemas[plainName] ??= schemas[name];
    delete schemas[name];
    renamedRefs.set(
      `#/components/schemas/${name}`,
      `#/components/schemas/${plainName}`,
    );
  }

  if (renamedRefs.size > 0) rewriteRefs(doc, renamedRefs);

  return doc;
}

function rewriteRefs(node: unknown, renamedRefs: Map<string, string>): void {
  if (Array.isArray(node)) {
    for (const item of node) rewriteRefs(item, renamedRefs);
    return;
  }
  if (typeof node !== "object" || node === null) return;

  const record = node as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (key === "$ref" && typeof value === "string") {
      record[key] = renamedRefs.get(value) ?? value;
    } else {
      rewriteRefs(value, renamedRefs);
    }
  }
}

/**
 * Replaces the internal guards marker set by the `Requires*` decorators
 * with a human-readable note in each operation's description.
 */
function inlineGuardDocs(doc: OpenAPIObject): OpenAPIObject {
  for (const pathItem of Object.values(doc.paths)) {
    for (const operation of Object.values(pathItem)) {
      if (typeof operation !== "object" || operation === null) continue;

      const op = operation as Record<string, unknown>;
      const guards = op[GUARDS_EXTENSION];
      if (!Array.isArray(guards)) continue;
      delete op[GUARDS_EXTENSION];

      const guardNote = `Protected by ${guards
        .map((guard) => `\`${String(guard)}\``)
        .join(" and ")}.`;
      const existing =
        typeof op.description === "string" ? op.description : undefined;
      op.description = existing ? `${guardNote}\n\n${existing}` : guardNote;
    }
  }

  return doc;
}

export function setupSwagger(app: NestExpressApplication): void {
  const config = new DocumentBuilder()
    .setTitle("Blurple Canvas API")
    // current day
    .setVersion(new Date().toISOString().split("T")[0])
    .addCookieAuth(
      "connect.sid",
      {
        type: "apiKey",
        description:
          "express-session cookie issued by the Discord OAuth login flow. " +
          "Set automatically by the browser after logging in; cannot be " +
          "entered manually in Swagger UI.",
      },
      SESSION_SECURITY,
    )
    .addApiKey(
      {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description: "Static API key used by the Discord bot.",
      },
      BOT_API_KEY_SECURITY,
    )
    .build();

  // cleanupOpenApiDoc post-processes the zod-derived schemas; required for
  // correct OpenAPI output when using nestjs-zod with @nestjs/swagger.
  const documentFactory = () =>
    stripOutputSuffix(
      inlineGuardDocs(
        cleanupOpenApiDoc(SwaggerModule.createDocument(app, config)),
      ),
    );

  SwaggerModule.setup("docs", app, documentFactory, {
    swaggerOptions: { persistAuthorization: true },
  });
}
