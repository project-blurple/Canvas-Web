"use client";

import { styled } from "@mui/material";
import { TabPanel } from "@/components/action-panel/tabs/ActionPanelTabBody";

const AdminCanvasTabBlock = styled(TabPanel)`
  grid-template-rows: auto 1fr;
`;

const CanvasInfoWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  align-items: center;
`;

interface AdminCanvasTabProps extends React.ComponentPropsWithRef<
  typeof AdminCanvasTabBlock
> {
  active: boolean;
}

export default function AdminCanvasTab({
  active,
  ...props
}: AdminCanvasTabProps) {
  return (
    <AdminCanvasTabBlock active={active} {...props}>
      <CanvasInfoWrapper>WIP</CanvasInfoWrapper>
    </AdminCanvasTabBlock>
  );
}
