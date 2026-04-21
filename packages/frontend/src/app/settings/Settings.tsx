"use client";

import { styled } from "@mui/material";
import { useAudioContext } from "@/contexts";
import CheckboxSetting from "./CheckboxSetting";

const Wrapper = styled("div")`
  border: 1px solid magenta;

  display: flex;
  flex-direction: column;
  gap: calc(2 * var(--layout-padding-y));
  padding-block: 4rem;
  padding-inline: var(--layout-padding-x);
  place-items: center;
`;

const Form = styled("form")`
  border-radius: var(--card-border-radius);
  border: var(--card-border);
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
      <h1>Settings</h1>
      <h2>Notification sounds</h2>
      <Form>
        <CheckboxSetting
          label="Sound effects"
          description=""
          onChange={(e) => {
            console.log(e);
            setPlaySounds(e.target.checked);
          }}
          checked={playSounds}
        />
        <CheckboxSetting
          label="Cooldown expiry jingle"
          description="Play a sound when you can place another pixel"
          checked={cooldownExpiryJingle}
          onChange={(e) => setCooldownExpiryJingle(e.target.checked)}
        />
      </Form>
    </Wrapper>
  );
}
