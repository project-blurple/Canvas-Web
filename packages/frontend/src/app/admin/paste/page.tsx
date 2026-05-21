"use client";

import { styled } from "@mui/material";
import { CanvasWrapper } from "@/app/Main";
import ActionPanelPrimitives from "@/components/action-panel/primitives";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
} from "@/components/action-panel/tabs/ActionPanelTabBody";
import { CanvasView } from "@/components/canvas";
import { SlideableDrawer } from "@/components/slideable-drawer";
import AdminDashboard from "../AdminDashboard";

const AdminPasteTabBlock = styled("section")`
  display: block;
  width: 100%;
`;

const PasteWrapper = styled(CanvasWrapper)`
  body:has(&) {
    --action-panel-width: 40rem;

    ${({ theme }) => theme.breakpoints.up("lg")} {
      --action-panel-width: 50rem;
    }
  }
`;

function AdminDashboardPasteActionPanel() {
  return (
    <ActionPanelPrimitives.Root>
      <FullWidthScrollView>
        <ActionPanelTabBody>hi</ActionPanelTabBody>
      </FullWidthScrollView>
    </ActionPanelPrimitives.Root>
  );
}

function AdminPasteTab() {
  return (
    <AdminPasteTabBlock>
      <PasteWrapper>
        <CanvasView
          actionPanel={<AdminDashboardPasteActionPanel />}
          canvasLabel="Admin paste"
          showInvite={false}
          showNotices={false}
          showReticle={false}
        />
        <SlideableDrawer>
          <AdminDashboardPasteActionPanel />
        </SlideableDrawer>
      </PasteWrapper>
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
