"use client";

import { styled } from "@mui/material";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import {
  ActionPanelTabBar,
  GenericTab,
} from "@/components/action-panel/primitives";
import AdminCanvasTab from "./AdminCanvasTab";
import AdminColorTab from "./AdminColorTab";
import AdminEventTab from "./AdminEventTab";
import AdminNoticeTab from "./AdminNoticeTab";
import AdminPasteTab from "./AdminPasteTab";
import { pathToTabKey, type TabKey, tabKeyToPath } from "./tabs";

const AdminTabBar = styled(ActionPanelTabBar)`
  grid-template-columns: repeat(5, 1fr);
`;

const Wrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: calc(2 * var(--layout-padding-y));
  padding-block: 4rem;
  padding-inline: var(--layout-padding-x);
  place-items: center;
`;

const Tab = styled(GenericTab<TabKey>)`
  &[aria-selected="true"] {
    background-color: oklch(from var(--discord-legacy-greyple) l c h / 30%);
  }
`;

export default function AdminDashboard() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<TabKey>("event");

  const canvasTabId = useId();
  const colorTabId = useId();
  const eventTabId = useId();
  const noticeTabId = useId();
  const pasteTabId = useId();

  useEffect(() => {
    const tabFromPath = pathToTabKey[pathname ?? ""] ?? "event";
    setActiveTab(tabFromPath);
  }, [pathname]);

  const handleTabChange = (tabKey: TabKey) => {
    setActiveTab(tabKey);
    const newPath = `/admin/${tabKeyToPath[tabKey]}`;
    window.history.replaceState(null, "", newPath);
  };

  return (
    <Wrapper>
      <h1>Admin</h1>
      <AdminTabBar role="tablist">
        <Tab
          aria-controls={eventTabId}
          aria-selected={activeTab === "event"}
          tabKey="event"
          onSwitchTab={handleTabChange}
        >
          Event
        </Tab>
        <Tab
          aria-controls={noticeTabId}
          aria-selected={activeTab === "notice"}
          tabKey="notice"
          onSwitchTab={handleTabChange}
        >
          Notice
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
        <Tab
          aria-controls={pasteTabId}
          aria-selected={activeTab === "paste"}
          tabKey="paste"
          onSwitchTab={handleTabChange}
        >
          Paste
        </Tab>
      </AdminTabBar>
      <AdminEventTab active={activeTab === "event"} id={eventTabId} />
      <AdminCanvasTab active={activeTab === "canvas"} id={canvasTabId} />
      <AdminColorTab active={activeTab === "color"} id={colorTabId} />
      <AdminNoticeTab active={activeTab === "notice"} id={noticeTabId} />
      <AdminPasteTab active={activeTab === "paste"} id={pasteTabId} />
    </Wrapper>
  );
}
