import { trace, type Span } from "@opentelemetry/api";
import type { IncomingMessage } from "node:http";

export type RequestWithRootSpan = {
  headers: IncomingMessage["headers"];
  __otelRootSpan?: Span;
};

export function addSpanAttributes(
  req: RequestWithRootSpan,
  attributes: Record<string, string | number | boolean>,
): void {
  const activeSpan = trace.getActiveSpan();
  const rootSpan = req.__otelRootSpan;

  activeSpan?.setAttributes(attributes);

  if (rootSpan && rootSpan !== activeSpan) {
    rootSpan.setAttributes(attributes);
  }
}
