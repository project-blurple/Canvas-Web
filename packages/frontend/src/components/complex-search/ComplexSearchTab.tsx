import type { PixelHistoryWrapper } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import type { AxiosError } from "axios";
import type { DateTime } from "luxon";
import { useEffect, useState } from "react";
import { Heading } from "@/components/action-panel/ActionPanel";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
  TabPanel,
} from "@/components/action-panel/tabs/ActionPanelTabBody";
import { DynamicButton } from "@/components/button";
import { COMPLEX_SEARCH_BOUNDS_MIN_SIZE } from "@/constants/selectedBounds";
import { useCanvasContext } from "@/contexts";
import { useCanvasViewContext } from "@/contexts/CanvasViewContext";
import { useSelectedBoundsContext } from "@/contexts/SelectedBoundsContext";
import { usePalette } from "@/hooks";
import {
  type ComplexPixelHistoryQuery,
  useComplexPixelHistory,
} from "@/hooks/queries/usePixelHistory";
import {
  ComplexSearchBoundsSelect,
  ComplexSearchColorSelect,
  ComplexSearchDateSelect,
  ComplexSearchUserSelect,
} from ".";
import ComplexSearchEraseHistory from "./ComplexSearchEraseHistory";
import SearchUserEntries from "./SearchUserEntry";

const ComplexSearchTabBlock = styled(TabPanel)`
  grid-template-rows: 1fr auto;
`;

const SearchWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SummaryGrid = styled("div")`
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
`;

