"use client";

import { styled } from "@mui/material";
import { TabPanel } from "@/components/action-panel/tabs/ActionPanelTabBody";

const AdminNoticeTabBlock = styled(TabPanel)`
  grid-template-rows: auto 1fr;
`;

const NoticeWrapper = styled("div")`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
`;

interface AdminNoticeTabProps extends React.ComponentPropsWithRef<
  typeof AdminNoticeTabBlock
> {
  active: boolean;
}

export default function AdminNoticeTab({
  active,
  ...props
}: AdminNoticeTabProps) {
  return (
    <AdminNoticeTabBlock active={active} {...props}>
      <NoticeWrapper>WIP</NoticeWrapper>
    </AdminNoticeTabBlock>
  );
}
