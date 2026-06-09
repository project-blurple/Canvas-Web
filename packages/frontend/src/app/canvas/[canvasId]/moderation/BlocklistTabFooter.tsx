import styled from "@emotion/styled";
import { Chip, css, TextField } from "@mui/material";
import { useIsMutating } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/button/Button";
import { AutocompleteInput } from "@/components/input/Input";

const BlocklistFooter = styled("footer")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const BlocklistAddWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
`;

const BlocklistAddBody = styled("div")`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  width: 100%;
`;

const BlocklistWarning = styled("span")`
  display: flex;
  gap: 0.25rem;
  opacity: 0.75;
  font-size: 0.875rem;
`;

const BlocklistAutocompleteWrapper = styled("div")`
  flex: 1;
  min-width: 0;
`;

const BlocklistIdChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== "isExisting",
})<{ isExisting?: boolean }>`
  align-items: center;

  ${({ isExisting }) =>
    isExisting &&
    css`
      background-color: oklch(55% 0.22 25);
      color: white;

      & .MuiChip-deleteIcon,
      & .MuiChip-icon {
        color: white;
      }
    `}
`;

const StyledButton = styled(Button)`
  background-color: var(--discord-blurple);
  color: white;
  flex-shrink: 0;
  width: auto;

  &:hover,
  &:focus-visible {
    border-color: oklch(from var(--discord-white) l c h / 36%);
  }
