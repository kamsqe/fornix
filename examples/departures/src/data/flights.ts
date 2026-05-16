// Each "flight" is a project / case study.
// Columns mirror an actual departure board:
//   FLIGHT     — internal project code (becomes the URL slug)
//   DESTINATION — the project name, shown in big amber type
//   GATE       — discipline tag
//   TIME       — the year of work, formatted as HH:MM for board-feel
//   STATUS     — call to action: BOARDING (in production), ON TIME (shipped),
//                DEPARTED (archived), DELAYED (paused / NDA)
//   REMARKS    — one-line summary, shown on the case-study page
//   CLIENT, ROLE, YEAR, DURATION — case-study metadata

export type FlightStatus = "BOARDING" | "ON TIME" | "DEPARTED" | "DELAYED";

export interface Flight {
  code: string;
  destination: string;
  gate: string;
  time: string;
  status: FlightStatus;
  remarks: string;
  client: string;
  role: string;
  year: string;
  duration: string;
  // Long-form body, plain paragraphs. No headings — the board IS the structure.
  body: string[];
}

export const flights: Flight[] = [
  {
    code: "T7 0421",
    destination: "SIGNAL",
    gate: "A12",
    time: "21:00",
    status: "BOARDING",
    remarks: "Real-time freight visibility for a North-Atlantic shipping line.",
    client: "Nordstern Maritime",
    role: "Product design, front-end engineering",
    year: "2025—",
    duration: "ongoing",
    body: [
      "Nordstern moves 14% of containerised goods between Rotterdam and the eastern seaboard. Their controllers worked from three different vendor dashboards stitched together with a private Slack channel. We replaced all three.",
      "The system reads from the same AIS feed coastguards use, plus a thin layer of internal manifest data. Controllers see a single screen: vessels as points, lanes as paths, weather as a low-contrast underlay. Anomalies surface as amber pings; everything else stays quiet. The UI is designed to be glanced at, not stared at.",
      "Shipped to controllers in Rotterdam and Norfolk. Currently rolling out to a third operations centre in Halifax.",
    ],
  },
  {
    code: "T7 0307",
    destination: "CARBON",
    gate: "B04",
    time: "07:15",
    status: "ON TIME",
    remarks: "Identity and product UI for a carbon-accounting platform.",
    client: "Klimacta",
    role: "Identity, illustration, product UI",
    year: "2024",
    duration: "11 weeks",
    body: [
      "Klimacta sells carbon accounting to firms whose carbon accounting is mostly being yelled at by regulators. The brief was unglamorous: make the math feel like math, not like marketing.",
      "We built the identity around a single mark — a measured baseline with a tick — and a numeric system that treats every figure as evidence. The product UI removed the dashboard sparkles common in this category. No green badges, no celebratory copy. Just receipts.",
      "Klimacta closed their Series B six months after launch. Their customers cite the product as the reason they renewed.",
    ],
  },
  {
    code: "T7 0188",
    destination: "MERIDIAN",
    gate: "C22",
    time: "18:45",
    status: "DEPARTED",
    remarks: "Wayfinding for a 2.4M sq ft regional hospital.",
    client: "Mass General — Brigham",
    role: "Wayfinding system, signage typography",
    year: "2023",
    duration: "18 months",
    body: [
      "Patients arriving at Brigham's main campus walked an average of 11 minutes to reach an appointment from the wrong entrance. The hospital wanted that figure under four.",
      "We started with the floor plan and worked outward. A new colour-coded zoning system replaced the old department-by-department signage. Sightlines were audited at 72 decision points; signs were placed to be readable from 18 metres on the eye-line of a 1.4m wheelchair user.",
      "Twelve months after rollout, the average walk-time was 3:42. The hospital extended the system to two satellite campuses.",
    ],
  },
  {
    code: "T7 0512",
    destination: "HEXA",
    gate: "D08",
    time: "05:50",
    status: "BOARDING",
    remarks: "A typeface for low-light cockpit displays.",
    client: "Internal / for licence",
    role: "Type design, hinting, OpenType engineering",
    year: "2025",
    duration: "14 months",
    body: [
      "Cockpit type has not been seriously rethought since the 1970s. Most still ships in proprietary bitmaps or hinted versions of Helvetica that fall apart at small sizes on amber CRTs.",
      "HEXA is a six-style monospace designed for emissive amber, white, and red on dark substrates. The terminals are clipped to reduce halation; the 0 and O diverge clearly; the 1 and l are unambiguous from 9 metres at 6pt.",
      "Currently in pre-licensing with two avionics OEMs. A public retail cut ships in late 2026.",
    ],
  },
  {
    code: "T7 0099",
    destination: "STILLWATER",
    gate: "A03",
    time: "09:30",
    status: "ON TIME",
    remarks: "Brand identity and site for a Hebridean whisky distillery.",
    client: "Stillwater Distilling Co.",
    role: "Identity, packaging, web",
    year: "2024",
    duration: "8 weeks",
    body: [
      "Stillwater wanted to look like a whisky that had been there for 120 years. It had been there for two.",
      "We treated the work like restoration rather than branding. The mark is set in a recut of a 1890s gazetteer face from the Scottish Records Office; the labels are letterpressed on a Heidelberg cylinder in Edinburgh; the bottle is a re-tooled apothecary mould. The website is one page, set in the same gazetteer face, and weighs less than a single bottle photograph would.",
      "Stillwater sold out their first 600-bottle run in 11 days.",
    ],
  },
  {
    code: "T7 0237",
    destination: "NOCTURNE",
    gate: "C17",
    time: "23:20",
    status: "DELAYED",
    remarks: "A circadian music client. Currently under NDA.",
    client: "—",
    role: "—",
    year: "2025—",
    duration: "—",
    body: [
      "We cannot say much. The product is in private beta with a partner who has not yet announced. The interesting design problem: a music player that knows what time it is, what time you sleep, and is allowed to lie to you about both.",
      "Status: DELAYED on the board because we are. A redesign of the queue UI is the current sticking point.",
    ],
  },
  {
    code: "T7 0061",
    destination: "VENT",
    gate: "B19",
    time: "06:10",
    status: "DEPARTED",
    remarks: "HVAC controls for a German cleanroom manufacturer.",
    client: "Trauberg Kältetechnik",
    role: "Industrial UI, control logic, hardware liaison",
    year: "2022",
    duration: "9 months",
    body: [
      "Trauberg's controllers ran on a Windows CE panel from 2007. The replacement had to feel familiar to the 50-year-old technicians who could run the old one with their eyes closed.",
      "We kept the keystroke shortcuts. We kept the audible click. We threw out 18 nested screens and replaced them with three. Diagnostics moved from a 47-page PDF to two QR codes printed inside the panel door.",
      "Service-call duration dropped 38% in the first year.",
    ],
  },
  {
    code: "T7 0444",
    destination: "CRAWL",
    gate: "D02",
    time: "04:44",
    status: "ON TIME",
    remarks: "A privacy-respecting analytics product. No cookies, no fingerprints.",
    client: "Crawl, Inc.",
    role: "Identity, product design, marketing site",
    year: "2024",
    duration: "5 weeks",
    body: [
      "The analytics market has roughly four hundred competitors and most of them look identical. The differentiator we found wasn't features — it was tone. Crawl is the only one that admits, in writing, what it cannot measure.",
      "We designed a product that shows you uncertainty intervals on every metric. The marketing site is a single long page; the demo dashboard runs on the same domain, with the same data, as proof.",
      "Crawl has 4,200 paying customers and is profitable.",
    ],
  },
];

// Helper for the page route.
export const flightBySlug = (slug: string) =>
  flights.find((f) => f.code.replace(/\s+/g, "-").toLowerCase() === slug);

export const flightSlug = (code: string) =>
  code.replace(/\s+/g, "-").toLowerCase();
