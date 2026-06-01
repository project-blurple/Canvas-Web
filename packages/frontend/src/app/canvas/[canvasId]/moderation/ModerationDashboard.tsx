import type { PixelHistoryOverlayPixel } from "@blurple-canvas-web/types";
import styled from "@emotion/styled";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useId, useState } from "react";
import { CanvasWrapper } from "@/app/Main";
import ActionPanelPrimitives from "@/components/action-panel/primitives";
import { CanvasView } from "@/components/canvas";
import { ComplexSearchTab } from "@/components/complex-search";
import { SlideableDrawer } from "@/components/slideable-drawer";
import { useSelectedBoundsContext } from "@/contexts/SelectedBoundsContext";
import BlocklistTab from "./BlocklistTab";

const DashboardWrapper = styled(CanvasWrapper)`
  body:has(&) {
    --action-panel-width: 40rem;

    ${({ theme }) => theme.breakpoints.up("lg")} {
      --action-panel-width: 50rem;
    }
  }
`;

const ModTabBar = styled(ActionPanelPrimitives.TabBar)`
  grid-template-columns: repeat(2, 1fr);
`;

export default function ModerationDashboard() {
  const [searchOverlayPixels, setSearchOverlayPixels] = useState<
    PixelHistoryOverlayPixel[] | null
  >(null);
  const [isSearchOverlayVisible, setIsSearchOverlayVisible] = useState(false);

  const actionPanel = (
    <ModerationDashboardActionPanel
      isSearchOverlayVisible={isSearchOverlayVisible}
      setIsSearchOverlayVisible={setIsSearchOverlayVisible}
      setSearchOverlayPixels={setSearchOverlayPixels}
    />
  );

  return (
    <DashboardWrapper>
      <CanvasView
        actionPanel={actionPanel}
        canvasLabel="Moderation dashboard"
        searchOverlayPixels={searchOverlayPixels}
        searchOverlayVisible={isSearchOverlayVisible}
        showInvite={false}
        showNotices={false}
        showReticle={false}
      />
      <SlideableDrawer>{actionPanel}</SlideableDrawer>
    </DashboardWrapper>
  );
}

type TabKey = "search" | "blocklist";

const Tab = ActionPanelPrimitives.GenericTab<TabKey>;

function ModerationDashboardActionPanel({
  isSearchOverlayVisible,
  setIsSearchOverlayVisible,
  setSearchOverlayPixels,
}: {
  isSearchOverlayVisible: boolean;
  setIsSearchOverlayVisible: Dispatch<SetStateAction<boolean>>;
  setSearchOverlayPixels: Dispatch<
    SetStateAction<PixelHistoryOverlayPixel[] | null>
  >;
}) {
  const [currentTab, setCurrentTab] = useState<TabKey>("search");
  const [areTabsLocked] = useState(false);

  const { resetSelectedBounds, setShowSelectedBounds } =
    useSelectedBoundsContext();

  const searchTabId = useId();
  const blocklistTabId = useId();

  useEffect(() => {
    return () => void resetSelectedBounds();
  }, [resetSelectedBounds]);

  const onSwitchTab = (newTab: TabKey) => {
    if (areTabsLocked) return;

    setShowSelectedBounds(!(currentTab === "search" && newTab !== "search"));
    if (newTab !== "search") {
      setIsSearchOverlayVisible(false);
    }

    setCurrentTab(newTab);
  };

  return (
    <ActionPanelPrimitives.Root>
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
      <ComplexSearchTab
        active={currentTab === "search"}
        id={searchTabId}
        isSearchOverlayVisible={isSearchOverlayVisible}
        setIsSearchOverlayVisible={setIsSearchOverlayVisible}
        setSearchOverlayPixels={setSearchOverlayPixels}
      />
      <BlocklistTab active={currentTab === "blocklist"} id={blocklistTabId} />
    </ActionPanelPrimitives.Root>
  );
}
