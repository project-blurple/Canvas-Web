import { styled } from "@mui/material";
import { TabPanel } from "@/components/action-panel/tabs/ActionPanelTabBody";

const BlocklistTabBlock = styled(TabPanel)`
  grid-template-rows: 1fr auto;
`;

export default function BlocklistTab(
  props: React.ComponentPropsWithoutRef<typeof BlocklistTabBlock>,
) {
  return <BlocklistTabBlock {...props}>Blocklist</BlocklistTabBlock>;
}
