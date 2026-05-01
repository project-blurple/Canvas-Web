import styled from "@emotion/styled";
import { ActionPanel } from "@/components/action-panel";
import { CanvasView } from "@/components/canvas";
import { SlideableDrawer } from "@/components/slideable-drawer";
import { CanvasWrapper } from "../Main";

const DashboardWrapper = styled(CanvasWrapper)`
  body:has(&) {
    --action-panel-width: 40rem;

    ${({ theme }) => theme.breakpoints.up("lg")} {
      --action-panel-width: 50rem;
    }
  }
`;

export default function ModerationDashboard() {
  return (
    <DashboardWrapper>
      <CanvasView showInvite={false} showReticle={false} />
      <SlideableDrawer>
        <ActionPanel />
      </SlideableDrawer>
    </DashboardWrapper>
  );
}
