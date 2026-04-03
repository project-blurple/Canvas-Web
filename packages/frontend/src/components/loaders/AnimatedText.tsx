import { styled, Typography } from "@mui/material";

const LoadingText = styled(Typography)`
  font-size: 11vw;
  padding-block: 2rem;
  font-variation-settings:
    "wght" 100,
    "wdth" 85;
`;
const CHARACTER_DELAY_MS = 400;

interface AnimatedCharacterProps {
  index: number;
  totalCharacters: number;
}

const AnimatedCharacter = styled("span", {
  shouldForwardProp: (prop: string) =>
    !["index", "totalCharacters"].includes(prop),
})<AnimatedCharacterProps>(({ index, totalCharacters }) => ({
  animation: `breathe ${(totalCharacters + 1) * CHARACTER_DELAY_MS}ms infinite both`,
  animationDelay: `${(index + 1) * CHARACTER_DELAY_MS}ms`,
}));

export interface AnimatedTextProps {
  children: string;
}

export default function AnimatedText({ children }: AnimatedTextProps) {
  const text = children;
  const totalCharacters = text.length;

  return (
    <LoadingText className="loader">
      {text.split("").map((char, index) => (
        <AnimatedCharacter
          key={`${index}-${char}`}
          index={index}
          totalCharacters={totalCharacters}
        >
          {char}
        </AnimatedCharacter>
      ))}
    </LoadingText>
  );
}
