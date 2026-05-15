"use client";

import { styled } from "@mui/material";
import { TabPanel } from "@/components/action-panel/tabs/ActionPanelTabBody";

const AdminPasteTabBlock = styled(TabPanel)`
  grid-template-rows: auto 1fr;
`;

const PasteWrapper = styled("div")`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
`;

interface AdminPasteTabProps extends React.ComponentPropsWithRef<
  typeof AdminPasteTabBlock
> {
  active: boolean;
}

export default function AdminPasteTab({
  active,
  ...props
}: AdminPasteTabProps) {
  return (
    <AdminPasteTabBlock active={active} {...props}>
      <PasteWrapper>WIP</PasteWrapper>
    </AdminPasteTabBlock>
  );
}
