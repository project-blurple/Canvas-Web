import type { BlocklistEntry } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { Copy } from "lucide-react";
import { useState } from "react";
import { PanelSectionHeading } from "@/components/action-panel/primitives";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
  TabPanel,
} from "@/components/action-panel/tabs/ActionPanelTabBody";
import { UserId } from "@/components/complex-search/SearchUserEntry";
import VisuallyHidden from "@/components/VisuallyHidden";
import { useBlocklist } from "@/hooks/queries/useBlocklist";
import CheckboxSetting from "../settings/CheckboxSetting";

const BlocklistEntryTable = styled("table")`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;

  * > th {
    text-align: left;
    padding-bottom: 0.75rem;
  }
`;

const StyledCheckboxSetting = styled(CheckboxSetting)`
  padding-block: 0.5rem;
  padding-inline: 0.25rem;
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
      <td>{username}</td>
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

  return (
    <BlocklistTabBlock {...props}>
      <FullWidthScrollView>
        <ActionPanelTabBody>
          <div>
            <PanelSectionHeading>Blocklist</PanelSectionHeading>

            {isLoading ?
              <p>Loading...</p>
            : blocklist.length === 0 ?
              <p>The blocklist is currently empty.</p>
            : <BlocklistEntryTable>
                <thead>
                  <tr>
                    <th></th>
                    <th>Username</th>
                    <th>ID</th>
                    <th>Date Added</th>
                  </tr>
                </thead>
                {blocklist.map((user) => (
                  <BlocklistUserEntry
                    key={user.userId}
                    user={user}
                    checked={selectedUsers.has(user.userId)}
                    onChange={(event) => setUserSelected(event, user.userId)}
                  />
                ))}
              </BlocklistEntryTable>
            }
          </div>
        </ActionPanelTabBody>
      </FullWidthScrollView>
    </BlocklistTabBlock>
  );
}
