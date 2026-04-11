"use client";

import { Checkbox, styled } from "@mui/material";
import { BellOff, BellRing, Volume2, VolumeOff } from "lucide-react";
import { useAudioContext } from "@/contexts";

const Wrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: calc(2 * var(--layout-padding-y));
  padding-block: 4rem;
  padding-inline: var(--layout-padding-x);
  place-items: center;
`;

const TitleBlock = styled("div")`
  text-align: center;
`;

const CategoryBlock = styled("div")`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Table = styled("table")`
  font-size: min(4svw, 1.75rem);
  font-weight: 500;
  inline-size: min(40rem, 100%);

  th,
  td {
    --cell-padding: min(1.5svw, 1rem);
    padding: var(--cell-padding);
  }
`;

const StyledCheckbox = styled(Checkbox)`
  color: var(--discord-white);

  &.Mui-checked {
    color: var(--discord-white);
  }
`;

export default function Settings() {
  const {
    playSounds,
    cooldownExpiryJingle,
    setPlaySounds,
    setCooldownExpiryJingle,
  } = useAudioContext();

  return (
    <Wrapper>
      <TitleBlock>
        <h1>Settings</h1>
      </TitleBlock>
      <CategoryBlock>
        <h2>Audio</h2>
        <Table>
          <thead hidden>
            <tr>
              <th>Value</th>
              <th>Setting</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <StyledCheckbox
                  icon={<VolumeOff />}
                  checkedIcon={<Volume2 />}
                  checked={playSounds}
                  onChange={(_, checked) => setPlaySounds(checked)}
                />
              </td>
              <td>Play sounds</td>
            </tr>
            <tr>
              <td>
                <StyledCheckbox
                  icon={<BellOff />}
                  checkedIcon={<BellRing />}
                  checked={cooldownExpiryJingle}
                  onChange={(_, checked) => setCooldownExpiryJingle(checked)}
                />
              </td>
              <td>Cooldown expiry jingle</td>
            </tr>
          </tbody>
        </Table>
      </CategoryBlock>
    </Wrapper>
  );
}
