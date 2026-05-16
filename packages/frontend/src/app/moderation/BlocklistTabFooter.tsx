import styled from "@emotion/styled";
import { Chip, css, TextField } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { StyledButton } from "@/components/button/DynamicButton";
import { AutocompleteInput } from "@/components/input/Input";
import config from "@/config/clientConfig";

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

const Button = styled(StyledButton)`
  color: white;
  flex-shrink: 0;
  width: auto;
`;

interface BlocklistFooterSectionProps {
  selectedUsers: Set<bigint>;
  userIdsToBlock: bigint[];
  onUserIdsToBlockChange: (value: Iterable<bigint>) => void;
  existingBlocklistIdStrings: Set<string>;
}

interface BlocklistAddSectionProps {
  userIdsToBlock: bigint[];
  onUserIdsToBlockChange: (value: Iterable<bigint>) => void;
  existingBlocklistIdStrings: Set<string>;
  onBlock?: (userIds: bigint[]) => void;
  isBlocking?: boolean;
}

interface BlocklistRemoveSectionProps {
  selectedUsers: Set<bigint>;
  userIdsToBlock: bigint[];
  onRemove?: (userIds: bigint[]) => void;
  isRemoving?: boolean;
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
  isBlocking,
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
        <Button
          disabled={
            userIdsToBlock.length === 0 ||
            inputtedUsersAlreadyBlocked ||
            Boolean(isBlocking)
          }
          onClick={() => onBlock?.(userIdsToBlock)}
        >
          Block
        </Button>
      </BlocklistAddBody>
    </BlocklistAddWrapper>
  );
}

function BlocklistRemoveSection({
  selectedUsers,
  onRemove,
  isRemoving,
}: BlocklistRemoveSectionProps) {
  return (
    <Button
      disabled={selectedUsers.size === 0 || Boolean(isRemoving)}
      onClick={() => onRemove?.([...selectedUsers])}
    >
      Remove {selectedUsers.size} user
      {selectedUsers.size !== 1 ? "s" : ""} from blocklist
    </Button>
  );
}

export function BlocklistFooterSection({
  selectedUsers,
  userIdsToBlock,
  onUserIdsToBlockChange,
  existingBlocklistIdStrings,
}: BlocklistFooterSectionProps) {
  const queryClient = useQueryClient();

  const addToBlocklistMutation = useMutation({
    mutationFn: async (ids: bigint[]) => {
      const url = `${config.apiUrl}/api/v1/blocklist`;
      await axios.put(
        url,
        { userId: ids.map((id) => id.toString()) },
        { withCredentials: true },
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blocklist"] }),
  });

  const removeFromBlocklistMutation = useMutation({
    mutationFn: async (ids: bigint[]) => {
      const url = `${config.apiUrl}/api/v1/blocklist`;
      await axios.delete(url, {
        data: { userId: ids.map((id) => id.toString()) },
        withCredentials: true,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blocklist"] }),
  });

  async function handleAdd(ids: bigint[]) {
    try {
      await addToBlocklistMutation.mutateAsync(ids);
      onUserIdsToBlockChange([]);
    } catch (e) {
      console.error(e);
      if ((e as { response?: { status?: number } }).response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        return;
      }

      alert("Failed to add users to blocklist");
    }
  }

  async function handleRemove(ids: bigint[]) {
    try {
      await removeFromBlocklistMutation.mutateAsync(ids);
    } catch (e) {
      console.error(e);
      if ((e as { response?: { status?: number } }).response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        return;
      }

      alert("Failed to remove users from blocklist");
    }
  }

  return (
    <BlocklistFooter>
      {selectedUsers.size === 0 ?
        <BlocklistAddSection
          userIdsToBlock={userIdsToBlock}
          onUserIdsToBlockChange={onUserIdsToBlockChange}
          existingBlocklistIdStrings={existingBlocklistIdStrings}
          onBlock={handleAdd}
          isBlocking={addToBlocklistMutation.status === "pending"}
        />
      : <BlocklistRemoveSection
          selectedUsers={selectedUsers}
          userIdsToBlock={userIdsToBlock}
          onRemove={handleRemove}
          isRemoving={removeFromBlocklistMutation.status === "pending"}
        />
      }
    </BlocklistFooter>
  );
}
