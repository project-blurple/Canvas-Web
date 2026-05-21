"use client";

import type { Point } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { CircleAlert, X } from "lucide-react";
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
import NumberField from "@/components/NumberField";
import { SlideableDrawer } from "@/components/slideable-drawer";
import { useCanvasContext } from "@/contexts";
import { usePalette } from "@/hooks";
import { useCanvasPaste } from "@/hooks/queries/usePaste";
import AdminDashboard from "../AdminDashboard";
import {
  getImageDimensions,
  imageFileToData,
  type MappedImageDataEntry,
  mapImageDataToPaletteIndices,
  type UploadedImage,
} from "./ImageTools";

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

const ErrorText = styled("span")`
  align-items: center;
  background-color: oklch(from var(--discord-red) l c h / 75%);
  border-radius: 0.5rem;
  color: var(--discord-white);
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  padding: 0.5rem;
  width: 100%;
`;

const ContentWrapper = styled("div")`
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

const CoordsWrapper = styled("div")`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const StyledNumberField = styled(NumberField)`
  input {
    background-color: var(--discord-legacy-not-quite-black);
    border: var(--card-border);
  }
`;

const InputWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const InputLabel = styled("label")`
  opacity: 0.75;
  font-size: 0.875rem;
`;

const AuthorIdInput = styled("input")`
  background-color: var(--discord-legacy-not-quite-black);
  border-radius: 0.5rem;
  border: var(--card-border);
  color: var(--discord-white);
  padding: 0.5rem;
  width: 100%;

  &:invalid {
    border-color: var(--discord-red);
  }
`;

interface AdminDashboardPasteActionPanelProps {
  uploadedImage: UploadedImage | null;
  uploadError: string | null;
  topLeftCoordinates: Point;
  setUploadedImage: (image: UploadedImage | null) => void;
  setUploadError: (error: string | null) => void;
  setTopLeftCoordinates: (coordinates: Point) => void;
}

