export const palette = {
  navy: "#16324F",
  teal: "#1F7A6A",
  sand: "#E8D9B6",
  coral: "#C45C4A",
  mist: "#F4F1EA",
  ink: "#1A1F24",
  muted: "#66707A",
  white: "#FFFFFF",
  darkBg: "#101418",
  darkCard: "#1B222A",
  darkText: "#F3F1EC",
};

export function colors(dark: boolean) {
  return {
    bg: dark ? palette.darkBg : palette.mist,
    card: dark ? palette.darkCard : palette.white,
    text: dark ? palette.darkText : palette.ink,
    muted: dark ? "#9AA3AB" : palette.muted,
    accent: palette.teal,
    danger: palette.coral,
    navy: dark ? "#9BB6D4" : palette.navy,
    border: dark ? "#2A333C" : "#E2DED4",
    empty: dark ? "#24303A" : "#EEE8DC",
  };
}
