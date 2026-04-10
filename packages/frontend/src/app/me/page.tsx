import LayoutWithHeader from "@/components/LayoutWithNavbar";
import MePageContent from "./MePageContent";

export default function MePage() {
  return <LayoutWithHeader content={<MePageContent />} />;
}
