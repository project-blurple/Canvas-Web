import { Frame } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { User, Users } from "lucide-react";

const Wrapper = styled("div")`
  // kinda stolen from SelectedColorInfoCard.tsx
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

  return (
    <Wrapper>
      <Heading>{frame.name}</Heading>
      {frame.ownerGuild ?
        <OwnerInfo>
          <Users /> {frame.ownerGuild.name}
        </OwnerInfo>
      : frame.ownerUser ?
        <OwnerInfo>
          <User /> {frame.ownerUser.username}
        </OwnerInfo>
      : null}
    </Wrapper>
  );
}
