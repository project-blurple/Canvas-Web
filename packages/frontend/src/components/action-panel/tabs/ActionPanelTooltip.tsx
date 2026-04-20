import { PixelColor } from "@blurple-canvas-web/types";
import { Tooltip, TooltipProps } from "@mui/material";
import { useState } from "react";
import DynamicButton from "@/components/button/DynamicButton";

type ActionPanelTooltipProps = Omit<TooltipProps, "placement" | "slotProps">;

export function ActionPanelTooltip({
  children,
  ...props
}: ActionPanelTooltipProps) {
  return (
    <Tooltip
      placement="top"
      slotProps={{
        popper: {
          modifiers: [
            {
              name: "offset",
              options: {
                offset: [0, -10],
              },
            },
          ],
        },
        tooltip: {
          sx: {
            bgcolor: "var(--discord-legacy-dark-but-not-black);",
            boxShadow: "0px 0px 5px oklch(0 0 0 / 25%)",
          },
        },
      }}
      {...props}
    >
      {children}
    </Tooltip>
  );
}

export function TooltipDynamicButton({
  children,
  color,
  onAction,
  tooltipTitle,
}: {
  children: React.ReactNode;
  color?: PixelColor | null;
  onAction?: () => void;
  tooltipTitle: string;
}) {
  const [tooltipIsOpen, setTooltipIsOpen] = useState(false);

  return (
    <ActionPanelTooltip
      title={tooltipTitle}
      onClose={() => {
        setTooltipIsOpen(false);
      }}
      open={tooltipIsOpen}
    >
      <DynamicButton
        color={color}
        onAction={() => {
          setTooltipIsOpen(true);
          onAction?.();
        }}
      >
        {children}
      </DynamicButton>
    </ActionPanelTooltip>
  );
}
