import type { PixelHistoryRecord } from "@blurple-canvas-web/types";
import { Skeleton, styled } from "@mui/material";

import ColorCodeChip from "@/components/ColorCodeChip";
import { StaticSwatch } from "@/components/swatch";

const Wrapper = styled("div")`
  align-items: center;
  display: grid;
  gap: 1rem;
  grid-template-columns: auto 1fr;
`;

const StyledSwatch = styled(StaticSwatch)`
  border: 0.125rem solid var(--discord-white);
  width: 3rem;
`;

const SwatchSkeleton = styled(Skeleton)`
  aspect-ratio: 1;
  border-radius: 0.5rem;
  width: 3rem;
  height: auto;
`;

const Username = styled("p")`
  font-weight: 500;
  letter-spacing: 0.01em;
  word-break: break-word;
`;

const ColorName = styled("p")`
  color: oklch(from var(--discord-white) l c h / 60%);
  letter-spacing: 0.01em;
`;

export default function PixelHistoryListItem({
  record,
}: {
  record?: PixelHistoryRecord;
}) {
  const { color, userProfile } = record ?? {};

  return (
    <Wrapper>
      {color ?
        <StyledSwatch key={color.code} rgba={color.rgba} />
      : <SwatchSkeleton variant="rectangular" />}
      <div>
        <Username title={record?.userId}>
          {record ?
            (userProfile?.username ?? record.userId)
          : <Skeleton width={80} />}
        </Username>
        <ColorName>
          {color ?
            <>
              {color.name}
              <ColorCodeChip
                color={color}
                style={{ marginInlineStart: ".3em" }}
              />
            </>
          : <Skeleton width={120} />}
        </ColorName>
      </div>
    </Wrapper>
  );
}
