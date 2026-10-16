import type { PixelHistoryRecord } from "@blurple-canvas-web/types";
import { Skeleton, styled } from "@mui/material";

import ColorCodeChip from "@/components/ColorCodeChip";
import { StaticSwatch } from "@/components/swatch";
import { formatRelativeTime } from "@/util/intl";

const Wrapper = styled("div")`
  align-items: center;
  display: grid;
  gap: 1rem;
  grid-template-columns: auto 1fr;
`;

const StyledSwatch = styled(StaticSwatch)`
  width: 3rem;
`;

const SwatchSkeleton = styled(Skeleton)`
  aspect-ratio: 1;
  border-radius: 0.5rem;
  width: 3rem;
  height: auto;
`;

const UserInfo = styled("div")`
  min-width: 0;
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

const Timestamp = styled("time")`
  color: oklch(from var(--discord-white) l c h / 40%);
  font-size: 0.75rem;
  letter-spacing: 0.01em;
`;

interface PixelHistoryListItemProps extends React.ComponentPropsWithRef<
  typeof Wrapper
> {
  record?: PixelHistoryRecord;
}

export default function PixelHistoryListItem({
  record,
  ...props
}: PixelHistoryListItemProps) {
  const { color, userProfile, timestamp } = record ?? {};

  return (
    <Wrapper {...props}>
      {color ?
        <StyledSwatch key={color.code} paletteColor={color} />
      : <SwatchSkeleton variant="rectangular" />}
      <UserInfo>
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
        {timestamp && (
          <Timestamp
            dateTime={timestamp}
            title={new Date(timestamp).toLocaleString()}
          >
            {formatRelativeTime(timestamp)}
          </Timestamp>
        )}
      </UserInfo>
    </Wrapper>
  );
}
