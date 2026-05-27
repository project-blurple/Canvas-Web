import LayoutWithHeader from "../components/LayoutWithHeader";
import Main from "./Main";

export default async function Page() {
  return (
    <LayoutWithHeader isCanvasPage>
      <Main />
    </LayoutWithHeader>
  );
}
