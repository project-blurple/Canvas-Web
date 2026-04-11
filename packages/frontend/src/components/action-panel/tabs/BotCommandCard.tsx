import { styled } from "@mui/material";
import { Copy as CopyIcon } from "lucide-react";
import config from "@/config";
import { useCanvasContext, useSelectedColorContext } from "@/contexts";

const Wrapper = styled("div")`
  align-items: center;
  color: var(--discord-white);
  display: grid;
  gap: 0.5rem;
  grid-template-columns: 1fr auto;
  line-height: 1.45;
`;

interface CopyButtonProps {
  onClick?: () => void;
}

const CopyButton = styled("button")<CopyButtonProps>`
  background-color: oklch(from var(--discord-white) l c h / 12%);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  padding: 0.5rem;
  place-items: center;
  transition: background-color var(--transition-duration-fast) ease;

  :hover {
    background-color: oklch(from var(--discord-white) l c h / 24%);
  }

  :active {
    background-color: oklch(from var(--discord-white) l c h / 6%);
  }
`;

const StyledCopyIcon = styled(CopyIcon)`
  block-size: 1.5rem;
  inline-size: 1.5rem;
`;

export default function BotCommandCard() {
  const { adjustedCoords: coordinates } = useCanvasContext();
  const { color } = useSelectedColorContext();

  if (config.showBotCommands === false) return null;

  if (!coordinates || !color) return null;

  const { x, y } = coordinates;
  const command = `/place x:${x} y:${y} color:${color.code}`;

  return (
    <Wrapper>
      <code>{command}</code>
      <CopyButton onClick={() => navigator.clipboard.writeText(command)}>
        <StyledCopyIcon />
      </CopyButton>
    </Wrapper>
  );
}
