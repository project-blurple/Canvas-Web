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

const Forced =
  process.env.NODE_ENV === "production" ?
    Root
  : styled("span")`
      font-size: 0.75em;
      font-weight: 500;
      letter-spacing: 0.02em;
      text-shadow: 0 0 2px contrast-color(currentColor);
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

  const Component = forceShow ? Forced : Root;
  return <Component data-vh-debug={forceShow || undefined} {...props} />;
}
