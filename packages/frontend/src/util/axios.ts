import axios from "axios";

const DATABASE_UNAVAILABLE_MESSAGE = "Database is unavailable";

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  return (
    error.response?.status === 503 &&
    error.response.data?.message === DATABASE_UNAVAILABLE_MESSAGE
  );
}
