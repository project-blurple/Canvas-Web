import { Point } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";

const Wrapper = styled("div")`
  color: var(--discord-white);
  display: block flex;
  gap: 2rem;
  justify-content: center;
  padding: 0.5rem;
`;

interface CoordinatesCardProps extends React.ComponentPropsWithRef<
  typeof Wrapper
> {
  coordinates: Point;
}

export default function CoordinatesCard({
  coordinates,
  ...props
}: CoordinatesCardProps) {
  return (
    <Wrapper {...props}>
      <code>x:&nbsp;{coordinates.x}</code>
      <code>y:&nbsp;{coordinates.y}</code>
    </Wrapper>
  );
}
