import { Tooltip, TooltipProps } from "@mui/material";

type ActionPanelTooltipProps = Omit<TooltipProps, "placement" | "slotProps">;

export default function ActionPanelTooltip({
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
