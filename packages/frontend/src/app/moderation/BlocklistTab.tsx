import { styled } from "@mui/material";
import { Heading } from "@/components/action-panel/ActionPanel";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
  TabPanel,
} from "@/components/action-panel/tabs/ActionPanelTabBody";
import { useBlocklist } from "@/hooks/queries/useBlocklist";

const BlocklistTabBlock = styled(TabPanel)`
  grid-template-rows: 1fr auto;
`;

interface BlocklistTabProps extends React.ComponentPropsWithoutRef<
  typeof BlocklistTabBlock
> {}

export default function BlocklistTab({ ...props }: BlocklistTabProps) {
  const { data: blocklist = [], isLoading } = useBlocklist();

  return (
    <BlocklistTabBlock {...props}>
      <FullWidthScrollView>
        <ActionPanelTabBody>
          <div>
            <Heading>Blocklist</Heading>

            {isLoading ?
              <p>Loading...</p>
            : blocklist.length === 0 ?
              <p>The blocklist is currently empty.</p>
            : <ul>
                {blocklist.map((entry) => (
                  <li key={entry.id}>
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
