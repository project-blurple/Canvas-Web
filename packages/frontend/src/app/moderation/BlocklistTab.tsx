import type { BlocklistEntry } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { Copy } from "lucide-react";
import { useMemo, useState } from "react";
import ActionPanelPrimitives from "@/components/action-panel/primitives";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
  TabPanel,
} from "@/components/action-panel/tabs/ActionPanelTabBody";
import { UserId } from "@/components/complex-search/SearchUserEntry";
import { Input } from "@/components/input/Input";
import VisuallyHidden from "@/components/VisuallyHidden";
import { useBlocklist } from "@/hooks/queries/useBlocklist";
import CheckboxSetting from "../settings/CheckboxSetting";
import { BlocklistFooterSection } from "./BlocklistTabFooter";

const BlocklistBodyWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const BlocklistEntryTable = styled("table")`
  border-collapse: separate;
  border-spacing: 0 0.5rem;
  margin-top: 1rem;
  width: 100%;

  * > th {
    text-align: left;
  }
`;

const StyledCheckboxSetting = styled(CheckboxSetting)`
  padding-block: 0.5rem;
  padding-inline: 0.25rem;
`;

const StyledEntryRow = styled("tr")`
  :hover {
    background-color: oklch(from var(--discord-white) l c h / 10%);
  }
`;

const StyledUserRow = styled("td")`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-block: 0.25rem;
`;

const StyledUsername = styled("span")`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledInput = styled(Input)`
  flex: 1;
  min-width: 0;
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
    <StyledEntryRow>
      <td>
        <StyledCheckboxSetting
          aria-busy={ariaBusy}
          checked={checked}
          onChange={onChange}
          label={null}
        />
      </td>
      <StyledUserRow title={username}>
        <StyledUsername>{username}</StyledUsername>
        <UserId
          onClick={async () =>
            await navigator.clipboard.writeText(userId.toString())
          }
        >
          <code aria-hidden>{userId}</code>
          <VisuallyHidden>User ID {userId}. Click to copy.</VisuallyHidden>
          <Copy size={12} />
        </UserId>
      </StyledUserRow>
      <td>
        {new Date(user.dateAdded).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </td>
    </StyledEntryRow>
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

  const [userIdsToBlock, setUserIdsToBlock] = useState<bigint[]>([]);

  const existingBlocklistIdStrings = useMemo(
    () => new Set(blocklist.map((entry) => entry.userId.toString())),
    [blocklist],
  );

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedUsers is not included as we don't want the list to re-order when selection changes
  const displayList = useMemo(() => {
    if (!searchQuery) {
      // No filter: selected are raised to the top
      const selected = blocklist.filter((u) => selectedUsers.has(u.userId));
      const unselected = blocklist.filter((u) => !selectedUsers.has(u.userId));
      return [...selected, ...unselected];
    }

    const lowerQuery = searchQuery.toLowerCase();
    const filtered = blocklist.filter((entry) => {
      const matchesUsername =
        entry.username?.toLowerCase().includes(lowerQuery) ?? false;
      const matchesId = entry.userId.toString() === searchQuery;
      return matchesUsername || matchesId;
    });

    // Selected are raised to the top, shows all selected even if they don't match the filter
    const selected = blocklist.filter((u) => selectedUsers.has(u.userId));
    const unselected = filtered.filter((u) => !selectedUsers.has(u.userId));
    return [...selected, ...unselected];
  }, [blocklist, searchQuery]);

  const isSelectDisabled = userIdsToBlock.length > 0;

  return (
    <BlocklistTabBlock {...props}>
      <FullWidthScrollView>
        <ActionPanelTabBody>
          <BlocklistBodyWrapper>
            <ActionPanelPrimitives.SectionHeading>
              Blocklist
            </ActionPanelPrimitives.SectionHeading>

            <StyledInput
              disabled={isLoading || blocklist.length === 0}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              type="text"
              value={searchQuery}
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
                    <th /> {/* Checkbox column */}
                    <th>User</th>
                    <th>Date Added</th>
                  </tr>
                </thead>
                <tbody>
                  {displayList.map((user) => (
                    <BlocklistUserEntry
                      key={user.userId}
                      user={user}
                      checked={selectedUsers.has(user.userId)}
                      onChange={(event) => setUserSelected(event, user.userId)}
                      aria-busy={isSelectDisabled}
                    />
                  ))}
                </tbody>
              </BlocklistEntryTable>
            }
          </BlocklistBodyWrapper>
        </ActionPanelTabBody>
      </FullWidthScrollView>
      <ActionPanelTabBody>
        <BlocklistFooterSection
          selectedUsers={selectedUsers}
          userIdsToBlock={userIdsToBlock}
          onUserIdsToBlockChange={setUserIdsToBlock}
          existingBlocklistIdStrings={existingBlocklistIdStrings}
        />
      </ActionPanelTabBody>
    </BlocklistTabBlock>
  );
}
