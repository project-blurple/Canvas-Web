"use client";

import type { Palette, PaletteColor } from "@blurple-canvas-web/types";
import { css, styled } from "@mui/material";
import { partition } from "es-toolkit";
import { useState } from "react";
import { toast } from "sonner";
import { BasicButton } from "@/components/button";
import CanvasIcon from "@/components/CanvasIcon";
import { Input } from "@/components/input";
import { StaticSwatch } from "@/components/swatch";
import { useCanvasContext } from "@/contexts";
import {
  useCreateColor,
  useEditColor,
  usePalette,
} from "@/hooks";
import AdminDashboard from "../AdminDashboard";

const AdminColorTabBlock = styled("section")`
  display: block;
  max-width: 80rem;
  width: 100%;
`;

const ColorTabWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  width: 100%;
`;

const StyledColorListWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ColorList = styled("ul")`
  display: grid;
  font-size: 0.875rem;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(14em, 1fr));
  list-style: none;
  margin: 0;
  padding: 0;
`;

const ColorCard = styled("li")`
  column-gap: 1em;
  display: grid;
  grid-template-columns: 3rem auto;
`;

const ColorCardText = styled("div")`
  * + * {
    margin-block-start: 0.5em;
  }
`;

const GuildId = styled("code")`
  color: var(--discord-legacy-muted);
  display: block;
  font-size: 0.75rem;
`;

const ColorEditButton = styled("button")`
  background: none;
  border: none;
  color: var(--discord-blurple);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0;
  text-decoration: underline;

  &:hover {
    color: var(--discord-legacy-blurple);
  }
`;

const adminFormCss = css`
  background-color: var(--discord-legacy-not-quite-black);
  border-radius: 1rem;
  border: var(--card-border);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  width: 100%;
`;

const ColorForm = styled("form")`
  ${adminFormCss}
`;

const FormTitle = styled("h3")`
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
`;

const FormRow = styled("div")`
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const FormField = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  label {
    color: oklch(from var(--discord-white) l c h / 60%);
    font-size: 0.75rem;
  }
`;

const CheckboxWrapper = styled("div")`
  align-items: center;
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  margin-block-start: 1.5rem;
`;

const ColorPreviewWrapper = styled("div")`
  align-items: center;
  display: flex;
  gap: 0.75rem;
`;

const RgbaInputRow = styled("div")`
  display: flex;
  gap: 0.5rem;

  input {
    width: 3.5rem;
  }
`;

const HexInput = styled(Input)`
  width: 5.5rem;
`;

const NameInput = styled(Input)`
  width: 12rem;
`;

function parseHexToRgba(hex: string): [number, number, number, number] | null {
  if (!/^#[0-9A-Fa-f]{3}$/.test(hex)) return null;
  const r = Number.parseInt(hex[1] + hex[1], 16);
  const g = Number.parseInt(hex[2] + hex[2], 16);
  const b = Number.parseInt(hex[3] + hex[3], 16);
  return [r, g, b, 255];
}

function rgbaToHex(rgba: [number, number, number, number]): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0").slice(-1);
  return `#${toHex(rgba[0])}${toHex(rgba[1])}${toHex(rgba[2])}`;
}

interface ColorFormValues {
  name: string;
  code: string;
  global: boolean;
  rgba: [number, number, number, number];
}

const DEFAULT_FORM_VALUES: ColorFormValues = {
  name: "",
  code: "#000",
  global: false,
  rgba: [0, 0, 0, 255],
};

interface ColorEditorProps {
  mode: "create" | "edit";
  initialColor?: PaletteColor;
  onComplete: () => void;
}

