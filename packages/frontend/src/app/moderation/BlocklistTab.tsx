import { styled } from "@mui/material";
import { PanelSectionHeading } from "@/components/action-panel/primitives";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
  TabPanel,
} from "@/components/action-panel/tabs/ActionPanelTabBody";
import { useBlocklist } from "@/hooks/queries/useBlocklist";

const BlocklistTabBlock = styled(TabPanel)`
  grid-template-rows: 1fr auto;
`;

export default function BlocklistTab(
  props: React.ComponentPropsWithoutRef<typeof BlocklistTabBlock>,
) {
  const { data: blocklist = [], isLoading } = useBlocklist();

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
            : <ul>
                {blocklist.map((entry) => (
                  <li key={entry.userId}>
                    <p>
                      <strong>{entry.username || "Unknown User"}</strong>
                    </p>
                    <p>
                      Added on: {new Date(entry.dateAdded).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            }
          </div>
        </ActionPanelTabBody>
      </FullWidthScrollView>
    </BlocklistTabBlock>
  );
}
