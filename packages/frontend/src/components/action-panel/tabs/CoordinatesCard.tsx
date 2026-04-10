import { Point } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";

export const Wrapper = styled("div")`
  color: var(--discord-white);
  display: block flex;
  gap: 2rem;
  justify-content: center;
  padding: 0.5rem;
`;

export default function CoordinatesCard({
  coordinates,
}: {
  coordinates: Point;
}) {
  return (
    <Wrapper>
      <code>x:&nbsp;{coordinates.x}</code>
      <code>y:&nbsp;{coordinates.y}</code>
    </Wrapper>
  );
}
