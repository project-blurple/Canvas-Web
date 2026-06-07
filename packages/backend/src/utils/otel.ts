import { trace, type Span } from "@opentelemetry/api";
import type { IncomingMessage } from "node:http";

export type RequestWithRootSpan = {
  headers: IncomingMessage["headers"];
  __otelRootSpan?: Span;
};

export function addSpanAttributes(
  req: RequestWithRootSpan,
  attributes: Record<string, string | number | boolean | null | undefined>,
): void {
  const activeSpan = trace.getActiveSpan();
  const rootSpan = req.__otelRootSpan;

  const filteredAttributes: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== null && value !== undefined) {
      filteredAttributes[key] = value;
    }
  }

  activeSpan?.setAttributes(filteredAttributes);

  if (rootSpan && rootSpan !== activeSpan) {
    rootSpan.setAttributes(filteredAttributes);
  }
}
