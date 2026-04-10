import LayoutWithHeader from "@/components/LayoutWithNavbar";
import Leaderboard from "./Leaderboard";

export default function LeaderboardPage() {
  return <LayoutWithHeader content={<Leaderboard />} />;
}
