import type { PaletteColor } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useAuthContext, useCanvasContext } from "@/contexts";
import {
  RecheckMembershipsLink,
  useRecheckMemberships,
} from "../../RecheckMemberships";

const Wrapper = styled("div")`
  align-items: baseline;
  border-radius: 8px;
  color: oklch(from var(--discord-white) l c h / 60%);
  display: grid;
  font-size: 1.125rem;
  grid-template-columns: 1fr auto;
`;

const Heading = styled("h3")`
  color: var(--discord-white);
  font-size: inherit;
  font-weight: 900;
  line-height: 1.1;
`;

const Subtitle = styled("p")`
  font-size: 1rem;
  grid-column: 1 / -1;
  letter-spacing: 0.005em;
  margin-block-start: 0.25rem;

  &,
  a {
    color: oklch(from currentColor l c h / 60%);
  }
`;

const Code = styled("code")`
  color: oklch(from currentColor l c h / 60%);
  line-height: 1.1;
`;

interface ColorInfoCardProps extends Omit<
  React.ComponentPropsWithRef<typeof Wrapper>,
  "color"
> {
  color?: PaletteColor | null;
  invite?: string;
  isUserInServer?: boolean;
}

export default function ColorInfoCard({
  color,
  invite,
  isUserInServer: userInServer = false,
  ...props
}: ColorInfoCardProps) {
  const { canvas } = useCanvasContext();
  const { user } = useAuthContext();
  const recheckMutation = useRecheckMemberships();

  if (!color) return <Wrapper>No color selected</Wrapper>;

  const { name: colorName, code: colorCode } = color;

  const guildName = color.guildName ?? "a partnered server";
  const guildNameNode =
    invite ?
      <a href={invite} target="_blank" rel="external noreferrer">
        {guildName}
      </a>
    : guildName;

  return (
    <Wrapper {...props}>
      <Heading>{colorName}</Heading>
      <Code>{colorCode}</Code>
      {!color.global &&
        (canvas.allColorsGlobal ?
          <Subtitle>
            {colorName} is from {guildNameNode}
          </Subtitle>
        : userInServer ?
          <Subtitle>
            You can use {colorName} in {guildNameNode}
          </Subtitle>
        : user ?
          <Subtitle>
            Exclusive to {guildNameNode}. Already joined?{" "}
            <RecheckMembershipsLink controller={recheckMutation}>
              Refresh here.
            </RecheckMembershipsLink>
          </Subtitle>
        : <Subtitle>
            Exclusive to {guildNameNode}. <a href="/signin">Log in</a> to use.
          </Subtitle>)}
    </Wrapper>
  );
}
