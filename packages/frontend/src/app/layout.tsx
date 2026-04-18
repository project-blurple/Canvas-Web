import { ThemeProvider } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import axios from "axios";
import type { Metadata, Viewport } from "next";

import config from "@/config";
import {
  CanvasViewProvider,
  QueryClientProvider,
  SelectedBoundsProvider,
  SelectedColorProvider,
  SelectedFrameProvider,
} from "@/contexts";
import "../styles/core.css";
import {
  CanvasInfo,
  CanvasInfoRequest,
  DiscordUserProfile,
} from "@blurple-canvas-web/types";
import { cookies } from "next/headers";
import { AuthProvider } from "@/contexts/AuthProvider";
import { CanvasProvider } from "@/contexts/CanvasContext";
import { Theme } from "@/theme";

export const metadata: Metadata = {
  metadataBase: new URL(config.baseUrl),
  title: "Blurple Canvas",
  description: "Part of Project Blurple",
};

export const viewport: Viewport = {
  themeColor: "#23272a",
};

/**
 * This specifically needs to be defined in this file so that it doesn't get classified as a server
 * action (requiring it to be async and returning a promise) while still allowing it to access the
 * cookies during SSR... I love Next.js 😭
 */
async function getServerSideProfile(): Promise<DiscordUserProfile | null> {
  const cookieStore = await cookies();
  const profile = cookieStore.get("profile");

  if (!profile) {
    return null;
  }

  try {
    return JSON.parse(profile.value) as DiscordUserProfile;
  } catch (error) {
    console.error("[layout] failed to parse profile cookie", error);
    return null;
  }
}

async function getServerSideCanvasInfo(): Promise<CanvasInfo> {
  try {
    const response = await axios.get<CanvasInfoRequest.ResBody>(
      `${config.apiUrl}/api/v1/canvas/current/info`,
    );
    return response.data;
  } catch (error) {
    console.error(error);

    // Fallback in case something goes wrong
    return {
      id: 1,
      name: "Something went wrong...",
      isLocked: true,
      width: 600,
      height: 600,
      startCoordinates: [1, 1],
      eventId: 1,
      webPlacingEnabled: false,
      allColorsGlobal: false,
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LayoutProviders>{children}</LayoutProviders>
      </body>
    </html>
  );
}

async function LayoutProviders({ children }: { children: React.ReactNode }) {
  const [profile, canvasInfo] = await Promise.all([
    getServerSideProfile(),
    getServerSideCanvasInfo(),
  ]);

  return (
    <AppRouterCacheProvider>
      <QueryClientProvider>
        <AuthProvider profile={profile}>
          <CanvasProvider mainCanvasInfo={canvasInfo}>
            <CanvasViewProvider>
              <SelectedColorProvider>
                <SelectedFrameProvider>
                  <SelectedBoundsProvider>
                    <ThemeProvider theme={Theme}>{children}</ThemeProvider>
                  </SelectedBoundsProvider>
                </SelectedFrameProvider>
              </SelectedColorProvider>
            </CanvasViewProvider>
          </CanvasProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppRouterCacheProvider>
  );
}
