import type {
  PixelHistoryOverlayPixel,
  PixelHistoryWrapper,
} from "@blurple-canvas-web/types";
import { Checkbox, FormControlLabel, styled } from "@mui/material";
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
import {
  type ComplexPixelHistoryParams,
  useComplexPixelHistory,
} from "@/hooks/queries/usePixelHistory";
import type { ViewBounds } from "@/util";
import { durationFormatNarrow } from "@/util/intl";
import {
  ComplexSearchBoundsSelect,
  ComplexSearchColorSelect,
  ComplexSearchDateSelect,
  ComplexSearchUserSelect,
} from "../complex-search";
import ComplexSearchEraseHistory from "./ComplexSearchEraseHistory";
import SearchUserEntries, {
  type SearchUserSortBy,
  type SearchUserSortDirection,
} from "./SearchUserEntry";

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

const ResultsHeader = styled("div")`
  align-items: center;
  display: flex;
  justify-content: space-between;
`;

const Summary = styled("p")`
  opacity: 60%;
  margin-block: 1em;
`;

const SortSelect = styled("select")`
  background-color: var(--discord-legacy-not-quite-black);
  border-radius: 0.5rem;
  border: var(--card-border);
  color: white;
  inline-size: max-content;
  padding: 0.25rem 0.25rem;

  cursor: pointer;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      outline: var(--focus-outline);
    }
  }

  &:has(:focus-visible) {
    outline: var(--focus-outline);
  }
`;

const SortControlRow = styled("div")`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const EraseWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

function hasOverlayFilters(params: ComplexPixelHistoryParams | null): boolean {
  if (!params) return false;

  return Boolean(
    params.fromDateTime ||
    params.toDateTime ||
    (params.includeUserIds?.length ?? 0) > 0 ||
    (params.excludeUserIds?.length ?? 0) > 0 ||
    (params.includeColors?.length ?? 0) > 0 ||
    (params.excludeColors?.length ?? 0) > 0,
  );
}

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

const sortOptions: { value: SearchUserSortBy; label: string }[] = [
  { value: "entryCount", label: "Entry count" },
  { value: "startTimestamp", label: "Start timestamp" },
  { value: "endTimestamp", label: "End timestamp" },
];

const sortDirectionOptions: {
  value: SearchUserSortDirection;
  label: string;
}[] = [
  { value: "descending", label: "Descending" },
  { value: "ascending", label: "Ascending" },
];

interface ComplexSearchTabProps extends React.ComponentPropsWithoutRef<
  typeof ComplexSearchTabBlock
> {
  isSearchOverlayVisible: boolean;
  setIsSearchOverlayVisible: (visible: boolean) => void;
  setSearchOverlayPixels: (pixels: PixelHistoryOverlayPixel[] | null) => void;
}

export default function ComplexSearchTab({
  isSearchOverlayVisible,
  setIsSearchOverlayVisible,
  setSearchOverlayPixels,
  ...props
}: ComplexSearchTabProps) {
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

  const [selectedColorIds, setSelectedColorIds] = useState<number[]>([]);
  const [colorFilterMode, setColorFilterMode] =
    useState<SearchFilterMode>("include");

  const [selectedUserIds, setSelectedUserIds] = useState<bigint[]>([]);
  const [userFilterMode, setUserFilterMode] =
    useState<SearchFilterMode>("include");

  const [sortBy, setSortBy] = useState<SearchUserSortBy>("entryCount");
  const [sortDirection, setSortDirection] =
    useState<SearchUserSortDirection>("descending");

  const [fromTime, setFromTime] = useState<DateTime | null>(null);
  const [toTime, setToTime] = useState<DateTime | null>(null);
  const [isErasingHistory, setIsErasingHistory] = useState(false);

  const [searchParams, setSearchParams] =
    useState<ComplexPixelHistoryParams | null>(null);
  const historyQuery = useComplexPixelHistory(canvas.id, searchParams);
  const historyData: PixelHistoryWrapper | null =
    searchParams === null ? null : (historyQuery.data ?? null);
  const overlayFiltersActive = hasOverlayFilters(searchParams);
  const showSearchOverlayToggle =
    overlayFiltersActive && (historyData?.overlayPixels?.length ?? 0) > 0;

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
    function synchroniseSearchOverlay() {
      if (!props.active || !showSearchOverlayToggle) {
        setSearchOverlayPixels(null);
        setIsSearchOverlayVisible(false);
        return;
      }

      setSearchOverlayPixels(historyData?.overlayPixels ?? null);
      setIsSearchOverlayVisible(true);
    },
    [
      historyData?.overlayPixels,
      props.active,
      setIsSearchOverlayVisible,
      setSearchOverlayPixels,
      showSearchOverlayToggle,
    ],
  );

  function handleSearchSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBounds) return;

    setCanEdit(false);
    setSearchOverlayPixels(null);
    setIsSearchOverlayVisible(false);

    setSearchParams({
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
    setSearchOverlayPixels(null);
    setIsSearchOverlayVisible(false);
    setSearchParams(null);
  }

  const pixelsInBounds =
    selectedBounds ?
      (selectedBounds.right - selectedBounds.left) *
      (selectedBounds.bottom - selectedBounds.top)
    : 0;

  const boundsValid = areBoundsValid(selectedBounds);
  const isLoading = historyQuery.isLoading || isErasingHistory;

  const entriesCount = historyData?.total ?? 0;
  const usersLength = Object.keys(historyData?.users ?? {}).length;

  function handleSortChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setSortBy(event.target.value as SearchUserSortBy);
  }

  function handleSortDirectionChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ) {
    setSortDirection(event.target.value as SearchUserSortDirection);
  }

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
            <ResultsHeader>
              <Summary>
                <strong>
                  {entriesCount.toLocaleString()}&nbsp;
                  {entriesCount === 1 ? "entry" : "entries"}
                </strong>
                {" from "}
                <strong>
                  {usersLength.toLocaleString()}&nbsp;
                  {usersLength === 1 ? "user" : "users"}{" "}
                </strong>
                (
                {durationFormatNarrow?.format({
                  milliseconds: Math.max(
                    0,
                    historyQuery.data?.executionDurationMs ?? 0,
                  ),
                })}
                )
              </Summary>
              <SortControlRow>
                <SortSelect value={sortBy} onChange={handleSortChange}>
                  {sortOptions.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SortSelect>
                <SortSelect
                  aria-label="Sort direction"
                  value={sortDirection}
                  onChange={handleSortDirectionChange}
                >
                  {sortDirectionOptions.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SortSelect>
              </SortControlRow>
            </ResultsHeader>
            <SearchUserEntries
              users={historyData.users}
              sortBy={sortBy}
              sortDirection={sortDirection}
              style={{ gridArea: "--results" }}
            />
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
            <ActionPanelPrimitives.SectionHeading>
              History search
            </ActionPanelPrimitives.SectionHeading>
            <Form onSubmit={handleSearchSubmit}>
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
      {historyData && searchParams && (
        <ActionPanelTabBody>
          <EraseWrapper>
            {showSearchOverlayToggle && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isSearchOverlayVisible}
                    onChange={(event) =>
                      setIsSearchOverlayVisible(event.target.checked)
                    }
                    size="small"
                  />
                }
                label="Show search overlay"
              />
            )}
            <ComplexSearchEraseHistory
              entriesCount={entriesCount}
              usersLength={usersLength}
              params={searchParams}
              resetResults={resetResults}
              onPendingChange={setIsErasingHistory}
            />
          </EraseWrapper>
        </ActionPanelTabBody>
      )}
    </ComplexSearchTabBlock>
  );
}
