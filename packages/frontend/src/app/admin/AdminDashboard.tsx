"use client";

import { styled } from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import {
  ActionPanelTabBar,
  GenericTab,
} from "@/components/action-panel/primitives";
import LayoutWithHeader from "@/components/LayoutWithNavbar";
import { useAuthContext } from "@/contexts";

const Wrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: calc(2 * var(--layout-padding-y));
  padding-block: 4rem;
  padding-inline: var(--layout-padding-x);
  place-items: center;
`;

type TabKey = "event" | "canvas" | "color";

const Tab = GenericTab<TabKey>;

const tabKeyToPath: Record<TabKey, string> = {
  event: "event",
  canvas: "canvas",
  color: "color",
};

export default function AdminDashboard({ children }: { children?: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const { user, isAuthResolved } = useAuthContext();
  useEffect(() => {
    if (!isAuthResolved) return;
    if (!user?.isCanvasAdmin) router.replace("/");
  }, [isAuthResolved, router, user?.isCanvasAdmin]);

  if (isAuthResolved && !user?.isCanvasAdmin) {
    return null;
  }

  const handleTabChange = (tabKey: TabKey) => {
    router.push(`/admin/${tabKeyToPath[tabKey]}`);
  };

  return (
    <LayoutWithHeader>
      <Wrapper>
        <h1>Admin</h1>
        <ActionPanelTabBar role="tablist">
          <Tab
            aria-selected={pathname === `/admin/${tabKeyToPath.event}`}
            tabKey="event"
            onSwitchTab={handleTabChange}
          >
            Event
          </Tab>
          <Tab
            aria-selected={pathname === `/admin/${tabKeyToPath.canvas}`}
            tabKey="canvas"
            onSwitchTab={handleTabChange}
          >
            Canvas
          </Tab>
          <Tab
            aria-selected={pathname === `/admin/${tabKeyToPath.color}`}
            tabKey="color"
            onSwitchTab={handleTabChange}
          >
            Color
          </Tab>
        </ActionPanelTabBar>
        {children}
      </Wrapper>
    </LayoutWithHeader>
  );
}
