"use client";

import { styled } from "@mui/material";
import { BellRing, CaseSensitive } from "lucide-react";
import CheckboxSetting from "./CheckboxSetting";
import useLocalStorage from "./useLocalStorage";

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

function SoundEffectsSetting() {
  const [value, setValue] = useLocalStorage("sound-fx");
  return (
    <CheckboxSetting
      checked={value}
      description="Play sound effects as you interact with a canvas"
      label="Sound effects"
      name="sound-fx"
      onChange={(e) => setValue(e.target.checked)}
    />
  );
}

function CooldownExpiryJingleSetting() {
  const [value, setValue] = useLocalStorage("cooldown-jingle");
  return (
    <CheckboxSetting
      checked={value}
      description="Play a sound when you can place another pixel"
      label="Cooldown expiry jingle"
      name="cooldown-jingle"
      onChange={(e) => setValue(e.target.checked)}
    />
  );
}

function WebfontsSetting() {
  const [value, setValue] = useLocalStorage("webfonts");
  return (
    <CheckboxSetting
      checked={value}
      description="Uncheck to use system fonts"
      label="Use webfonts"
      name="webfonts"
      onChange={(e) => setValue(e.target.checked)}
    />
  );
}

export default function Settings() {
  return (
    <Wrapper>
      <H1>Settings</H1>

      <H2>
        <BellRing />
        Notification sounds
      </H2>
      <Form>
        <SoundEffectsSetting />
        <CooldownExpiryJingleSetting />
      </Form>

      <H2>
        <CaseSensitive />
        Webfonts
      </H2>
      <Form>
        <WebfontsSetting />
      </Form>
    </Wrapper>
  );
}
