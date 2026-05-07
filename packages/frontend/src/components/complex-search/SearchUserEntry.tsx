import type {
  Palette,
  PixelHistoryUserSummary,
  PixelHistoryWrapper,
} from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { Copy } from "lucide-react";
import ColorCodeChip from "../ColorCodeChip";
import VisuallyHidden from "../VisuallyHidden";

const UserWrapper = styled("div")`
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
`;

const UserCard = styled("div")`
  background: ${({ theme }) => theme.palette.background.paper};
  border-radius: 0.75rem;
  border: 1px solid ${({ theme }) => theme.palette.divider};
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

const UserId = styled("button")`
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
  palette: Palette;
}

function SearchUserEntry({ userId, summary, palette }: SearchUserEntryProps) {
  const colors = Object.entries(summary.colors)
    .map(([colorId, count]) => {
      const color = palette.find((c) => c.id === Number.parseInt(colorId, 10));
      if (!color) return null;
      return { color, count };
    })
    .filter((c): c is { color: Palette[number]; count: number } => c !== null)
    .sort((a, b) => b.count - a.count);

  return (
    <UserCard>
      <CardHeader>
        <strong>{summary.userProfile?.username ?? userId}</strong>
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
        <VisuallyHidden>User ID {userId}. Click to copy.</VisuallyHidden>
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
  if (!users) return null;

  const sortedUsers = Object.entries(users ?? {}).sort(
    (a, b) => b[1].count - a[1].count,
  );

  return (
    <UserWrapper>
      {sortedUsers.map(([userId, summary]) => (
        <SearchUserEntry
          key={userId}
          userId={BigInt(userId)}
          summary={summary}
          palette={palette}
        />
      ))}
    </UserWrapper>
  );
}
