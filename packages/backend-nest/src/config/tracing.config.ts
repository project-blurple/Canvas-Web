import type { ConfigType } from "@nestjs/config";
import { registerAs } from "@nestjs/config";
import { ConfigNamespace } from "./config-namespace";
import { validateEnv } from "./env";

export const tracingConfig = registerAs(ConfigNamespace.Tracing, () => {
  const env = validateEnv(process.env);

  return {
    serviceName: env.OTEL_SERVICE_NAME,
    otlpTracesEndpoint: env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  };
});

export type TracingConfig = ConfigType<typeof tracingConfig>;
