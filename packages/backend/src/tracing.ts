import type { IncomingMessage } from "node:http";
import type { trace } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import config from "./config";

type IncomingMessageWithRootSpan = IncomingMessage & {
  __otelRootSpan?: ReturnType<typeof trace.getSpan>;
};

const exporter = new OTLPTraceExporter({
  url: config.tracing.otlpTracesEndpoint,
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: config.tracing.serviceName,
  }),
  traceExporter: exporter,
});

registerInstrumentations({
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-http": {
        requestHook: (span, request) => {
          (request as IncomingMessageWithRootSpan).__otelRootSpan = span;
        },
      },
    }),
    new PrismaInstrumentation(),
  ],
});

try {
  sdk.start();
  console.info("OpenTelemetry initialized");
} catch (err: unknown) {
  console.error("Error starting OpenTelemetry", err);
}

process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .catch((err: unknown) =>
      console.error("Error shutting down OpenTelemetry", err),
    );
});
