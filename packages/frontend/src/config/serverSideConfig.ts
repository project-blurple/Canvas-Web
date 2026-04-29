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
 * Configuration only available in server components. These values will always be the default value
 * in client components, and attempting to access them will throw an error to ensure they're not
 * accidentally used.
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
