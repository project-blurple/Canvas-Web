"use client";

import { styled } from "@mui/material";
import AdminDashboard from "../AdminDashboard";

const AdminCanvasTabBlock = styled("section")`
  display: block;
  max-width: 80rem;
  width: 100%;
`;

const CanvasInfoWrapper = styled("div")`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
`;

function AdminCanvasTab() {
  return (
    <AdminCanvasTabBlock>
      <CanvasInfoWrapper>WIP</CanvasInfoWrapper>
    </AdminCanvasTabBlock>
  );
}

export default function CanvasAdminPage() {
  return (
    <AdminDashboard>
      <AdminCanvasTab />
    </AdminDashboard>
  );
}
