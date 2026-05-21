"use client";

import { styled } from "@mui/material";
import { CanvasWrapper } from "@/app/Main";
import ActionPanelPrimitives from "@/components/action-panel/primitives";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
} from "@/components/action-panel/tabs/ActionPanelTabBody";
import { Button } from "@/components/button";
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

const StyledButton = styled(Button)`
  background-color: var(--discord-blurple);
  color: var(--discord-white);
`;

const FullWidthStyledButton = styled(StyledButton)`
  width: 100%;
`;

function AdminDashboardPasteActionPanel() {
  return (
    <ActionPanelPrimitives.Root>
      <FullWidthScrollView>
        <ActionPanelTabBody>
          <div>
            <ActionPanelPrimitives.SectionHeading>
              Upload image to paste
            </ActionPanelPrimitives.SectionHeading>
            <span>Image must be 1:1 size</span>
            <FullWidthStyledButton>Upload</FullWidthStyledButton>
          </div>
        </ActionPanelTabBody>
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
