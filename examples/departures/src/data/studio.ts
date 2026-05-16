export const studio = {
  callsign: "T7",
  name: "TOWER 7",
  subtitle: "DESIGN & ENGINEERING",
  base: "41.978°N 087.904°W",
  baseLabel: "ORD / CHICAGO",
  established: "MMXIX",
  fleet: 12,
  email: "tower@t7.studio",
  manifest: [
    "Brand systems",
    "Editorial product",
    "Data visualization",
    "Wayfinding",
    "Type design",
  ],
  // Local clock label — purely cosmetic; real time is drawn client-side.
  timezone: "CST",
} as const;

export type StudioVitals = typeof studio;
