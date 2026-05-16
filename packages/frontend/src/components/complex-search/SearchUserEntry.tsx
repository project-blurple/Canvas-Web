import type {
  Palette,
  PaletteColor,
  PixelHistoryUserSummary,
  PixelHistoryWrapper,
} from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { Copy } from "lucide-react";
import { useMemo } from "react";
import { PrimitiveButton } from "../button";
import ColorCodeChip from "../ColorCodeChip";
import VisuallyHidden from "../VisuallyHidden";

const UserWrapper = styled("div")`
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
`;

const UserCard = styled("div")`
  background: var(--discord-legacy-not-quite-black);
  border-radius: 0.75rem;
  border: var(--card-border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
`;

const CardHeader = styled("div")`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;

  > *:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  > *:last-child {
    flex: 0 0 auto;
  }
`;

const ColorChipWrapper = styled("div")`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 0.25rem;
  overflow-x: auto;
`;

const UserId = styled(PrimitiveButton)`
  appearance: none;
  border: none;
  background: none;
  padding: 0;
  margin: 0;

  align-items: center;
  color: oklch(from var(--discord-white) l c h / 60%);
  display: flex;
  font-size: 0.75rem;
  gap: 0.25rem;
  letter-spacing: 0.01em;
  word-break: break-all;
  width: fit-content;
  cursor: pointer;

  transition-duration: var(--transition-duration-fast);
  transition-property: color;
  transition-timing-function: ease;

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
      <CardHeader>
        <strong title={summary.userProfile?.username ?? userId.toString()}>
          {summary.userProfile?.username ?? userId}
        </strong>
        <span>
          {summary.count.toLocaleString()} pixel{summary.count !== 1 && "s"}
        </span>
      </CardHeader>
      <ColorChipWrapper>
        {colors.slice(0, 5).map(({ color }) => {
          const rgb = color.rgba.slice(0, 3).join(" ");
          return (
            <ColorCodeChip
              key={color.id}
              color={color}
              backgroundColorStr={`rgb(${rgb})`}
            />
          );
        })}
      </ColorChipWrapper>
      <UserId
        onClick={async () =>
          await navigator.clipboard.writeText(userId.toString())
        }
      >
        <code aria-hidden>{userId}</code>
        <VisuallyHidden>
          {summary.userProfile?.username}’s user ID. Click to copy.
        </VisuallyHidden>
        <Copy size={12} />
      </UserId>
    </UserCard>
  );
}

interface SearchUserEntriesProps {
  users: PixelHistoryWrapper["users"];
  palette: Palette;
}

export default function SearchUserEntries({
  users,
  palette,
}: SearchUserEntriesProps) {
  const colorById = useMemo(
    () => new Map(palette.map((color) => [color.id, color] as const)),
    [palette],
  );

  if (!users) return null;

  const sortedUsers = Object.entries(users).sort(
    (a, b) => b[1].count - a[1].count,
  );

  return (
    <UserWrapper>
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
