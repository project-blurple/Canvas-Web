"use client";

import { useAudioContext } from "@/contexts";
import { styled } from "@mui/material";
import CheckboxSetting from "./CheckboxSetting";
import { BellRing, CaseSensitive } from "lucide-react";

const Wrapper = styled("div")`
  inline-size: 40rem;
  margin-inline: auto;
  max-inline-size: 100%;
  padding-block: 4rem;
  padding-inline: var(--layout-padding-x);
`;

const H1 = styled("h1")`
  margin-block-end: 4rem;
  text-align: center;
`;

const H2 = styled("h2")`
  font-size: 1.125rem;
  font-weight: 500;
  margin-block-end: 1em;
  margin-block-start: 5em;
  .lucide {
    block-size: 1em;
    color: var(--discord-white);
    display: inline-block;
    inline-size: auto;
    margin-inline-end: 0.5em;
    opacity: 55%;
    vertical-align: middle;
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
      <H1>Settings</H1>

      <H2>
        <BellRing />
        Notification sounds
      </H2>
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

      <H2>
        <CaseSensitive />
        Webfonts
      </H2>
      <Form>
        <CheckboxSetting
          label="Use webfonts"
          description="Uncheck to use system fonts"
        />
      </Form>
    </Wrapper>
  );
}
