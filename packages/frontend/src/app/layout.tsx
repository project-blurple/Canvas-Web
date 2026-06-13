import {
  type CanvasInfo,
  type CanvasInfoRequest,
  CanvasPlaceState,
  type DiscordUserProfile,
} from "@blurple-canvas-web/types";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import axios from "axios";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import config from "@/config/clientConfig";
import serverConfig from "@/config/serverConfig";
import "../styles/core.css";
import {
  AuthProvider,
  CanvasProvider,
  QueryClientProvider,
  TimelineProvider,
} from "@/contexts";
import { isDatabaseUnavailableError } from "@/util/axios";
import "../styles/core.css";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { Toaster, type ToasterProps } from "sonner";
import CanvasIcon from "@/components/CanvasIcon";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(serverConfig.baseUrl),
  title: "Blurple Canvas",
  description: "Part of Project Blurple",
};

export const viewport: Viewport = {
  themeColor: "#5865f2",
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
  // Skip during build - data will be fetched fresh on client startup
  if (process.env.npm_lifecycle_event === "build") {
    return defaultCanvasInfo;
  }

  try {
    const response = await axios.get<CanvasInfoRequest.ResBody>(
      `${config.apiUrl}/api/v1/canvas/current/info`,
    );
    return response.data;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      console.error("Error: Database is unavailable");
    } else {
      console.error(error);
    }

    // Fallback in case something goes wrong
    return defaultCanvasInfo;
  }
}

const defaultCanvasInfo = {
  id: 1,
  name: "Something went wrong…",
  placeState: CanvasPlaceState.NoOne,
  width: 600,
  height: 600,
  startCoordinates: [1, 1],
  eventId: 1,
  webPlacingEnabled: false,
  allColorsGlobal: false,
  cooldownDuration: 0,
  timelineEnabled: false,
} satisfies CanvasInfo;

const toasterIcons = {
  success: <CircleCheck />,
  info: <Info />,
  warning: <TriangleAlert />,
  error: <CircleAlert />,
  loading: <CanvasIcon loading />,
} as const satisfies ToasterProps["icons"];

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
            <TimelineProvider>
              <AppProviders>
                {children}
                <Toaster
                  icons={toasterIcons}
                  position="bottom-left" // bottom right overlaps with the action panel
                  theme="dark"
                  toastOptions={{
                    style: {
                      backgroundColor: "var(--discord-legacy-not-quite-black)",
                      boxShadow: "0 0 10px rgba(0 0 0 / 25%)",
                    },
                  }}
                />
              </AppProviders>
            </TimelineProvider>
          </CanvasProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppRouterCacheProvider>
  );
}
