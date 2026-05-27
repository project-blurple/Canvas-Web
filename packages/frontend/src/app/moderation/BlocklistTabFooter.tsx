import styled from "@emotion/styled";
import { Chip, css, TextField } from "@mui/material";
import { useIsMutating } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { BasicButton, Button } from "@/components/button";
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

interface BlocklistFooterSectionProps {
  selectedUsers: Set<bigint>;
  userIdsToBlock: bigint[];
  onUserIdsToBlockChange: (value: Iterable<bigint>) => void;
  existingBlocklistIdStrings: Set<string>;
  onBlock: (userIds: Iterable<bigint>) => Promise<boolean>;
  selectionFormId: string;
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
        <BasicButton
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
        </BasicButton>
      </BlocklistAddBody>
    </BlocklistAddWrapper>
  );
}

function BlocklistRemoveSection({
  selectedUsers,
  selectionFormId,
}: BlocklistRemoveSectionProps) {
  const isRemoving =
    useIsMutating({ mutationKey: ["blocklist", "remove"] }) > 0;

  return (
    <BasicButton
      form={selectionFormId}
      type="submit"
      disabled={selectedUsers.size === 0 || Boolean(isRemoving)}
    >
      Remove {selectedUsers.size} user
      {selectedUsers.size !== 1 ? "s" : ""} from blocklist
    </BasicButton>
  );
}

export function BlocklistFooterSection({
  selectedUsers,
  userIdsToBlock,
  onUserIdsToBlockChange,
  existingBlocklistIdStrings,
  onBlock,
  selectionFormId,
}: BlocklistFooterSectionProps) {
  return (
    <BlocklistFooter>
      {selectedUsers.size === 0 ?
        <BlocklistAddSection
          userIdsToBlock={userIdsToBlock}
          onUserIdsToBlockChange={onUserIdsToBlockChange}
          existingBlocklistIdStrings={existingBlocklistIdStrings}
          onBlock={onBlock}
        />
      : <BlocklistRemoveSection
          selectedUsers={selectedUsers}
          selectionFormId={selectionFormId}
        />
      }
    </BlocklistFooter>
  );
}
