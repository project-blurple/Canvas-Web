import styled from "@emotion/styled";
import { Chip, css, TextField } from "@mui/material";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { StyledButton } from "@/components/button/DynamicButton";
import { AutocompleteInput } from "@/components/input/Input";

const BlocklistFooter = styled("div")`
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

const Button = styled(StyledButton)`
  color: white;
  flex-shrink: 0;
  width: auto;
`;

interface BlocklistFooterSectionProps {
  selectedUsersCount: number;
  userIdsToBlock: bigint[];
  onUserIdsToBlockChange: (value: bigint[]) => void;
  existingBlocklistIdStrings: Set<string>;
}

interface BlocklistAddSectionProps {
  userIdsToBlock: bigint[];
  onUserIdsToBlockChange: (value: bigint[]) => void;
  existingBlocklistIdStrings: Set<string>;
}

interface BlocklistRemoveSectionProps {
  selectedUsersCount: number;
  userIdsToBlock: bigint[];
}

function parseUserIds(value: string): bigint[] {
  return value
    .split(/[\s,]+/)
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id))
    .map((id) => BigInt(id));
}

function normalizeUserIds(values: readonly bigint[]): bigint[] {
  return [...new Set(values)];
}

function blockUsers(userIds: bigint[]) {
  // TODO: Implement blocklisting users by their IDs
  console.log("Blocking users with IDs:", userIds);
}

function BlocklistAddSection({
  userIdsToBlock,
  onUserIdsToBlockChange,
  existingBlocklistIdStrings,
}: BlocklistAddSectionProps) {
  const [userIdsToBlockInputValue, setUserIdsToBlockInputValue] = useState("");

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
        onUserIdsToBlockChange(
          normalizeUserIds([...userIdsToBlock, ...parsedIds]),
        );
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
          blocked.
        </BlocklistWarning>
      )}
      <BlocklistAddBody>
        <BlocklistAutocompleteWrapper>
          <AutocompleteInput
            freeSolo
            fullWidth
            multiple
            options={[]}
            value={userIdsToBlock}
            inputValue={userIdsToBlockInputValue}
            filterSelectedOptions
            getOptionLabel={(option) => String(option)}
            onChange={(_event, newValues) => {
              if (!Array.isArray(newValues)) {
                onUserIdsToBlockChange([]);
                return;
              }

              const normalizedIds = normalizeUserIds(
                newValues.flatMap((value) => {
                  if (typeof value === "bigint") {
                    return [value];
                  }
                  return parseUserIds(String(value));
                }),
              );

              onUserIdsToBlockChange(normalizedIds);
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
        <Button
          disabled={userIdsToBlock.length === 0 || inputtedUsersAlreadyBlocked}
          onClick={() => blockUsers(userIdsToBlock)}
        >
          Block
        </Button>
      </BlocklistAddBody>
    </BlocklistAddWrapper>
  );
}

function BlocklistRemoveSection({
  selectedUsersCount,
  userIdsToBlock,
}: BlocklistRemoveSectionProps) {
  return (
    <Button
      disabled={selectedUsersCount === 0}
      onClick={() => blockUsers(userIdsToBlock)}
    >
      Remove {selectedUsersCount} user
      {selectedUsersCount !== 1 ? "s" : ""} from blocklist
    </Button>
  );
}

export function BlocklistFooterSection({
  selectedUsersCount,
  userIdsToBlock,
  onUserIdsToBlockChange,
  existingBlocklistIdStrings,
}: BlocklistFooterSectionProps) {
  return (
    <BlocklistFooter>
      {selectedUsersCount === 0 ?
        <BlocklistAddSection
          userIdsToBlock={userIdsToBlock}
          onUserIdsToBlockChange={onUserIdsToBlockChange}
          existingBlocklistIdStrings={existingBlocklistIdStrings}
        />
      : <BlocklistRemoveSection
          selectedUsersCount={selectedUsersCount}
          userIdsToBlock={userIdsToBlock}
        />
      }
    </BlocklistFooter>
  );
}