function AdminDashboardPasteActionPanel({
  uploadedImage,
  uploadError,
  topLeftCoordinates,
  setUploadedImage,
  setUploadError,
  setTopLeftCoordinates,
}: AdminDashboardPasteActionPanelProps) {
  const { canvas } = useCanvasContext();
  const { data: palette, isLoading: paletteIsLoading } = usePalette();

  const doCanvasPaste = useCanvasPaste();

  const [areColorsValid, setAreColorsValid] = useState(true);
  const [mappedData, setMappedData] = useState<MappedImageDataEntry[] | null>(
    null,
  );
  const [authorId, setAuthorId] = useState("");

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

      const imageData = await imageFileToData(file);

      setUploadedImage({
        file,
        src,
        width,
        height,
        data: imageData,
      });
      setUploadError(null);
    } catch {
      URL.revokeObjectURL(src);
      setUploadedImage(null);
      setUploadError("Could not read the selected image.");
    }
  }

  const entryCount = uploadedImage?.data.length ?? 0;

  useEffect(() => {
    if (!uploadedImage || !palette) {
      setAreColorsValid(true);
      setMappedData(null);
      return;
    }

    try {
      setMappedData(mapImageDataToPaletteIndices(uploadedImage.data, palette));
      setAreColorsValid(true);
    } catch {
      setMappedData(null);
      setAreColorsValid(false);
    }
  }, [uploadedImage, palette]);

  async function onPasteClick() {
    if (!uploadedImage || !mappedData || !palette || !authorId) return;

    await doCanvasPaste.mutateAsync({
      authorId,
      data: mappedData.map((entry) => [
        entry.x + topLeftCoordinates.x - canvas.startCoordinates[0],
        entry.y + topLeftCoordinates.y - canvas.startCoordinates[1],
        entry.colorId,
      ]),
    });
  }

  const [startX, startY] = canvas.startCoordinates;

  return (
    <ActionPanelPrimitives.Root>
      <ActionPanelTabBody>
        <div>
          <ActionPanelPrimitives.SectionHeading>
            Upload image to paste
          </ActionPanelPrimitives.SectionHeading>
          <FullWidthStyledButton
            onClick={onUploadClick}
            disabled={paletteIsLoading || !palette || doCanvasPaste.isPending}
          >
            Upload
          </FullWidthStyledButton>
          <input
            ref={fileInputRef}
            hidden
            type="file"
            accept="image/*"
            onChange={onUploadChange}
          />
          {uploadError && <ErrorText role="alert">{uploadError}</ErrorText>}
        </div>
      </ActionPanelTabBody>
      {uploadedImage && (
        <>
          <FullWidthScrollView>
            <ActionPanelTabBody>
              <div>
                <ActionPanelPrimitives.SectionHeading>
                  Uploaded image
                </ActionPanelPrimitives.SectionHeading>
                <ContentWrapper>
                  <InfoWrapper>
                    <Info>
                      <code>{uploadedImage.file.name}</code>
                    </Info>
                    <Info>
                      <code>{uploadedImage.width}</code>
                      <X size={16} />
                      <code>{uploadedImage.height}</code>
                    </Info>
                    <Info>
                      <span>
                        {entryCount.toLocaleString()}{" "}
                        {entryCount === 1 ? "pixel" : "pixels"}
                      </span>
                    </Info>
                  </InfoWrapper>
                  {!areColorsValid && (
                    <ErrorText role="alert">
                      <CircleAlert />
                      This image contains colors that are not in the palette.
                    </ErrorText>
                  )}
                  <StyledImage
                    src={uploadedImage.src}
                    alt={`Uploaded file: ${uploadedImage.file.name}`}
                    width={uploadedImage.width}
                    height={uploadedImage.height}
                  />
                </ContentWrapper>
              </div>
            </ActionPanelTabBody>
          </FullWidthScrollView>
          <ActionPanelTabBody>
            <div>
              <ActionPanelPrimitives.SectionHeading>
                Paste image
              </ActionPanelPrimitives.SectionHeading>
              <ContentWrapper>
                <CoordsWrapper>
                  <StyledNumberField
                    label={
                      <>
                        Left (<var>x</var>)
                      </>
                    }
                    value={topLeftCoordinates.x}
                    onValueChange={(value) =>
                      setTopLeftCoordinates({
                        ...topLeftCoordinates,
                        x: value ?? startX,
                      })
                    }
                    min={startX}
                    max={canvas.width + startX - (uploadedImage.width ?? 0)}
                  />
                  <StyledNumberField
                    label={
                      <>
                        Top (<var>y</var>)
                      </>
                    }
                    value={topLeftCoordinates.y}
                    onValueChange={(value) =>
                      setTopLeftCoordinates({
                        ...topLeftCoordinates,
                        y: value ?? startX,
                      })
                    }
                    min={startY}
                    max={canvas.height + startY - (uploadedImage.height ?? 0)}
                  />
                </CoordsWrapper>
                <InputWrapper>
                  <InputLabel htmlFor="author-id-input">Author ID</InputLabel>
                  <AuthorIdInput
                    id="author-id-input"
                    inputMode="numeric"
                    pattern="^[0-9]{16,20}$"
                    placeholder="Author ID"
                    onChange={(event) => setAuthorId(event.currentTarget.value)}
                    value={authorId}
                    type="text"
                  />
                </InputWrapper>
                <FullWidthStyledButton
                  disabled={
                    !areColorsValid ||
                    authorId === "" ||
                    !/^\d{16,20}$/.test(authorId) ||
                    doCanvasPaste.isPending
                  }
                  onClick={onPasteClick}
                >
                  Paste image
                </FullWidthStyledButton>
              </ContentWrapper>
            </div>
          </ActionPanelTabBody>
        </>
      )}
    </ActionPanelPrimitives.Root>
  );
}

function AdminPasteTab() {
  const { canvas } = useCanvasContext();
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [topLeftCoordinates, setTopLeftCoordinates] = useState<Point>({
    x: canvas.startCoordinates[0],
    y: canvas.startCoordinates[1],
  });

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
      uploadedImage={uploadedImage}
      uploadError={uploadError}
      topLeftCoordinates={topLeftCoordinates}
      setUploadedImage={setUploadedImage}
      setUploadError={setUploadError}
      setTopLeftCoordinates={setTopLeftCoordinates}
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
