import type { Frame } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { Paintbrush, User, Users } from "lucide-react";

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

export default function FrameInfoCard({ frame }: { frame?: Frame }) {
  if (!frame) return <Wrapper>No frame selected</Wrapper>;

  const ownerInfo = (() => {
    switch (frame.owner.type) {
      case "guild":
        return {
          icon: <Users aria-hidden />,
          label: frame.owner.guild.name ?? "Unknown guild",
        };
      case "user":
        return {
          icon: <User aria-hidden />,
          label: frame.owner.user.username ?? "Unknown user",
        };
      default:
        return {
          icon: <Paintbrush aria-hidden />, // TODO: replace with Canvas icon?
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
