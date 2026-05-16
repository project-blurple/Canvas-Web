export const durationFormatNarrow =
  "DurationFormat" in Intl ?
    new Intl.DurationFormat("en-US", { style: "narrow" })
  : undefined;
