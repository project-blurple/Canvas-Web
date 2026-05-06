import { styled } from "@mui/material";

export const Root = styled("article")`
  align-content: center;
  margin-trim: block;
  min-block-size: min(100vb, 16em); /* fallback */
  min-block-size: min(100dvb, 16em);
  padding-block: 1.5rem;
  text-align: center;
  text-wrap: balance;
  svg,
  .lucide {
    margin-inline: auto;
    opacity: 55%;
    font-size: 3.375rem;
    height: 3.375rem;
    width: auto;
  }
`;

export const Heading = styled("h2")`
  color: unset;
  font-size: 1.5em;
  font-weight: 600;
  margin-block-start: 0.5em;
`;

export const Description = styled("p")`
  color: ${(props) => props.theme.palette.text.secondary};
  margin-block-start: 0.5em;
`;

export default { Root, Heading, Description };
