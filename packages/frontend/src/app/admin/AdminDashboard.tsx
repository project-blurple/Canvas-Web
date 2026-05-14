"use client";

import { styled } from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId } from "react";
import {
  ActionPanelTabBar,
  GenericTab,
} from "@/components/action-panel/primitives";
import LayoutWithHeader from "@/components/LayoutWithNavbar";
import { useAuthContext } from "@/contexts";
import AdminCanvasTab from "./AdminCanvasTab";
import AdminColorTab from "./AdminColorTab";
import AdminEventTab from "./AdminEventTab";

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

const pathToTabKey: Record<string, TabKey> = {
  "/admin/event": "event",
  "/admin/canvas": "canvas",
  "/admin/color": "color",
};

export default function AdminDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const eventTabId = useId();
  const canvasTabId = useId();
  const colorTabId = useId();

  const { user, isAuthResolved } = useAuthContext();
  useEffect(() => {
    if (!isAuthResolved) return;
    if (!user?.isCanvasAdmin) router.replace("/");
  }, [isAuthResolved, router, user?.isCanvasAdmin]);

  if (isAuthResolved && !user?.isCanvasAdmin) {
    return null;
  }

  const activeTab = pathToTabKey[pathname ?? ""] ?? "event";

  const handleTabChange = (tabKey: TabKey) => {
    router.push(`/admin/${tabKeyToPath[tabKey]}`);
  };

  return (
    <LayoutWithHeader>
      <Wrapper>
        <h1>Admin</h1>
        <ActionPanelTabBar role="tablist">
          <Tab
            aria-controls={eventTabId}
            aria-selected={activeTab === "event"}
            tabKey="event"
            onSwitchTab={handleTabChange}
          >
            Event
          </Tab>
          <Tab
            aria-controls={canvasTabId}
            aria-selected={activeTab === "canvas"}
            tabKey="canvas"
            onSwitchTab={handleTabChange}
          >
            Canvas
          </Tab>
          <Tab
            aria-controls={colorTabId}
            aria-selected={activeTab === "color"}
            tabKey="color"
            onSwitchTab={handleTabChange}
          >
            Color
          </Tab>
        </ActionPanelTabBar>
        <AdminEventTab active={activeTab === "event"} id={eventTabId} />
        <AdminCanvasTab active={activeTab === "canvas"} id={canvasTabId} />
        <AdminColorTab active={activeTab === "color"} id={colorTabId} />
      </Wrapper>
    </LayoutWithHeader>
  );
}
