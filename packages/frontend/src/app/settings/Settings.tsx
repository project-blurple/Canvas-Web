"use client";

import { useAudioContext } from "@/contexts";
import { styled } from "@mui/material";
import CheckboxSetting from "./CheckboxSetting";

const Wrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: calc(2 * var(--layout-padding-y));
  inline-size: 40rem;
  margin-inline: auto;
  padding-block: 4rem;
  padding-inline: var(--layout-padding-x);

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    text-align: center;
  }
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
          checked={playSounds}
          description="Play sound effects as you interact with a canvas"
          label="Sound effects"
          name="sound-fx"
          onChange={(e) => setPlaySounds(e.target.checked)}
        />
        <CheckboxSetting
          checked={cooldownExpiryJingle}
          description="Play a sound when you can place another pixel"
          label="Cooldown expiry jingle"
          name="cooldown-jingle"
          onChange={(e) => setCooldownExpiryJingle(e.target.checked)}
        />
      </Form>

      <h2>Webfonts</h2>
      <Form>
        <CheckboxSetting
          label="Use webfonts"
          description="Uncheck to use system fonts"
        />
      </Form>
    </Wrapper>
  );
}
