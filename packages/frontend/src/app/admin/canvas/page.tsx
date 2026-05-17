"use client";

import { Switch, styled } from "@mui/material";
import { RulerDimensionLine, X } from "lucide-react";
import CanvasIcon from "@/components/CanvasIcon";
import { CanvasPreviewCard } from "@/components/canvas/CanvasPreviewCard";
import { useCanvasContext } from "@/contexts";
import { useCanvasList, useEventInfo } from "@/hooks";
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

const CanvasList = styled("div")`
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-wrap: nowrap;
  gap: 0.75rem;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 0.5rem;
  width: 100%;

  & > button {
    flex: 0 0 10rem;
    width: 10rem;
  }
`;

const CanvasContents = styled("div")`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 40rem;
  width: 100%;
`;

const CanvasHeader = styled("h1")`
  align-items: center;
  display: flex;
  flex-direction: column;
  font-size: 1.5rem;
  font-weight: 600;
  gap: 0.25rem;

  span {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const CanvasId = styled("code")`
  opacity: 0.75;
  font-size: 0.875rem;
`;

const CanvasDimensions = styled("code")`
  align-items: center;
  display: flex;
  flex-direction: row;
  gap: 0.25rem;
`;

function AdminCanvasTab() {
  const { data: canvases = [], isLoading: canvasListIsLoading } =
    useCanvasList();
  const { canvas: activeCanvas, setCanvas } = useCanvasContext();
  const { data: event, isLoading: eventIsLoading } = useEventInfo();

  const isLoading = canvasListIsLoading || eventIsLoading;

  return (
    <AdminCanvasTabBlock>
      <CanvasInfoWrapper>
        {isLoading ?
          <div>Loading...</div>
        : canvases.length === 0 ?
          <div>No canvases found.</div>
        : <>
            <CanvasList>
              {canvases.map((canvasItem) => (
                <CanvasPreviewCard
                  canvas={canvasItem}
                  currentEventId={event?.id}
                  key={canvasItem.id}
                  onClick={() => setCanvas(canvasItem.id, false)}
                  aria-current={activeCanvas?.id === canvasItem.id}
                />
              ))}
            </CanvasList>
            <CanvasContents>
              <CanvasHeader>
                <span>
                  <CanvasIcon size={20} />
                  {activeCanvas.name}
                </span>
                <CanvasId>ID: {activeCanvas.id}</CanvasId>
              </CanvasHeader>
              {/* View: width and height */}
              <CanvasDimensions>
                {activeCanvas.width}
                <X size={12} />
                {activeCanvas.height}
              </CanvasDimensions>
              <table>
                <tbody>
                  <tr>
                    <td>
                      <Switch type="checkbox" checked={activeCanvas.isLocked} />
                    </td>
                    <td>Locked</td>
                  </tr>
                  <tr>
                    <td>
                      <Switch
                        type="checkbox"
                        checked={activeCanvas.allColorsGlobal}
                        disabled // currently controlled by env rather than db
                      />
                    </td>
                    <td>All colors global</td>
                  </tr>
                </tbody>
              </table>
            </CanvasContents>
          </>
        }
      </CanvasInfoWrapper>
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
