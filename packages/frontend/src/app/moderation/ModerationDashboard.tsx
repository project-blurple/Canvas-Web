import styled from "@emotion/styled";
import { useEffect, useId, useState } from "react";
import {
  ActionPanelWrapper,
  GenericTab,
  TabBar,
} from "@/components/action-panel/ActionPanel";
import { CanvasView } from "@/components/canvas";
import { SlideableDrawer } from "@/components/slideable-drawer";
import { useSelectedBoundsContext } from "@/contexts/SelectedBoundsContext";
import { CanvasWrapper } from "../Main";
import BlocklistTab from "./BlocklistTab";
import ComplexSearchTab from "./ComplexSearchTab";

const DashboardWrapper = styled(CanvasWrapper)`
  body:has(&) {
    --action-panel-width: 40rem;

    ${({ theme }) => theme.breakpoints.up("lg")} {
      --action-panel-width: 50rem;
    }
  }
`;

const ModTabBar = styled(TabBar)`
  grid-template-columns: repeat(2, 1fr);
`;

export default function ModerationDashboard() {
  return (
    <DashboardWrapper>
      <CanvasView
        showInvite={false}
        showReticle={false}
        canvasLabel="Moderation Dashboard"
      />
      <SlideableDrawer>
        <ModerationDashboardActionPanel />
      </SlideableDrawer>
    </DashboardWrapper>
  );
}

type TabKey = "search" | "blocklist";

const Tab = GenericTab<TabKey>;

function ModerationDashboardActionPanel() {
  const [currentTab, setCurrentTab] = useState("search");
  const [areTabsLocked, _setAreTabsLocked] = useState(false);

  const { resetSelectedBounds, setShowSelectedBounds } =
    useSelectedBoundsContext();

  const searchTabId = useId();
  const blocklistTabId = useId();

  useEffect(() => {
    return () => {
      resetSelectedBounds();
    };
  }, [resetSelectedBounds]);

  const onSwitchTab = (newTab: TabKey) => {
    if (areTabsLocked) return;

    if (currentTab === "search" && newTab !== "search") {
      setShowSelectedBounds(false);
    } else {
      setShowSelectedBounds(true);
    }

    setCurrentTab(newTab);
  };

  return (
    <ActionPanelWrapper>
      <ModTabBar role="tablist">
        <Tab
          aria-controls={searchTabId}
          aria-disabled={areTabsLocked && currentTab !== "search"}
          aria-selected={currentTab === "search"}
          tabKey="search"
          onSwitchTab={onSwitchTab}
        >
          Search
        </Tab>
        <Tab
          aria-controls={blocklistTabId}
          aria-disabled={areTabsLocked && currentTab !== "blocklist"}
          aria-selected={currentTab === "blocklist"}
          tabKey="blocklist"
          onSwitchTab={onSwitchTab}
        >
          Blocklist
        </Tab>
      </ModTabBar>
      <ComplexSearchTab active={currentTab === "search"} id={searchTabId} />
      <BlocklistTab active={currentTab === "blocklist"} id={blocklistTabId} />
    </ActionPanelWrapper>
  );
}
