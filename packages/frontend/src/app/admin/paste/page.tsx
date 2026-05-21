"use client";

import { styled } from "@mui/material";
import { X } from "lucide-react";
import NextImage from "next/image";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { CanvasWrapper } from "@/app/Main";
import ActionPanelPrimitives from "@/components/action-panel/primitives";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
} from "@/components/action-panel/tabs/ActionPanelTabBody";
import { Button } from "@/components/button";
import { CanvasView } from "@/components/canvas";
import { SlideableDrawer } from "@/components/slideable-drawer";
import { useCanvasContext } from "@/contexts";
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

const UploadedImageWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StyledImage = styled(NextImage)`
  max-width: 100%;
  height: auto;
  margin-inline: auto;
`;

const InfoWrapper = styled("div")`
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  justify-items: center;
`;

const Info = styled("div")`
  align-items: center;
  background-color: var(--discord-legacy-not-quite-black);
  border-radius: 0.5rem;
  border: var(--card-border);
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  justify-content: center;
  padding: 0.25rem 0.5rem;
  width: 100%;
`;

type UploadedImage = {
  file: File;
  src: string;
  width: number;
  height: number;
};

function getImageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = src;
  });
}

interface AdminDashboardPasteActionPanelProps {
  canvas: ReturnType<typeof useCanvasContext>["canvas"];
  uploadedImage: UploadedImage | null;
  uploadError: string | null;
  setUploadedImage: (image: UploadedImage | null) => void;
  setUploadError: (error: string | null) => void;
}

function AdminDashboardPasteActionPanel({
  canvas,
  uploadedImage,
  uploadError,
  setUploadedImage,
  setUploadError,
}: AdminDashboardPasteActionPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onUploadClick() {
    fileInputRef.current?.click();
  }

  async function onUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setUploadedImage(null);
      setUploadError("Please choose an image file.");
      return;
    }

    const src = URL.createObjectURL(file);

    try {
      const { width, height } = await getImageDimensions(src);

      if (width > canvas.width || height > canvas.height) {
        URL.revokeObjectURL(src);
        setUploadedImage(null);
        setUploadError(
          `Image must fit within the canvas size of ${canvas.width}x${canvas.height}.`,
        );
        return;
      }

      setUploadedImage({
        file,
        src,
        width,
        height,
      });
      setUploadError(null);
    } catch {
      URL.revokeObjectURL(src);
      setUploadedImage(null);
      setUploadError("Could not read the selected image.");
    }
  }

  return (
    <ActionPanelPrimitives.Root>
      <FullWidthScrollView>
        <ActionPanelTabBody>
          <div>
            <ActionPanelPrimitives.SectionHeading>
              Upload image to paste
            </ActionPanelPrimitives.SectionHeading>
            <FullWidthStyledButton onClick={onUploadClick}>
              Upload
            </FullWidthStyledButton>
            <input
              ref={fileInputRef}
              hidden
              type="file"
              accept="image/*"
              onChange={onUploadChange}
            />
            {uploadError && <p role="alert">{uploadError}</p>}
          </div>
          {uploadedImage && (
            <UploadedImageWrapper>
              <ActionPanelPrimitives.SectionHeading>
                Uploaded image
              </ActionPanelPrimitives.SectionHeading>
              <StyledImage
                src={uploadedImage.src}
                alt={`Uploaded file: ${uploadedImage.file.name}`}
                width={uploadedImage.width}
                height={uploadedImage.height}
              />
              <InfoWrapper>
                <Info>
                  <code>{uploadedImage.file.name}</code>
                </Info>
                <Info>
                  <code>{uploadedImage.width}</code>
                  <X size={16} />
                  <code>{uploadedImage.height}</code>
                </Info>
              </InfoWrapper>
            </UploadedImageWrapper>
          )}
        </ActionPanelTabBody>
      </FullWidthScrollView>
    </ActionPanelPrimitives.Root>
  );
}

function AdminPasteTab() {
  const { canvas } = useCanvasContext();
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (uploadedImage) {
        URL.revokeObjectURL(uploadedImage.src);
      }
    },
    [uploadedImage],
  );

  const actionPanel = (
    <AdminDashboardPasteActionPanel
      canvas={canvas}
      uploadedImage={uploadedImage}
      uploadError={uploadError}
      setUploadedImage={setUploadedImage}
      setUploadError={setUploadError}
    />
  );

  return (
    <AdminPasteTabBlock>
      <PasteWrapper>
        <CanvasView
          actionPanel={actionPanel}
          canvasLabel="Admin paste"
          showInvite={false}
          showNotices={false}
          showReticle={false}
        />
        <SlideableDrawer>{actionPanel}</SlideableDrawer>
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
