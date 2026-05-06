import type { Notice } from "@blurple-canvas-web/types";
import { styled } from "@mui/material/styles";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import Markdown from "markdown-to-jsx";
import { resolveSpecialText } from "@/util/text";
import { PrimitiveButton } from "../button";

const icons = {
  info: <Info />,
  error: <TriangleAlert />,
  warning: <CircleAlert />,
} as const;

const BannerRoot = styled("li")`
  --notice-tint: var(--discord-white;);
  background-color: oklch(from var(--notice-tint) l c h / 6%);
  border-radius: 0.75rem;
  border: var(--card-border);
  display: grid;
  gap: inherit;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
  padding: 0.75rem;
  font-weight: 450;
  letter-spacing: 0.01em;

  @supports (color: color-mix(in oklab, black, black)) {
    color: color-mix(in oklab, currentColor 90%, var(--notice-tint));
  }

  &[data-severity="warning"] {
    background-color: transparent;
  }
  &[data-severity="warning"] {
    --notice-tint: var(--discord-blurple);
  }
  &[data-severity="error"] {
    --notice-tint: var(--discord-red);
  }

  svg:first-of-type {
    opacity: 94%;
    color: var(--notice-tint);
  }
`;

const BannerBody = styled("div")`
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-size: inherit;
    font-weight: bolder;
  }
`;

const ButtonBar = styled("div")``;

const DismissButton = styled(PrimitiveButton)`
  border-radius: 0.1875em;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.015em;
  padding-block: 0.15em;
  padding-inline: 0.75em;
  color: oklch(1 0 0 / 60%);
  text-box-trim: both;
  &:active {
    scale: 99%;
  }
  &:hover {
    background-color: oklch(1 0 0 / 4%);
  }
`;

interface BannerProps extends React.ComponentPropsWithRef<typeof BannerRoot> {
  notice: Notice;
}

export default function NoticeBanner({ notice, ...props }: BannerProps) {
  const headerText =
    notice.header ? `### ${resolveSpecialText(notice.header)}` : "";
  const contentText = notice.content ? resolveSpecialText(notice.content) : "";

  return (
    <BannerRoot
      data-severity={notice.type}
      onPointerDown={(e) => e.stopPropagation()}
      {...props}
    >
      {icons[notice.type]}
      <BannerBody>
        {headerText && (
          <div style={{ marginBlockEnd: "0.25em" }}>
            <Markdown>{headerText}</Markdown>
          </div>
        )}
        {contentText && <Markdown>{contentText}</Markdown>}
      </BannerBody>
    </BannerRoot>
  );
}
