import type {
  Palette,
  PixelHistoryUserSummary,
  PixelHistoryWrapper,
} from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import ColorCodeChip from "../ColorCodeChip";

const UserWrapper = styled("div")`
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
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
`;

const ColorChipWrapper = styled("div")`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 0.25rem;
  overflow-x: auto;
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
        {summary.count.toLocaleString()} pixel{summary.count !== 1 && "s"}
      </CardHeader>
      <ColorChipWrapper>
        {colors.slice(0, 5).map(({ color }) => (
          <ColorCodeChip key={color.id} color={color} />
        ))}
      </ColorChipWrapper>
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
