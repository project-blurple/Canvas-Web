import LayoutWithHeader from "../components/LayoutWithNavbar";
import Main from "./Main";

export default async function Page() {
  return <LayoutWithHeader content={<Main />} />;
}
