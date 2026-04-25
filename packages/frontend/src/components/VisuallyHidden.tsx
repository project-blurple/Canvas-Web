import { styled } from "@mui/material";
import { useEffect, useState } from "react";

/** @see https://www.a11yproject.com/posts/how-to-hide-content */
const Root = styled("span")`
  &:not(:active, :focus-visible, :focus-within) {
    border: 0;
    clip: rect(0 0 0 0);
    height: auto;
    margin: 0;
    overflow: hidden;
    padding: 0;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }
`;

/** @see https://www.joshwcomeau.com/snippets/react-components/visually-hidden */
export default function VisuallyHidden(
  props: React.ComponentPropsWithRef<typeof Root>,
) {
  const [forceShow, setForceShow] = useState(false);

  useEffect(function forceShowOnAltDown() {
    if (process.env.NODE_ENV === "production") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") setForceShow(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") setForceShow(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return forceShow ? props.children : <Root {...props} />;
}
