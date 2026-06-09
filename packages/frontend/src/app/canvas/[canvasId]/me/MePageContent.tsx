"use client";

import { styled } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Avatar from "@/components/Avatar";
import { Button } from "@/components/button/Button";
import RecheckMembershipsButton from "@/components/RecheckMemberships";
import { useAuthContext } from "@/contexts/AuthProvider";
import { useCanvasContext } from "@/contexts/CanvasContext";
import { useUserStats } from "@/hooks/queries/useUserStats";
import StatsTable from "./StatsTable";

const Container = styled("main")`
  display: flex;
  flex-direction: column;
  padding-block: 2rem;
  place-items: center;
  gap: 1rem;
  width: 100%;
  padding: 8rem 4rem;

  ${({ theme }) => theme.breakpoints.down("md")} {
    padding-inline: 1rem;
  }
`;

const SignOutButton = styled(Link)`
  /* Otherwise the height of the link doesn't include the button padding */
  display: inline-block;
`;

const ButtonRow = styled("div")`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  /* Keep buttons top-aligned so the recheck status text grows downward
   * without nudging the Sign out button. */
  align-items: flex-start;
  justify-content: center;
`;

const StatsCard = styled("div")`
  background-color: var(--discord-legacy-not-quite-black);
  border-radius: var(--card-border-radius);
  margin-block: 1rem;
  inline-size: min(36rem, 100%);
  padding: 1.5rem;
  text-align: center;
`;

export default function MePageContent() {
  const { canvas: activeCanvas } = useCanvasContext();
  const { signOut, user } = useAuthContext();
  const router = useRouter();

  const { data: stats, isLoading: isStatsLoading } = useUserStats(
    user?.id,
    activeCanvas.id,
  );

  useEffect(() => {
    if (!user) {
      router.replace("/");
    }
  }, [user, router]);

  if (!user || !activeCanvas) return null;

  const { username, profilePictureUrl } = user;

  return (
    <Container>
      <Avatar
        username={username}
        profilePictureUrl={profilePictureUrl}
        size={96}
      />
      <h1>{username}</h1>
      <ButtonRow>
        <SignOutButton href="/">
          <Button variant="contained" onClick={signOut}>
            Sign out
          </Button>
        </SignOutButton>
        <RecheckMembershipsButton />
      </ButtonRow>
      <StatsCard>
        <h2>{activeCanvas.name}</h2>
        <StatsTable
          stats={stats ?? undefined}
          isStatsLoading={isStatsLoading}
        />
      </StatsCard>
    </Container>
  );
}
