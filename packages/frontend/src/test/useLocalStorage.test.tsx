import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import useLocalStorage from "@/app/settings/useLocalStorage";

function createWrapper(client?: QueryClient) {
  const clientInstance =
    client ??
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={clientInstance}>
      {children}
    </QueryClientProvider>
  );
}

function TestComponent({
  keyName,
}: {
  keyName: Parameters<typeof useLocalStorage>[0];
}) {
  const [value, setValue] = useLocalStorage(keyName);

  return (
    <div>
      <div data-testid="value">{JSON.stringify(value)}</div>
      <button
        type="button"
        onClick={() => {
          setValue(["test-value"]);
        }}
      >
        set
      </button>
    </div>
  );
}

describe("useLocalStorage hook", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => (key in store ? store[key] : null),
        setItem: (key: string, value: string) => {
          store[key] = String(value);
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          for (const k of Object.keys(store)) delete store[k];
        },
      },
    });
  });
  it("returns default when nothing is stored", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapper = createWrapper(client);
    render(
      <Wrapper>
        <TestComponent keyName="notices/dismissed" />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("value").textContent).toBe(JSON.stringify([]));
    });
  });

  it("persists and returns updated value after mutate", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapper = createWrapper(client);
    render(
      <Wrapper>
        <TestComponent keyName="notices/dismissed" />
      </Wrapper>,
    );

    // Click the button to call setValue
    const btn = screen.getByText("set");
    fireEvent.click(btn);

    // Wait for localStorage to be updated first
    await waitFor(() => {
      expect(window.localStorage.getItem("notices/dismissed")).toBe(
        JSON.stringify(["test-value"]),
      );
    });

    // Then trigger a query refetch and assert UI reflects the persisted value
    await client.invalidateQueries({
      queryKey: ["localStorage", "notices/dismissed"],
    });
    await waitFor(() => {
      expect(screen.getByTestId("value").textContent).toBe(
        JSON.stringify(["test-value"]),
      );
    });
  });
});
