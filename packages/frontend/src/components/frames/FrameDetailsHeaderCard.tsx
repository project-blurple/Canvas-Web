import { type Frame, FrameOwnerType } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { User, Users } from "lucide-react";
import CanvasIcon from "../CanvasIcon";

const Wrapper = styled("div")`
  align-items: baseline;
  color: oklch(var(--discord-white-oklch) / 60%);
  display: grid;
  font-size: 1.375rem;
`;

const Heading = styled("h3")`
  color: var(--discord-white);
  font-weight: 900;
  line-height: 1.1;
`;

const OwnerInfo = styled("p")`
  align-items: center;
  display: flex;
  gap: 0.25rem;
`;

export default function FrameDetailsHeaderCard({ frame }: { frame?: Frame }) {
  if (!frame) return <Wrapper>No frame selected</Wrapper>;

  const ownerInfo = (() => {
    switch (frame.owner.type) {
      case FrameOwnerType.Guild:
        return {
          icon: <Users aria-hidden />,
          label: frame.owner.guild.name ?? "Unknown guild",
        };
      case FrameOwnerType.User:
        return {
          icon: <User aria-hidden />,
          label: frame.owner.user.username ?? "Unknown user",
        };
      default:
        return {
          icon: <CanvasIcon aria-hidden />,
          label: "Blurple Canvas",
        };
    }
  })();

  return (
    <Wrapper>
      <Heading>{frame.name}</Heading>
      <OwnerInfo>
        {ownerInfo.icon} {ownerInfo.label}
      </OwnerInfo>
    </Wrapper>
  );
}