function ColorEditor({ mode, initialColor, onComplete }: ColorEditorProps) {
  const [name, setName] = useState(initialColor?.name ?? "");
  const [code, setCode] = useState(initialColor?.code ?? DEFAULT_FORM_VALUES.code);
  const [isGlobal, setIsGlobal] = useState(initialColor?.global ?? false);
  const [rgba, setRgba] = useState<[number, number, number, number]>(
    initialColor?.rgba ?? DEFAULT_FORM_VALUES.rgba,
  );
  const createColorMutation = useCreateColor();
  const editColorMutation = useEditColor(initialColor?.id ?? 0);

  const isPending = createColorMutation.isPending || editColorMutation.isPending;

  function handleCodeChange(newCode: string) {
    setCode(newCode);
    const parsed = parseHexToRgba(newCode);
    if (parsed) {
      setRgba(parsed);
    }
  }

  function handleRgbaChange(index: number, value: string) {
    const num = Math.min(255, Math.max(0, Number.parseInt(value, 10) || 0));
    const newRgba: [number, number, number, number] = [...rgba];
    newRgba[index] = num;
    setRgba(newRgba);
    // Update hex code when rgba changes
    if (index < 3) {
      setCode(rgbaToHex(newRgba));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const data = { name, code, global: isGlobal, rgba };

    if (mode === "create") {
      toast.promise(createColorMutation.mutateAsync(data), {
        loading: "Creating color…",
        success: "Color created",
        error: "Couldn't create color",
      });
      try {
        await createColorMutation.mutateAsync(data);
        setName("");
        setCode(DEFAULT_FORM_VALUES.code);
        setIsGlobal(false);
        setRgba(DEFAULT_FORM_VALUES.rgba);
        onComplete();
      } catch {
        // error handled by toast
      }
    } else {
      toast.promise(editColorMutation.mutateAsync(data), {
        loading: "Saving color…",
        success: "Color saved",
        error: "Couldn't save color",
      });
      try {
        await editColorMutation.mutateAsync(data);
        onComplete();
      } catch {
        // error handled by toast
      }
    }
  }

  const previewColor: PaletteColor = {
    id: initialColor?.id ?? 0,
    name: name || "Preview",
    code,
    rgba,
    global: isGlobal,
    invite: null,
    guildName: null,
    guildId: null,
  };

  return (
    <ColorForm onSubmit={handleSubmit}>
      <FormTitle>{mode === "create" ? "Create New Color" : `Edit Color #${initialColor?.id}`}</FormTitle>
      <FormRow>
        <FormField>
          <label htmlFor="color-name">Name</label>
          <NameInput
            id="color-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Color name"
            required
          />
        </FormField>
        <FormField>
          <label htmlFor="color-code">Hex Code</label>
          <HexInput
            id="color-code"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="#abc"
            required
          />
        </FormField>
        <CheckboxWrapper>
          <input
            type="checkbox"
            id="color-global"
            checked={isGlobal}
            onChange={(e) => setIsGlobal(e.target.checked)}
          />
          <label htmlFor="color-global" style={{ color: "var(--discord-white)", fontSize: "0.875rem" }}>
            Global
          </label>
        </CheckboxWrapper>
      </FormRow>
      <FormRow>
        <FormField>
          <label>RGBA</label>
          <RgbaInputRow>
            {["R", "G", "B", "A"].map((channel, i) => (
              <Input
                key={channel}
                value={rgba[i]}
                onChange={(e) => handleRgbaChange(i, e.target.value)}
                placeholder={channel}
                type="number"
                min={0}
                max={255}
                required
              />
            ))}
          </RgbaInputRow>
        </FormField>
        <ColorPreviewWrapper>
          <StaticSwatch aria-hidden paletteColor={previewColor} />
          <span style={{ fontSize: "0.875rem" }}>{name || "Preview"}</span>
        </ColorPreviewWrapper>
      </FormRow>
      <FormRow>
        <BasicButton type="submit" disabled={isPending || !name || !code}>
          {mode === "create" ? "Create" : "Save"}
        </BasicButton>
        <BasicButton
          type="button"
          onClick={onComplete}
          disabled={isPending}
        >
          Cancel
        </BasicButton>
      </FormRow>
    </ColorForm>
  );
}

interface EditableColorCardProps {
  color: PaletteColor;
}

function EditableColorCard({ color }: EditableColorCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <ColorEditor
        mode="edit"
        initialColor={color}
        onComplete={() => setIsEditing(false)}
      />
    );
  }

  return (
    <ColorCard>
      <StaticSwatch aria-hidden paletteColor={color} />
      <ColorCardText>
        <p style={{ textBoxTrim: "trim-start" }}>{color.name}</p>
        <code>{color.code}</code>
        {color.guildId && <GuildId>{color.guildId}</GuildId>}
        <div>
          <ColorEditButton onClick={() => setIsEditing(true)}>
            Edit
          </ColorEditButton>
        </div>
      </ColorCardText>
    </ColorCard>
  );
}

function ColorListWrapper({
  colors,
  header,
}: {
  colors: Palette;
  header: string;
}) {
  return (
    <StyledColorListWrapper>
      <h2>{header}</h2>
      {colors.length === 0 ?
        <p>No colors found</p>
      : <ColorList role="list">
          {colors.map((color) => (
            <EditableColorCard key={color.id} color={color} />
          ))}
        </ColorList>
      }
    </StyledColorListWrapper>
  );
}

function AdminColorTab() {
  const { canvas } = useCanvasContext();
  const { data: palette, isLoading } = usePalette(
    canvas.eventId ?? undefined,
    true,
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [mainColors, partnerColors] =
    palette ? partition(palette, (color) => color.global) : [[], []];
  const [participatingColors, nonParticipatingColors] = partition(
    partnerColors,
    (color) => Boolean(color.guildId),
  );

  return (
    <AdminColorTabBlock>
      <ColorTabWrapper>
        {isLoading || palette === undefined ?
          <CanvasIcon
            loading
            size={64}
            style={{
              color: "var(--discord-blurple)",
              margin: "auto",
              opacity: 0.5,
            }}
          />
        : palette.length === 0 ?
          <p>No colors found</p>
        : <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>Colors</h2>
              <BasicButton onClick={() => setShowCreateForm((prev) => !prev)}>
                {showCreateForm ? "Cancel" : "Create Color"}
              </BasicButton>
            </div>
            {showCreateForm && (
              <ColorEditor
                mode="create"
                onComplete={() => setShowCreateForm(false)}
              />
            )}
            <ColorListWrapper colors={mainColors} header="Global colors" />
            <ColorListWrapper
              colors={participatingColors}
              header="Participating partner colors"
            />
            <ColorListWrapper
              colors={nonParticipatingColors}
              header="Non-participating partner colors"
            />
          </>
        }
      </ColorTabWrapper>
    </AdminColorTabBlock>
  );
}

export default function ColorAdminPage() {
  return (
    <AdminDashboard>
      <AdminColorTab />
    </AdminDashboard>
  );
}
