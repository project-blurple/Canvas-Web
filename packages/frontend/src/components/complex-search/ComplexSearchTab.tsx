import type { PixelHistoryWrapper } from "@blurple-canvas-web/types";
import {
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  styled,
} from "@mui/material";
import type { DateTime } from "luxon";
import { useEffect, useState } from "react";
import { Heading } from "@/components/action-panel/ActionPanel";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
  TabPanel,
} from "@/components/action-panel/tabs/ActionPanelTabBody";
import { DynamicButton } from "@/components/button";
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

const StyledDialog = styled(Dialog)(() => ({
  "& .MuiDialog-paper": {
    boxShadow: "none",
    backgroundImage: "none",
  },
}));

export type SearchFilterMode = "include" | "exclude";

interface EraseHistoryDialogProps {
  open: boolean;
  entriesCount: number;
  usersLength: number;
  blockWhileErase: boolean;
  onBlockWhileEraseChange: (value: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

function EraseHistoryDialog({
  open,
  entriesCount,
  usersLength,
  blockWhileErase,
  onBlockWhileEraseChange,
  onCancel,
  onConfirm,
}: EraseHistoryDialogProps) {
  return (
    <StyledDialog
      open={open}
      onClose={onCancel}
      aria-labelledby="erase-history-dialog-title"
      aria-describedby="erase-history-dialog-description"
    >
      <DialogTitle id="erase-history-dialog-title">Erase history?</DialogTitle>
      <DialogContent>
        <DialogContentText id="erase-history-dialog-description">
          This will <em>permanently</em> delete {entriesCount.toLocaleString()}{" "}
          history {entriesCount !== 1 ? "entries" : "entry"}. Are you sure you
          want to continue?
        </DialogContentText>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={blockWhileErase}
              onChange={() => onBlockWhileEraseChange(!blockWhileErase)}
            />
          }
          label={`Add ${usersLength.toLocaleString()} user${usersLength !== 1 ? "s" : ""} to the blocklist`}
          disabled={entriesCount === 0}
        />
      </DialogContent>
      <DialogActions>
        <DynamicButton onClick={onCancel}>Cancel</DynamicButton>
        <DynamicButton backgroundColorStr="rgb(255,0,0)" onClick={onConfirm}>
          Erase
        </DynamicButton>
      </DialogActions>
    </StyledDialog>
  );
}

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

  const [blockWhileErase, setBlockWhileErase] = useState(false);
  const [isEraseConfirmOpen, setIsEraseConfirmOpen] = useState(false);

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
      setMinimumBounds(1, 1);
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
        x: selectedBounds.right,
        y: selectedBounds.bottom,
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

  function handleEraseHistory() {
    setIsEraseConfirmOpen(true);
  }

  async function performErase() {
    // TODO: call the actual erase logic (call API, update state)
    console.log("Erasing history...");
  }

  async function handleConfirmErase() {
    setIsEraseConfirmOpen(false);
    try {
      await performErase();
    } catch (e) {
      console.error(e);
      alert("Failed to erase history");
    }
  }

  function handleCancelErase() {
    setIsEraseConfirmOpen(false);
  }

  const pixelsInBounds =
    selectedBounds ?
      (selectedBounds.right - selectedBounds.left) *
      (selectedBounds.bottom - selectedBounds.top)
    : 0;

  const disabled = !selectedBounds || historyQuery.isLoading;

  const entriesCount = historyData?.totalEntries ?? 0;
  const usersLength = Object.keys(historyData?.users ?? {}).length;

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
        {historyData && (
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
        )}
      </FullWidthScrollView>
      {historyData && (
        <ActionPanelTabBody>
          <EraseWrapper>
            <DynamicButton
              disabled={entriesCount === 0}
              backgroundColorStr="rgb(255,0,0)" // bright red warning for destructive action >:)
              onClick={handleEraseHistory}
            >
              Erase {entriesCount.toLocaleString()} history{" "}
              {entriesCount !== 1 ? "entries" : "entry"}
            </DynamicButton>
          </EraseWrapper>
        </ActionPanelTabBody>
      )}
      <EraseHistoryDialog
        open={isEraseConfirmOpen}
        entriesCount={entriesCount}
        usersLength={usersLength}
        blockWhileErase={blockWhileErase}
        onBlockWhileEraseChange={setBlockWhileErase}
        onCancel={handleCancelErase}
        onConfirm={handleConfirmErase}
      />
    </ComplexSearchTabBlock>
  );
}
