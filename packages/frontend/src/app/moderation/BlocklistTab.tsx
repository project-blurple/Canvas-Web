import { styled } from "@mui/material";
import { Heading } from "lucide-react";
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
  const { data: blocklist } = useBlocklist();

  return (
    <BlocklistTabBlock {...props}>
      <FullWidthScrollView>
        <ActionPanelTabBody>
          <div>
            <Heading>Blocklist</Heading>
          </div>
        </ActionPanelTabBody>
      </FullWidthScrollView>
    </BlocklistTabBlock>
  );
}
