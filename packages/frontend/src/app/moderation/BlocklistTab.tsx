import type { BlocklistEntry } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { Copy } from "lucide-react";
import { useId, useMemo, useState } from "react";
import ActionPanelPrimitives from "@/components/action-panel/primitives";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
  TabPanel,
} from "@/components/action-panel/tabs/ActionPanelTabBody";
import { UserIdButton } from "@/components/complex-search/SearchUserEntry";
import { Input } from "@/components/input/Input";
import VisuallyHidden from "@/components/VisuallyHidden";
import { useCanvasContext } from "@/contexts";
import { useBlocklist, useBlocklistMutations } from "@/hooks/queries";
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
  max-inline-size: 100%;
  width: 100%;
`;

const StyledCheckboxInput = styled("input")`
  block-size: 1rem;
  cursor: pointer;
  inline-size: 1rem;
  margin-inline: 0.75rem;
`;

const SelectionForm = styled("form")`
  display: contents;
`;

const StyledEntryRow = styled("tr")<{ $hidden?: boolean }>`
  @media (hover: hover) {
    &:hover {
      background-color: oklch(from var(--discord-white) l c h / 5%);
    }
  }

  ${(props) => (props.$hidden ? "display: none;" : "")}
`;

const CheckboxCell = styled("td")`
  white-space: nowrap;
  width: 1%;
`;

const UserCell = styled("td")`
  min-inline-size: 0;
`;

const DateCell = styled("td")`
  // Mobile responsiveness is still broken here, the date is overflowing width
  white-space: nowrap;
  width: 1%;
`;

const UserContents = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-block: 0.25rem;

  code {
    overflow-wrap: anywhere;
    word-break: break-word;
    max-inline-size: 100%;
  }

  button {
    min-inline-size: 0;
    width: auto;
    max-inline-size: 100%;
  }
`;

const StyledUsername = styled("span")`
  min-inline-size: 0;
  overflow-wrap: break-word;
`;

const StyledInput = styled(Input)`
  flex: 1;
  min-inline-size: 0;
`;

interface BlocklistUserEntryProps {
  user: BlocklistEntry;
  defaultChecked?: boolean;
  $hidden?: boolean;
}

