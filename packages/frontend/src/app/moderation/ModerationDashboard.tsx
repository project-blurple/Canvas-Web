import styled from "@emotion/styled";
import { useEffect, useId, useState } from "react";
import {
  ActionPanelTabBar,
  ActionPanelWrapper,
  GenericTab,
} from "@/components/action-panel/primitives";
import { CanvasView } from "@/components/canvas";
import { ComplexSearchTab } from "@/components/complex-search";
import { SlideableDrawer } from "@/components/slideable-drawer";
import { useSelectedBoundsContext } from "@/contexts/SelectedBoundsContext";
import { CanvasWrapper } from "../Main";
import BlocklistTab from "./BlocklistTab";

const DashboardWrapper = styled(CanvasWrapper)`
  body:has(&) {
    --action-panel-width: 40rem;

    ${({ theme }) => theme.breakpoints.up("lg")} {
      --action-panel-width: 50rem;
    }
  }
`;

const ModTabBar = styled(ActionPanelTabBar)`
  grid-template-columns: repeat(2, 1fr);
`;

export default function ModerationDashboard() {
  return (
    <DashboardWrapper>
      <CanvasView
        actionPanel={<ModerationDashboardActionPanel />}
        canvasLabel="Moderation Dashboard"
        showInvite={false}
        showNotices={false}
        showReticle={false}
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
  const [areTabsLocked] = useState(false);

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

    setShowSelectedBounds(!(currentTab === "search" && newTab !== "search"));

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
