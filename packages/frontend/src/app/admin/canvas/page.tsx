"use client";

import { styled } from "@mui/material";
import AdminDashboard from "../AdminDashboard";

const CanvasInfoWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  align-items: center;
`;

export default function AdminCanvasPage() {
  return (
    <AdminDashboard>
      <CanvasInfoWrapper>WIP</CanvasInfoWrapper>
    </AdminDashboard>
  );
}
