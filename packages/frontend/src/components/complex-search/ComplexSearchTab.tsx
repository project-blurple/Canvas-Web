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

const Summary = styled("p")`
  opacity: 60%;
  margin-block: 1em;
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

  const [selectedColorIds, setSelectedColorIds] = useState<number[]>([]);
  const [colorFilterMode, setColorFilterMode] =
    useState<SearchFilterMode>("include");

  const [selectedUserIds, setSelectedUserIds] = useState<bigint[]>([]);
  const [userFilterMode, setUserFilterMode] =
    useState<SearchFilterMode>("include");

  const [fromTime, setFromTime] = useState<DateTime | null>(null);
  const [toTime, setToTime] = useState<DateTime | null>(null);

  const [searchParams, setSearchParams] =
    useState<ComplexPixelHistoryParams | null>(null);
  const historyQuery = useComplexPixelHistory(canvas.id, searchParams);
  const historyData: PixelHistoryWrapper | null =
    searchParams === null ? null : (historyQuery.data ?? null);

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
    setSearchParams(null);
  }

  const pixelsInBounds =
    selectedBounds ?
      (selectedBounds.right - selectedBounds.left) *
      (selectedBounds.bottom - selectedBounds.top)
    : 0;

  const boundsValid = areBoundsValid(selectedBounds);
  const isLoading = historyQuery.isLoading;

  const entriesCount = historyData?.total ?? 0;
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
            <SearchUserEntries users={historyData.users} />
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
            <ComplexSearchEraseHistory
              entriesCount={entriesCount}
              usersLength={usersLength}
              query={searchParams}
              resetResults={resetResults}
            />
          </EraseWrapper>
        </ActionPanelTabBody>
      )}
    </ComplexSearchTabBlock>
  );
}
