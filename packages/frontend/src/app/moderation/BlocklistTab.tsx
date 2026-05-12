import type { BlocklistEntry } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { PanelSectionHeading } from "@/components/action-panel/primitives";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
  TabPanel,
} from "@/components/action-panel/tabs/ActionPanelTabBody";
import { StyledButton } from "@/components/button/DynamicButton";
import { UserId } from "@/components/complex-search/SearchUserEntry";
import { Input } from "@/components/input/Input";
import VisuallyHidden from "@/components/VisuallyHidden";
import { useBlocklist } from "@/hooks/queries/useBlocklist";
import CheckboxSetting from "../settings/CheckboxSetting";

const BlocklistBodyWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const BlocklistEntryTable = styled("table")`
  border-collapse: collapse;
  margin-top: 1rem;
  width: 100%;

  * > th {
    text-align: left;
    padding-bottom: 0.75rem;
  }
`;

const StyledCheckboxSetting = styled(CheckboxSetting)`
  padding-block: 0.5rem;
  padding-inline: 0.25rem;
`;

const StyledUsername = styled("td")`
  overflow-x: ellipsis;
`;

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

const StyledInput = styled(Input)`
  flex: 1;
  min-width: 0;
`;

const Button = styled(StyledButton)`
  color: white;
  flex-shrink: 0;
  width: auto;
`;

interface BlocklistUserEntryProps extends Pick<
  React.ComponentPropsWithoutRef<typeof CheckboxSetting>,
  "aria-busy" | "checked" | "onChange"
> {
  user: BlocklistEntry;
}

function BlocklistUserEntry({
  user,
  "aria-busy": ariaBusy,
  checked,
  onChange,
}: BlocklistUserEntryProps) {
  const username = user.username || "Unknown User";
  const userId = user.userId;

  return (
    <tr>
      <td>
        <StyledCheckboxSetting
          aria-busy={ariaBusy}
          checked={checked}
          onChange={onChange}
          label={null}
        />
      </td>
      <StyledUsername title={username}>{username}</StyledUsername>
      <td>
        <UserId
          onClick={async () =>
            await navigator.clipboard.writeText(userId.toString())
          }
        >
          <code aria-hidden>{userId}</code>
          <VisuallyHidden>User ID {userId}. Click to copy.</VisuallyHidden>
          <Copy size={12} />
        </UserId>
      </td>
      <td>
        {new Date(user.dateAdded).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </td>
    </tr>
  );
}

const BlocklistTabBlock = styled(TabPanel)`
  grid-template-rows: 1fr auto;
`;

export default function BlocklistTab(
  props: React.ComponentPropsWithoutRef<typeof BlocklistTabBlock>,
) {
  const { data: blocklist = [], isLoading } = useBlocklist();

  const [selectedUsers, setSelectedUsers] = useState<Set<bigint>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const [userIdsToBlock, setUserIdsToBlock] = useState<string>("");

  function setUserSelected(
    event: React.ChangeEvent<HTMLInputElement>,
    userId: bigint,
  ) {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (event.target.checked) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  }

  // Compute filtered and pinned display list
  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedUsers is not included as we don't want the list to re-order when selection changes
  const displayList = useMemo(() => {
    if (!searchQuery) {
      // No filter: selected first, then unselected (by original order)
      const selected = blocklist.filter((u) => selectedUsers.has(u.userId));
      const unselected = blocklist.filter((u) => !selectedUsers.has(u.userId));
      return [...selected, ...unselected];
    }

    // Filter by search query
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = blocklist.filter((entry) => {
      const matchesUsername =
        entry.username?.toLowerCase().includes(lowerQuery) ?? false;
      const matchesId = entry.userId.toString() === searchQuery;
      return matchesUsername || matchesId;
    });

    // Partition: selected first (from filtered), then unselected (from filtered)
    const selected = blocklist.filter((u) => selectedUsers.has(u.userId));
    const unselected = filtered.filter((u) => !selectedUsers.has(u.userId));
    return [...selected, ...unselected];
  }, [blocklist, searchQuery]);

  const isSelectDisabled = userIdsToBlock.trim() !== "";

  return (
    <BlocklistTabBlock {...props}>
      <FullWidthScrollView>
        <ActionPanelTabBody>
          <BlocklistBodyWrapper>
            <PanelSectionHeading>Blocklist</PanelSectionHeading>

            <StyledInput
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
              }}
            />

            {isLoading ?
              <p>Loading...</p>
            : blocklist.length === 0 ?
              <p>The blocklist is currently empty.</p>
            : displayList.length === 0 ?
              <p>No users match your search.</p>
            : <BlocklistEntryTable>
                <thead>
                  <tr>
                    <th></th>
                    <th>Username</th>
                    <th>ID</th>
                    <th>Date Added</th>
                  </tr>
                </thead>
                {displayList.map((user) => (
                  <BlocklistUserEntry
                    key={user.userId}
                    user={user}
                    checked={selectedUsers.has(user.userId)}
                    onChange={(event) => setUserSelected(event, user.userId)}
                    aria-busy={isSelectDisabled}
                  />
                ))}
              </BlocklistEntryTable>
            }
          </BlocklistBodyWrapper>
        </ActionPanelTabBody>
      </FullWidthScrollView>
      <ActionPanelTabBody>
        <BlocklistFooter>
          {selectedUsers.size === 0 ?
            <BlocklistAddWrapper>
              <StyledInput
                onChange={(e) => setUserIdsToBlock(e.target.value)}
                placeholder="User IDs to block"
                type="text"
                value={userIdsToBlock}
              />
              <Button>Block</Button>
            </BlocklistAddWrapper>
          : <Button disabled={selectedUsers.size === 0}>
              Remove {selectedUsers.size} user
              {selectedUsers.size !== 1 ? "s" : ""} from blocklist
            </Button>
          }
        </BlocklistFooter>
      </ActionPanelTabBody>
    </BlocklistTabBlock>
  );
}
