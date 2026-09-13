declare module "passport-oauth2-refresh" {
  type RequestNewAccessTokenDone = (
    error: Error | null,
    accessToken?: string,
    refreshToken?: string,
  ) => void;

  interface AuthTokenRefresh {
    use(strategy: { name?: string; _oauth2?: object }, options?: object): void;
    requestNewAccessToken(
      name: string,
      refreshToken: string,
      done: RequestNewAccessTokenDone,
    ): void;
    requestNewAccessToken(
      name: string,
      refreshToken: string,
      params: Record<string, string | number | boolean>,
      done: RequestNewAccessTokenDone,
    ): void;
  }

  const refresh: AuthTokenRefresh;
  export default refresh;

  export const AuthTokenRefresh: {
    new (): AuthTokenRefresh;
  };
}
