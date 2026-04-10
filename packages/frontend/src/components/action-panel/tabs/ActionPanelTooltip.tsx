import { Tooltip, TooltipProps } from "@mui/material";

interface ActionPanelTooltipProps extends Omit<
  TooltipProps,
  "placement" | "slotProps"
> {
  children: React.ReactElement;
}

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
            boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.25)",
          },
        },
      }}
      {...props}
    >
      {children}
    </Tooltip>
  );
}