function BlocklistUserEntry({
  user,
  defaultChecked,
  $hidden,
}: BlocklistUserEntryProps) {
  const username = user.username || "Unknown User";
  const userId = user.userId;
  const date = new Date(user.dateAdded);

  return (
    <StyledEntryRow $hidden={$hidden}>
      <CheckboxCell>
        <StyledCheckboxInput
          name="selectedUsers"
          type="checkbox"
          value={userId.toString()}
          defaultChecked={defaultChecked}
        />
      </CheckboxCell>
      <UserCell>
        <UserContents title={username}>
          <StyledUsername>{username}</StyledUsername>
          <UserIdButton
            type="button"
            onClick={async () =>
              await navigator.clipboard.writeText(userId.toString())
            }
          >
            <code aria-hidden>{userId}</code>
            <VisuallyHidden>User ID {userId}. Click to copy.</VisuallyHidden>
            <Copy size={12} />
          </UserIdButton>
        </UserContents>
      </UserCell>
      <DateCell>
        <time dateTime={date.toISOString()}>
          {date.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </time>
      </DateCell>
    </StyledEntryRow>
  );
}

const BlocklistTabBlock = styled(TabPanel)`
  grid-template-rows: 1fr auto;
`;

export default function BlocklistTab(
  props: React.ComponentPropsWithoutRef<typeof BlocklistTabBlock>,
) {
  const { canvas } = useCanvasContext();
  const { data: blocklist = [], isLoading } = useBlocklist();
  const { handleAdd, handleRemove } = useBlocklistMutations();

  const [selectedUsers, setSelectedUsers] = useState<Set<bigint>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [userIdsToBlock, setUserIdsToBlock] = useState<bigint[]>([]);
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const [shouldRestoreHistory, setShouldRestoreHistory] = useState(false);
  const selectionFormId = useId();

  const existingBlocklistIdStrings = useMemo(
    () => new Set(blocklist.map((entry) => entry.userId.toString())),
    [blocklist],
  );

  function readSelectedUsers(form: HTMLFormElement | null) {
    if (!form) {
      return new Set<bigint>();
    }

    const selectedUserIds = new Set<bigint>();
    for (const value of new FormData(form).getAll("selectedUsers")) {
      if (typeof value !== "string" || !/^\d+$/.test(value)) {
        continue;
      }

      selectedUserIds.add(BigInt(value));
    }

    return selectedUserIds;
  }

  function handleSelectionSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const userIds = readSelectedUsers(form);
    if (userIds.size === 0) return;

    const shouldRestoreHistoryForCanvasId =
      shouldRestoreHistory ? [canvas.id] : [];

    handleRemove(userIds, shouldRestoreHistoryForCanvasId).then((success) => {
      if (success) {
        setSelectedUsers(new Set());
        setSelectionResetKey((value) => value + 1);
        setShouldRestoreHistory(false);
      }
    });
  }

  function handleSelectionChange(event: React.ChangeEvent<HTMLFormElement>) {
    setSelectedUsers(readSelectedUsers(event.currentTarget));
  }

  async function handleBlockWithReset(ids: Iterable<bigint>) {
    const success = await handleAdd(ids);
    if (success) {
      setUserIdsToBlock([]);
    }

    return success;
  }

  const displayList = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = blocklist.filter((entry) => {
      const matchesUsername =
        entry.username?.toLowerCase().includes(lowerQuery) ?? false;
      const matchesId = entry.userId.toString() === searchQuery;
      return matchesUsername || matchesId;
    });

    // Selected are raised to the top, shows all selected even if they don't match the filter
    const selected = blocklist.filter((u) =>
      selectedUsers.has(BigInt(u.userId)),
    );
    const unselected = filtered.filter(
      (u) => !selectedUsers.has(BigInt(u.userId)),
    );
    return [...selected, ...unselected];
  }, [blocklist, searchQuery, selectedUsers]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedUsers is not included as we don't want the list to re-order when selection changes
  const sortedBlocklist = useMemo(() => {
    return blocklist.toSorted((u) =>
      selectedUsers.has(BigInt(u.userId)) ? -1 : 1,
    );
  }, [blocklist, searchQuery]);

  return (
    <BlocklistTabBlock {...props}>
      <FullWidthScrollView>
        <ActionPanelTabBody>
          <BlocklistBodyWrapper aria-busy={isLoading}>
            <ActionPanelPrimitives.SectionHeading>
              Blocklist
            </ActionPanelPrimitives.SectionHeading>

            <StyledInput
              disabled={isLoading || blocklist.length === 0}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users…"
              type="text"
              value={searchQuery}
              style={{
                inlineSize: "100%",
              }}
            />

            {isLoading ?
              <p>Loading…</p>
            : blocklist.length === 0 ?
              <p>The blocklist is currently empty</p>
            : displayList.length === 0 ?
              <p>No users match your search.</p>
            : <SelectionForm
                key={selectionResetKey}
                id={selectionFormId}
                onChange={handleSelectionChange}
                onSubmit={handleSelectionSubmit}
              >
                <BlocklistEntryTable>
                  <thead>
                    <tr>
                      <th aria-label="Checkbox" />
                      <th>User</th>
                      <th>Date added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBlocklist.map((user) => {
                      const isVisible = displayList.some(
                        (u) => u.userId === user.userId,
                      );
                      return (
                        <BlocklistUserEntry
                          key={user.userId}
                          user={user}
                          defaultChecked={selectedUsers.has(
                            BigInt(user.userId),
                          )}
                          $hidden={!isVisible}
                        />
                      );
                    })}
                  </tbody>
                </BlocklistEntryTable>
              </SelectionForm>
            }
          </BlocklistBodyWrapper>
        </ActionPanelTabBody>
      </FullWidthScrollView>
      <ActionPanelTabBody>
        <BlocklistFooterSection
          selectedUsers={selectedUsers}
          userIdsToBlock={userIdsToBlock}
          onUserIdsToBlockChange={(value) => setUserIdsToBlock([...value])}
          existingBlocklistIdStrings={existingBlocklistIdStrings}
          onBlock={handleBlockWithReset}
          selectionFormId={selectionFormId}
          shouldRestoreHistory={shouldRestoreHistory}
          onShouldRestoreHistoryChange={setShouldRestoreHistory}
        />
      </ActionPanelTabBody>
    </BlocklistTabBlock>
  );
}
