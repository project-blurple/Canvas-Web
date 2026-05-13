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
  flex-direction: row;
  gap: 0.5rem;
  width: 100%;
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

export function BlocklistFooterSection({
  selectedUsersCount,
  userIdsToBlock,
  onUserIdsToBlockChange,
  existingBlocklistIdStrings,
}: BlocklistFooterSectionProps) {
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

    if (/[\s,]/.test(newInputValue)) {
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
    <BlocklistFooter>
      {selectedUsersCount === 0 ?
        <BlocklistAddWrapper>
          <BlocklistAutocompleteWrapper>
            {inputtedUsersAlreadyBlocked && (
              <span>
                <TriangleAlert size={14} /> You have listed users that are
                already blocked.
              </span>
            )}
            <AutocompleteInput
              freeSolo
              fullWidth
              multiple
              options={[]} // Don't want a dropdown, this should all be user input only
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
          <Button>Block</Button>
        </BlocklistAddWrapper>
      : <Button disabled={selectedUsersCount === 0}>
          Remove {selectedUsersCount} user
          {selectedUsersCount !== 1 ? "s" : ""} from blocklist
        </Button>
      }
    </BlocklistFooter>
  );
}
