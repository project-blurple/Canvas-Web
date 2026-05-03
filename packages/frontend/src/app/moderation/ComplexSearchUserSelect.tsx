"use client";

import type { PixelHistoryWrapper } from "@blurple-canvas-web/types";
import { Autocomplete, styled, TextField } from "@mui/material";
import { SquareMinus, SquarePlus } from "lucide-react";
import { useMemo } from "react";
import DynamicButton from "@/components/button/DynamicButton";
import type { SearchFilterMode } from "./ComplexSearchTab";

const UserSelectBlock = styled("div")`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  align-items: center;
`;

const ToggleFilterModeButton = styled(DynamicButton)`
  min-width: auto;
`;

interface UserOption {
  id: bigint;
  username: string | null;
  label: string; // "username (ID)" for display
}

interface ComplexSearchUserSelectProps {
  historyData: PixelHistoryWrapper | null;
  value: bigint[];
  filterMode: SearchFilterMode;
  onChange: (value: bigint[]) => void;
  onFilterModeChange: (mode: SearchFilterMode) => void;
  disabled: boolean;
}

export default function ComplexSearchUserSelect({
  historyData,
  value,
  filterMode,
  onChange,
  onFilterModeChange,
  disabled,
}: ComplexSearchUserSelectProps) {
  // Build list of available users from search results
  const availableUsers = useMemo(() => {
    if (!historyData?.users) return [];

    return Object.entries(historyData.users)
      .map(([userId, summary]) => {
        const username = summary.userProfile?.username ?? `Unknown (${userId})`;
        return {
          id: BigInt(userId),
          username,
          label: `${username} (${userId})`,
        };
      })
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [historyData?.users]);

  // Create a map of ID to user for quick lookup
  const userMap = useMemo(
    () => new Map(availableUsers.map((user) => [user.id.toString(), user])),
    [availableUsers],
  );

  // Parse input to extract user ID from "username" or "ID" format
  function parseUserInput(input: string): bigint | null {
    const trimmed = input.trim();

    // Try to parse as bigint directly
    try {
      return BigInt(trimmed);
    } catch {
      // Not a valid ID
    }

    // Try to find by username
    const userByName = availableUsers.find(
      (user) => user.username.toLowerCase() === trimmed.toLowerCase(),
    );
    if (userByName) {
      return userByName.id;
    }

    // Try to extract ID from "username (ID)" format
    const match = trimmed.match(/\((\d+)\)$/);
    if (match) {
      try {
        return BigInt(match[1]);
      } catch {
        // Invalid ID in parentheses
      }
    }

    return null;
  }

  function handleUserChange(
    _event: unknown,
    newValues: (UserOption | string)[],
  ) {
    const parsed: bigint[] = [];

    for (const item of newValues) {
      if (typeof item === "string") {
        const userId = parseUserInput(item);
        if (userId !== null) {
          parsed.push(userId);
        }
      } else {
        parsed.push(item.id);
      }
    }

    onChange(parsed);
  }

  // Get current user options for the Autocomplete value
  const selectedUserOptions = value.map((id) => {
    const existingUser = userMap.get(id.toString());
    if (existingUser) {
      return existingUser;
    }
    // Create a placeholder UserOption for manually added IDs
    return {
      id,
      username: null,
      label: id.toString(),
    };
  });

  const label = `Users to ${filterMode}`;

  return (
    <UserSelectBlock>
      <ToggleFilterModeButton
        onAction={() => {
          onFilterModeChange(filterMode === "include" ? "exclude" : "include");
        }}
        disabled={disabled}
      >
        {filterMode === "include" ?
          <SquarePlus />
        : <SquareMinus />}
      </ToggleFilterModeButton>
      <Autocomplete
        disabled={disabled}
        freeSolo
        fullWidth
        multiple
        onChange={handleUserChange}
        options={availableUsers}
        renderInput={(params) => <TextField {...params} label={label} />}
        renderOption={(props, option) => <li {...props}>{option.label}</li>}
        size="small"
        value={selectedUserOptions}
        getOptionLabel={(option) => {
          if (typeof option === "string") return option;
          return option.label;
        }}
      />
    </UserSelectBlock>
  );
}
