function serverSideOnly<T>(value: T): T {
  const isServer = typeof window === "undefined";

  if (isServer) {
    return value;
  }

  throw new Error(
    "This value is only available in server components. It is currently being accessed from a client component.",
  );
}

/**
 * Configuration only available in server components. These environment variables do not exist in
 * the client bundle, however, default values can confusingly make it seem like they do. To prevent
 * accidental usage, an error will be thrown if they're accessed from a client component.
 */
const serverConfig = {
  get baseUrl() {
    return serverSideOnly(
      process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
    );
  },
  get port() {
    return serverSideOnly(Number(process.env.PORT) || 3000);
  },
} as const;

export default serverConfig;