const SummaryCard = styled("div")`
  border: 1px solid ${({ theme }) => theme.palette.divider};
  border-radius: 0.75rem;
  padding: 0.75rem;
  background: ${({ theme }) => theme.palette.background.paper};
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const EraseWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export type SearchFilterMode = "include" | "exclude";

interface ComplexSearchTabProps extends React.ComponentPropsWithoutRef<
  typeof ComplexSearchTabBlock
> {}

export default function ComplexSearchTab({ ...props }: ComplexSearchTabProps) {
  const {
    setCanEdit,
    selectedBounds,
    setSelectedBounds,
    setMinimumBounds,
    setBoundsToCurrentView,
    setShowSelectedBounds,
  } = useSelectedBoundsContext();
  const { containerRef } = useCanvasViewContext();
  const { canvas } = useCanvasContext();
  const { data: palette = [] } = usePalette(canvas.eventId ?? undefined);

  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  const [colorFilterMode, setColorFilterMode] =
    useState<SearchFilterMode>("include");

  const [selectedUserIds, setSelectedUserIds] = useState<bigint[]>([]);
  const [userFilterMode, setUserFilterMode] =
    useState<SearchFilterMode>("include");

  const [fromTime, setFromTime] = useState<DateTime | null>(null);
  const [toTime, setToTime] = useState<DateTime | null>(null);

  const [searchQuery, setSearchQuery] =
    useState<ComplexPixelHistoryQuery | null>(null);
  const [historyData, setHistoryData] = useState<PixelHistoryWrapper | null>(
    null,
  );
  const historyQuery = useComplexPixelHistory(canvas.id, searchQuery);

  useEffect(
    function initialiseBoundsFromCurrentView() {
      if (!props.active) return;
      if (!containerRef.current) return;

      if (selectedBounds) {
        setCanEdit(true);
        setShowSelectedBounds(true);
        return;
      }

      setBoundsToCurrentView(0.75);
      setMinimumBounds(
        COMPLEX_SEARCH_BOUNDS_MIN_SIZE.width,
        COMPLEX_SEARCH_BOUNDS_MIN_SIZE.height,
      );
      setCanEdit(true);
      setShowSelectedBounds(true);
    },
    [
      props.active,
      containerRef,
      selectedBounds,
      setBoundsToCurrentView,
      setMinimumBounds,
      setCanEdit,
      setShowSelectedBounds,
    ],
  );

  useEffect(
    function updateHistoryFromQuery() {
      if (!historyQuery.data) return;

      setHistoryData(historyQuery.data);
    },
    [historyQuery.data],
  );

  useEffect(
    function reenableEditOnQueryCompletion() {
      if (!historyQuery.isLoading) {
        setCanEdit(true);
      }
    },
    [historyQuery.isLoading, setCanEdit],
  );

  function handleSearchClick() {
    if (!selectedBounds) return;

    setCanEdit(false);

    setSearchQuery({
      point0: {
        x: selectedBounds.left,
        y: selectedBounds.top,
      },
      point1: {
        x: selectedBounds.right - 1,
        y: selectedBounds.bottom - 1,
      },
      [colorFilterMode === "include" ? "includeColors" : "excludeColors"]:
        selectedColorIds.length ? selectedColorIds : undefined,
      [userFilterMode === "include" ? "includeUserIds" : "excludeUserIds"]:
        selectedUserIds.length ?
          selectedUserIds.map((id) => id.toString())
        : undefined,
      fromDateTime: fromTime?.toISO() ?? undefined,
      toDateTime: toTime?.toISO() ?? undefined,
    });
  }

  function resetResults() {
    setSearchQuery(null);
    setHistoryData(null);
  }

  const pixelsInBounds =
    selectedBounds ?
      (selectedBounds.right - selectedBounds.left) *
      (selectedBounds.bottom - selectedBounds.top)
    : 0;

  const disabled = !selectedBounds || historyQuery.isLoading;

  const entriesCount = historyData?.totalEntries ?? 0;
  const usersLength = Object.keys(historyData?.users ?? {}).length;

  const results = (() => {
    if (historyQuery.status === "error") {
      const { status } = historyQuery.error as AxiosError;
      const allowed = [401, 500];

      if (status && allowed.includes(status)) {
        const errorText: Record<string, [string, string]> = {
          401: [
            "Unauthorized",
            "You don't have permission to perform this search. How'd you get here?",
          ],
          500: [
            "Server error",
            "Something went wrong on our end while processing this search.",
          ],
        };

        return (
          <ActionPanelTabBody>
            <div>
              <Heading>{errorText[status][0]}</Heading>
              <p>{errorText[status][1]}</p>
            </div>
          </ActionPanelTabBody>
        );
      }
    }

    if (historyData) {
      return (
        <ActionPanelTabBody>
          <div>
            <Heading>Search results</Heading>
            <SummaryGrid>
              <SummaryCard>
                <strong>Total entries</strong>
                <span>{entriesCount.toLocaleString()}</span>
              </SummaryCard>
              <SummaryCard>
                <strong>Query duration</strong>
                <span>{historyQuery.lastDurationMs?.toFixed(2) ?? 0} ms</span>
              </SummaryCard>
              <SummaryCard>
                <strong>Users</strong>
                <span>{usersLength.toLocaleString()}</span>
              </SummaryCard>
            </SummaryGrid>
            {usersLength > 0 && (
              <>
                <Heading>User summary</Heading>
                <SearchUserEntries
                  users={historyData.users}
                  palette={palette}
                />
              </>
            )}
          </div>
        </ActionPanelTabBody>
      );
    }

    return null;
  })();

  return (
    <ComplexSearchTabBlock {...props}>
      <FullWidthScrollView>
        <ActionPanelTabBody>
          <SearchWrapper>
            <Heading>History Search</Heading>
            <ComplexSearchBoundsSelect
              canvas={canvas}
              selectedBounds={selectedBounds}
              setSelectedBounds={setSelectedBounds}
              disabled={disabled}
            />
            <ComplexSearchColorSelect
              palette={palette}
              value={selectedColorIds}
              filterMode={colorFilterMode}
              onChange={setSelectedColorIds}
              onFilterModeChange={setColorFilterMode}
              disabled={disabled}
            />
            <ComplexSearchUserSelect
              historyData={historyData}
              value={selectedUserIds}
              filterMode={userFilterMode}
              onChange={setSelectedUserIds}
              onFilterModeChange={setUserFilterMode}
              disabled={disabled}
            />
            <ComplexSearchDateSelect
              fromTime={fromTime}
              toTime={toTime}
              setFromTime={setFromTime}
              setToTime={setToTime}
              disabled={disabled}
            />
            <DynamicButton
              onClick={handleSearchClick}
              disabled={!selectedBounds || historyQuery.isLoading}
            >
              {!historyQuery.isLoading ?
                `Search (${pixelsInBounds.toLocaleString()} pixels)`
              : "Searching..."}
            </DynamicButton>
          </SearchWrapper>
        </ActionPanelTabBody>
        {results}
      </FullWidthScrollView>
      {historyData && searchQuery && (
        <ActionPanelTabBody>
          <EraseWrapper>
            <ComplexSearchEraseHistory
              entriesCount={entriesCount}
              usersLength={usersLength}
              query={searchQuery}
              resetResults={resetResults}
            />
          </EraseWrapper>
        </ActionPanelTabBody>
      )}
    </ComplexSearchTabBlock>
  );
}