`;

interface BlocklistFooterSectionProps {
  selectedUsers: Set<bigint>;
  userIdsToBlock: bigint[];
  onUserIdsToBlockChange: (value: Iterable<bigint>) => void;
  existingBlocklistIdStrings: Set<string>;
  onBlock: (userIds: Iterable<bigint>) => Promise<boolean>;
  selectionFormId: string;
  shouldRestoreHistory: boolean;
  onShouldRestoreHistoryChange: (value: boolean) => void;
}

interface BlocklistAddSectionProps {
  userIdsToBlock: bigint[];
  onUserIdsToBlockChange: (value: Iterable<bigint>) => void;
  existingBlocklistIdStrings: Set<string>;
  onBlock: (userIds: Iterable<bigint>) => Promise<boolean>;
}

interface BlocklistRemoveSectionProps {
  selectedUsers: Set<bigint>;
  selectionFormId: string;
  shouldRestoreHistory: boolean;
  onShouldRestoreHistoryChange: (value: boolean) => void;
}

function parseUserIds(value: string): bigint[] {
  return value
    .split(/[\s,]+/)
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id))
    .map((id) => BigInt(id));
}

function BlocklistAddSection({
  userIdsToBlock,
  onUserIdsToBlockChange,
  existingBlocklistIdStrings,
  onBlock,
}: BlocklistAddSectionProps) {
  const [userIdsToBlockInputValue, setUserIdsToBlockInputValue] = useState("");

  const isBlocking = useIsMutating({ mutationKey: ["blocklist", "add"] }) > 0;

  function handleUserIdsToBlockInputChange(
    _event: unknown,
    newInputValue: string,
    reason: string,
  ) {
    if (reason === "clear" || reason === "reset") {
      setUserIdsToBlockInputValue("");
      return;
    }

    if (/\s|,/.test(newInputValue)) {
      const parsedIds = parseUserIds(newInputValue);
      if (parsedIds.length > 0) {
        onUserIdsToBlockChange(new Set([...userIdsToBlock, ...parsedIds]));
      }
      setUserIdsToBlockInputValue("");
      return;
    }

    setUserIdsToBlockInputValue(newInputValue);
  }

  const inputtedUsersAlreadyBlocked = userIdsToBlock.some((id) =>
    existingBlocklistIdStrings.has(id.toString()),
  );

  return (
    <BlocklistAddWrapper>
      {inputtedUsersAlreadyBlocked && (
        <BlocklistWarning>
          <TriangleAlert size={14} /> You have listed users that are already
          blocked
        </BlocklistWarning>
      )}
      <BlocklistAddBody>
        <BlocklistAutocompleteWrapper>
          <AutocompleteInput
            freeSolo
            fullWidth
            multiple
            options={[]} // Just want the chips, no autocomplete options
            value={userIdsToBlock}
            inputValue={userIdsToBlockInputValue}
            filterSelectedOptions
            getOptionLabel={(option) => String(option)}
            disabled={isBlocking}
            onChange={(_event, newValues) => {
              if (!Array.isArray(newValues)) {
                onUserIdsToBlockChange([]);
                return;
              }

              onUserIdsToBlockChange(
                new Set(
                  newValues.flatMap((value) => {
                    if (typeof value === "bigint") {
                      return [value];
                    }
                    return parseUserIds(String(value));
                  }),
                ),
              );
            }}
            onInputChange={handleUserIdsToBlockInputChange}
            renderValue={(values, getItemProps) => (
              <>
                {(values as bigint[]).map((value, index) => {
                  const itemProps = getItemProps({ index });
                  const { key: _key, ...restProps } = itemProps;
                  const isExisting = existingBlocklistIdStrings.has(
                    value.toString(),
                  );

                  return (
                    <BlocklistIdChip
                      key={value.toString()}
                      {...restProps}
                      color={isExisting ? "error" : "default"}
                      icon={
                        isExisting ? <TriangleAlert size={14} /> : undefined
                      }
                      isExisting={isExisting}
                      label={value.toString()}
                      size="small"
                    />
                  );
                })}
              </>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="User IDs to block"
                variant="standard"
              />
            )}
          />
        </BlocklistAutocompleteWrapper>
        <StyledButton
          type="button"
          disabled={
            userIdsToBlock.length === 0 ||
            inputtedUsersAlreadyBlocked ||
            Boolean(isBlocking)
          }
          onClick={async () => {
            const success = await onBlock(userIdsToBlock);
            if (success) {
              setUserIdsToBlockInputValue("");
            }
          }}
        >
          Block
        </StyledButton>
      </BlocklistAddBody>
    </BlocklistAddWrapper>
  );
}

function BlocklistRemoveSection({
  selectedUsers,
  selectionFormId,
  shouldRestoreHistory,
  onShouldRestoreHistoryChange,
}: BlocklistRemoveSectionProps) {
  const isRemoving =
    useIsMutating({ mutationKey: ["blocklist", "remove"] }) > 0;

  return (
    <BlocklistAddWrapper>
      <label>
        <input
          checked={shouldRestoreHistory}
          disabled={Boolean(isRemoving)}
          onChange={(event) =>
            onShouldRestoreHistoryChange(event.currentTarget.checked)
          }
          type="checkbox"
        />{" "}
        Restore erased pixel history
      </label>
      <StyledButton
        form={selectionFormId}
        type="submit"
        disabled={selectedUsers.size === 0 || Boolean(isRemoving)}
      >
        Remove {selectedUsers.size} user
        {selectedUsers.size !== 1 ? "s" : ""} from blocklist
      </StyledButton>
    </BlocklistAddWrapper>
  );
}

export function BlocklistFooterSection({
  selectedUsers,
  userIdsToBlock,
  onUserIdsToBlockChange,
  existingBlocklistIdStrings,
  onBlock,
  selectionFormId,
  shouldRestoreHistory,
  onShouldRestoreHistoryChange,
}: BlocklistFooterSectionProps) {
  return (
    <BlocklistFooter>
      {selectedUsers.size === 0 ?
        <BlocklistAddSection
          existingBlocklistIdStrings={existingBlocklistIdStrings}
          userIdsToBlock={userIdsToBlock}
          onBlock={onBlock}
          onUserIdsToBlockChange={onUserIdsToBlockChange}
        />
      : <BlocklistRemoveSection
          selectedUsers={selectedUsers}
          selectionFormId={selectionFormId}
          shouldRestoreHistory={shouldRestoreHistory}
          onShouldRestoreHistoryChange={onShouldRestoreHistoryChange}
        />
      }
    </BlocklistFooter>
  );
}
