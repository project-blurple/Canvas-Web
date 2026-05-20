"use client";

import { styled } from "@mui/material";
import AdminDashboard from "../AdminDashboard";

const AdminNoticeTabBlock = styled("section")`
  display: block;
  max-width: 80rem;
  width: 100%;
`;

const NoticeWrapper = styled("div")`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
`;

function AdminNoticeTab() {
  return (
    <AdminNoticeTabBlock>
      <NoticeWrapper>WIP</NoticeWrapper>
    </AdminNoticeTabBlock>
  );
}

export default function NoticeAdminPage() {
  return (
    <AdminDashboard>
      <AdminNoticeTab />
    </AdminDashboard>
  );
}
