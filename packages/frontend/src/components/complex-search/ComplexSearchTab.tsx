import type { PixelHistoryWrapper } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import type { AxiosError } from "axios";
import type { DateTime } from "luxon";
import { useEffect, useState } from "react";
import ActionPanelPrimitives from "@/components/action-panel/primitives";
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
import type { ViewBounds } from "@/util";
import { durationFormat } from "@/util";
import {
  ComplexSearchBoundsSelect,
  ComplexSearchColorSelect,
  ComplexSearchDateSelect,
  ComplexSearchUserSelect,
} from "../complex-search";
import ComplexSearchEraseHistory from "./ComplexSearchEraseHistory";
import SearchUserEntries from "./SearchUserEntry";

const ComplexSearchTabBlock = styled(TabPanel)`
  grid-template-rows: 1fr auto;
`;

const Form = styled("form")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  > :first-child {
    margin-top: 0;
  }
`;

const SummaryGrid = styled("div")`
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
`;

const SummaryCard = styled("div")`
  border: var(--card-border);
  border-radius: 0.75rem;
  padding: 0.75rem;
  background: var(--discord-legacy-not-quite-black);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const EraseWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

function areBoundsValid(bounds: ViewBounds | null): boolean {
  if (!bounds) return false;

  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;

  return (
    width >= COMPLEX_SEARCH_BOUNDS_MIN_SIZE.width &&
    height >= COMPLEX_SEARCH_BOUNDS_MIN_SIZE.height
  );
}

export type SearchFilterMode = "include" | "exclude";

export default function ComplexSearchTab({
  ...props
}: React.ComponentPropsWithoutRef<typeof ComplexSearchTabBlock>) {
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

  const [selectedColorIds, setSelectedColorIds] = useState<number[]>([]);
  const [colorFilterMode, setColorFilterMode] =
    useState<SearchFilterMode>("include");

  const [selectedUserIds, setSelectedUserIds] = useState<bigint[]>([]);
  const [userFilterMode, setUserFilterMode] =
    useState<SearchFilterMode>("include");

  const [fromTime, setFromTime] = useState<DateTime | null>(null);
  const [toTime, setToTime] = useState<DateTime | null>(null);

  const [searchQuery, setSearchQuery] =
    useState<ComplexPixelHistoryQuery | null>(null);
  const historyQuery = useComplexPixelHistory(canvas.id, searchQuery);
  const historyData: PixelHistoryWrapper | null =
    searchQuery === null ? null : (historyQuery.data ?? null);

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

  function handleSearchSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
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
  }

  const pixelsInBounds =
    selectedBounds ?
      (selectedBounds.right - selectedBounds.left) *
      (selectedBounds.bottom - selectedBounds.top)
    : 0;

  const boundsValid = areBoundsValid(selectedBounds);
  const isLoading = historyQuery.isLoading;

  const entriesCount = historyData?.totalEntries ?? 0;
  const usersLength = Object.keys(historyData?.users ?? {}).length;

  const Results: React.FC = () => {
    if (historyQuery.status === "error") {
      const { status } = historyQuery.error as AxiosError;
      const allowed = [401, 500];

      if (status && allowed.includes(status)) {
        const errorText: Record<string, [string, string]> = {
          401: [
            "Unauthorized",
            "You don’t have permission to perform this search. How’d you get here?",
          ],
          500: [
            "Server error",
            "Something went wrong on our end while processing this search",
          ],
        };

        return (
          <ActionPanelTabBody>
            <div>
              <ActionPanelPrimitives.SectionHeading>
                {errorText[status][0]}
              </ActionPanelPrimitives.SectionHeading>
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
            <ActionPanelPrimitives.SectionHeading>
              Search results
            </ActionPanelPrimitives.SectionHeading>
            <SummaryGrid>
              <SummaryCard>
                <strong>Total entries</strong>
                <span>{entriesCount.toLocaleString()}</span>
              </SummaryCard>
              <SummaryCard>
                <strong>Query duration</strong>
                <span>
                  {durationFormat()?.format({
                    milliseconds: Math.max(
                      0,
                      Math.floor(historyQuery.data?.executionDurationMs ?? 0),
                    ),
                  })}
                </span>
              </SummaryCard>
              <SummaryCard>
                <strong>Users</strong>
                <span>{usersLength.toLocaleString()}</span>
              </SummaryCard>
            </SummaryGrid>
            {usersLength > 0 && (
              <>
                <ActionPanelPrimitives.SectionHeading>
                  User summary
                </ActionPanelPrimitives.SectionHeading>
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
  };

  return (
    <ComplexSearchTabBlock {...props}>
      <FullWidthScrollView>
        <ActionPanelTabBody>
          <search>
            <Form onSubmit={handleSearchSubmit}>
              <ActionPanelPrimitives.SectionHeading>
                History search
              </ActionPanelPrimitives.SectionHeading>
              <ComplexSearchBoundsSelect
                canvas={canvas}
                selectedBounds={selectedBounds}
                setSelectedBounds={setSelectedBounds}
                disabled={isLoading}
              />
              <ComplexSearchColorSelect
                value={selectedColorIds}
                filterMode={colorFilterMode}
                onChange={setSelectedColorIds}
                onFilterModeChange={setColorFilterMode}
                disabled={isLoading}
              />
              <ComplexSearchUserSelect
                historyData={historyData}
                value={selectedUserIds}
                filterMode={userFilterMode}
                onChange={setSelectedUserIds}
                onFilterModeChange={setUserFilterMode}
                disabled={isLoading}
              />
              <ComplexSearchDateSelect
                fromTime={fromTime}
                toTime={toTime}
                setFromTime={setFromTime}
                setToTime={setToTime}
                disabled={isLoading}
              />
              <DynamicButton type="submit" disabled={!boundsValid || isLoading}>
                {!historyQuery.isLoading ?
                  `Search (${pixelsInBounds.toLocaleString()} pixel${pixelsInBounds !== 1 ? "s" : ""})`
                : "Searching..."}
              </DynamicButton>
            </Form>
          </search>
        </ActionPanelTabBody>
        <Results />
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
