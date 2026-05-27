import type {
  PaletteColor,
  PixelHistoryUserSummary,
  PixelHistoryWrapper,
} from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { Copy } from "lucide-react";
import { useMemo } from "react";
import { useCanvasContext } from "@/contexts";
import { usePalette } from "@/hooks";
import { PrimitiveButton } from "../button";
import ColorCodeChip from "../ColorCodeChip";
import VisuallyHidden from "../VisuallyHidden";

const UserWrapper = styled("ul")`
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
`;

const UserCard = styled("li")`
  align-items: baseline;
  background: var(--discord-legacy-not-quite-black);
  border-radius: 0.75rem;
  border: var(--card-border);
  display: grid;
  grid-template-areas: "--username --entry-count" "--user-id --user-id" "--color-list --color-list" "--timestamp --timestamp";
  grid-template-columns: 1fr auto;
  padding: 0.75rem;
`;

const Heading = styled("h3")`
  font: inherit;
  grid-area: --username;
  margin-block: 0;
  font-weight: 600;
`;

const Paragraph = styled("p")`
  font: inherit;
  font-variant-numeric: lining-nums tabular-nums;
  grid-area: --entry-count;
`;

export const UserIdButton = styled(PrimitiveButton)`
  color: oklch(from var(--discord-white) l c h / 60%);
  cursor: pointer;
  font-size: 0.75rem;
  gap: 0.25rem;
  grid-area: --user-id;
  letter-spacing: 0.01em;
  margin-block-start: 0.5em;
  width: fit-content;
  word-break: break-all;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: oklch(from var(--discord-white) l c h / 70%);
    }
  }

  &:focus-visible {
    color: oklch(from var(--discord-white) l c h / 70%);
    outline: var(--focus-outline);
  }

  &:active {
    color: oklch(from var(--discord-white) l c h / 55%);
  }
`;

const ColorChipList = styled("ul")`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 0.25rem;
  margin-block-start: 1em;
  overflow-x: auto;
`;

const TimestampRow = styled("div")`
  display: flex;
  grid-area: --timestamp;
  justify-content: space-between;
  width: 100%;
`;

const Timestamp = styled("time")`
  font-size: 0.75rem;
  margin-block-start: 0.5em;
  opacity: 0.75;
`;

interface SearchUserEntryProps {
  userId: bigint;
  summary: PixelHistoryUserSummary;
  colorById: Map<PaletteColor["id"], PaletteColor>;
}

function SearchUserEntry({ userId, summary, colorById }: SearchUserEntryProps) {
  const colors = Object.entries(summary.colors)
    .map(([colorId, count]) => {
      const color = colorById.get(Number.parseInt(colorId, 10));
      if (!color) return null;
      return { color, count };
    })
    .filter(<T,>(c: T): c is NonNullable<T> => c !== null)
    .sort((a, b) => b.count - a.count);

  return (
    <UserCard>
      <Heading>{summary.userProfile?.username ?? userId}</Heading>
      <Paragraph>
        {summary.count.toLocaleString()}&nbsp;
        {summary.count === 1 ? "entry" : "entries"}
      </Paragraph>

      <ColorChipList role="list" style={{ gridArea: "--color-list" }}>
        {colors.slice(0, 5).map(({ color }) => {
          const rgb = color.rgba.slice(0, 3).join(" ");
          return (
            <li key={color.id}>
              <ColorCodeChip color={color} backgroundColorStr={`rgb(${rgb})`} />
            </li>
          );
        })}
      </ColorChipList>
      <UserIdButton
        onClick={async () =>
          void (await navigator.clipboard.writeText(userId.toString()))
        }
      >
        <code aria-hidden>{userId}</code>
        <Copy
          size={12}
          style={{ display: "inline-block", marginInlineStart: 4 }}
        />
        <VisuallyHidden>
          {summary.userProfile?.username}’s user ID. Click to copy.
        </VisuallyHidden>
      </UserIdButton>
      <TimestampRow>
        <Timestamp>{new Date(summary.firstPlaced).toLocaleString()}</Timestamp>
        <Timestamp>{new Date(summary.lastPlaced).toLocaleString()}</Timestamp>
      </TimestampRow>
    </UserCard>
  );
}

interface SearchUserEntriesProps {
  users: PixelHistoryWrapper["users"];
}

export default function SearchUserEntries({ users }: SearchUserEntriesProps) {
  const { canvas } = useCanvasContext();
  const { data: palette = [] } = usePalette(canvas.eventId ?? undefined);

  const colorById = useMemo(
    () => new Map(palette.map((color) => [color.id, color] as const)),
    [palette],
  );

  if (!users) return null;

  const sortedUsers = Object.entries(users).sort(
    (a, b) => b[1].count - a[1].count,
  );

  return (
    <UserWrapper role="list">
      {sortedUsers.map(([userId, summary]) => (
        <SearchUserEntry
          key={userId}
          userId={BigInt(userId)}
          summary={summary}
          colorById={colorById}
        />
      ))}
    </UserWrapper>
  );
}
