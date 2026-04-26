import Tooltip, { TooltipProps } from "@mui/material/Tooltip";
import { useState } from "react";
import DynamicButton from "@/components/button/DynamicButton";

type ActionPanelTooltipProps = Omit<TooltipProps, "placement" | "slotProps">;
type TooltipDynamicButtonProps = React.ComponentPropsWithoutRef<
  typeof DynamicButton
> & {
  tooltipTitle: string;
};

function ActionPanelTooltip({ children, ...props }: ActionPanelTooltipProps) {
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
  tooltipTitle,
  onAction,
  ...dynamicButtonProps
}: TooltipDynamicButtonProps) {
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
        {...dynamicButtonProps}
        onAction={() => {
          setTooltipIsOpen(true);
          onAction?.();
        }}
      />
    </ActionPanelTooltip>
  );
}
