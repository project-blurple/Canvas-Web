"use client";

import { styled } from "@mui/material";
import AdminDashboard from "../AdminDashboard";

const AdminPasteTabBlock = styled("section")`
  display: block;
  max-width: 80rem;
  width: 100%;
`;

const PasteWrapper = styled("div")`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
`;

function AdminPasteTab() {
  return (
    <AdminPasteTabBlock>
      <PasteWrapper>WIP</PasteWrapper>
    </AdminPasteTabBlock>
  );
}

export default function PasteAdminPage() {
  return (
    <AdminDashboard>
      <AdminPasteTab />
    </AdminDashboard>
  );
}
