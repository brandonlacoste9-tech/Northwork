export const PROVINCES = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
] as const;

export type Province = (typeof PROVINCES)[number];

export const REMOTE_IN_CANADA = "Remote in Canada";

export type WorkLocation = Province | typeof REMOTE_IN_CANADA;

export const SKILLS = [
  "Accessibility",
  "Brand identity",
  "Copywriting",
  "Data analysis",
  "DevOps",
  "Frontend engineering",
  "Full-stack engineering",
  "Illustration",
  "iOS development",
  "Marketing",
  "Motion design",
  "Photography",
  "Product design",
  "Security",
  "Translation",
  "UX research",
] as const;

export const RATE_BANDS = [
  { id: "any", label: "Any rate" },
  { id: "under-100", label: "Under $100 CAD/hr" },
  { id: "100-140", label: "$100–$140 CAD/hr" },
  { id: "140-170", label: "$140–$170 CAD/hr" },
  { id: "170-plus", label: "$170 CAD/hr and up" },
] as const;

export type RateBand = (typeof RATE_BANDS)[number]["id"];

export type Availability =
  | "Available this week"
  | "Booking in two weeks"
  | "Limited";

export type Freelancer = {
  id: string;
  name: string;
  role: string;
  city: string;
  province: Province;
  skills: string[];
  hourlyRate: number;
  availability: Availability;
  bio: string;
  sampleWork: { title: string; summary: string }[];
};

export type Job = {
  id: string;
  title: string;
  description: string[];
  budgetMin: number;
  budgetMax: number;
  location: WorkLocation;
  skills: string[];
  postedAt: number;
  postedLabel: string;
  client: string;
  postedLocally?: boolean;
};

const posted = Date.parse("2026-09-25T12:00:00-04:00");
const hour = 60 * 60 * 1000;

export const freelancers: Freelancer[] = [
  {
    id: "amelie-gagnon",
    name: "Amélie Gagnon",
    role: "Product designer",
    city: "Montréal",
    province: "Quebec",
    skills: ["Product design", "UX research", "Accessibility"],
    hourlyRate: 145,
    availability: "Available this week",
    bio: "Amélie designs member tools for credit unions, clinics, and cultural venues that have to work in French and English. She prototypes in the open with the people who will actually use the service, then stays through the first release to fix the awkward parts.",
    sampleWork: [
      {
        title: "Branch appointment flow",
        summary:
          "Cut the steps to book a credit-union appointment in half for a Montréal mutual.",
      },
      {
        title: "Gallery membership site",
        summary:
          "Rebuilt ticketing and membership for a Plateau arts centre, with a screen-reader pass before launch.",
      },
    ],
  },
  {
    id: "jordan-okonkwo",
    name: "Jordan Okonkwo",
    role: "Full-stack engineer",
    city: "Toronto",
    province: "Ontario",
    skills: ["Full-stack engineering", "Frontend engineering"],
    hourlyRate: 165,
    availability: "Booking in two weeks",
    bio: "Jordan builds web apps for Ontario professional associations and mid-size retailers that have outgrown a spreadsheet. He prefers boring, well-tested stacks and leaves the repo in a state the client's next hire can run.",
    sampleWork: [
      {
        title: "Licence renewal portal",
        summary:
          "Replaced a fax-and-PDF renewal process for a provincial professional college.",
      },
      {
        title: "Wholesale order desk",
        summary:
          "Shipped an order tool for a Toronto food distributor and their grocery accounts.",
      },
    ],
  },
  {
    id: "priya-sandhu",
    name: "Priya Sandhu",
    role: "Brand strategist",
    city: "Vancouver",
    province: "British Columbia",
    skills: ["Brand identity", "Marketing"],
    hourlyRate: 130,
    availability: "Available this week",
    bio: "Priya names and positions consumer brands that sell across the country without pretending to be from somewhere else. Her work usually starts with the founder's actual customers in B.C. and ends with a system a small team can keep using.",
    sampleWork: [
      {
        title: "Coastal tea company",
        summary:
          "Repositioned a Victoria-born tea brand for grocery shelves in Western Canada.",
      },
      {
        title: "Housing nonprofit identity",
        summary:
          "Built a calmer public identity for a Vancouver community land trust.",
      },
    ],
  },
  {
    id: "noah-macleod",
    name: "Noah MacLeod",
    role: "Motion designer",
    city: "Halifax",
    province: "Nova Scotia",
    skills: ["Motion design", "Brand identity"],
    hourlyRate: 110,
    availability: "Available this week",
    bio: "Noah makes short films and title sequences for Atlantic tourism boards, festivals, and product launches. He shoots when the budget allows and designs the rest so it still feels like the place, not a stock coastline.",
    sampleWork: [
      {
        title: "Ferry season opener",
        summary:
          "A 45-second film for a provincial ferry campaign that ran on regional television.",
      },
      {
        title: "Festival titles",
        summary:
          "Opening titles and social cuts for a Halifax documentary festival.",
      },
    ],
  },
  {
    id: "camille-bergeron",
    name: "Camille Bergeron",
    role: "UX researcher",
    city: "Quebec City",
    province: "Quebec",
    skills: ["UX research", "Product design"],
    hourlyRate: 125,
    availability: "Limited",
    bio: "Camille interviews public-sector staff and the residents they serve, then turns the recordings into decisions a product team can schedule. She works in French and English and writes findings the deputy minister and the developer can both use.",
    sampleWork: [
      {
        title: "Permit counter study",
        summary:
          "Sat with clerks and applicants at a municipal permit desk and mapped where the form failed.",
      },
      {
        title: "Transit wayfinding",
        summary:
          "Tested a new bus-map legend with riders in Quebec City before the print run.",
      },
    ],
  },
  {
    id: "ethan-chen",
    name: "Ethan Chen",
    role: "Data analyst",
    city: "Calgary",
    province: "Alberta",
    skills: ["Data analysis", "Frontend engineering"],
    hourlyRate: 140,
    availability: "Available this week",
    bio: "Ethan builds dashboards for energy-services firms, municipalities, and clinics that are tired of exporting CSV files every Monday. He models the data, then ships a page the operator can filter without calling him.",
    sampleWork: [
      {
        title: "Service-call dashboard",
        summary:
          "A weekly view of field calls for an Alberta equipment company and its regional leads.",
      },
      {
        title: "Clinic no-show report",
        summary:
          "Showed a Calgary clinic which appointment types were slipping, by weekday and site.",
      },
    ],
  },
  {
    id: "sofia-alvarez",
    name: "Sofia Alvarez",
    role: "Copywriter",
    city: "Ottawa",
    province: "Ontario",
    skills: ["Copywriting", "Marketing"],
    hourlyRate: 95,
    availability: "Available this week",
    bio: "Sofia writes plain-language campaigns for federal suppliers, museums, and member associations. She is careful with claims, bilingual review cycles, and the difference between a slogan and a sentence someone can act on.",
    sampleWork: [
      {
        title: "Museum membership drive",
        summary:
          "A three-email series that explained what a national museum membership actually pays for.",
      },
      {
        title: "Benefits booklet",
        summary:
          "Rewrote a staff benefits guide so new hires could finish it on a lunch break.",
      },
    ],
  },
  {
    id: "malik-hassan",
    name: "Malik Hassan",
    role: "DevOps engineer",
    city: "Edmonton",
    province: "Alberta",
    skills: ["DevOps", "Security"],
    hourlyRate: 155,
    availability: "Booking in two weeks",
    bio: "Malik sets up calm deployment pipelines for teams that have a product and a single overworked founder doing releases from a laptop. He documents the path to production and the rollback, then leaves.",
    sampleWork: [
      {
        title: "Release pipeline",
        summary:
          "Moved a logistics startup off manual deploys and onto a reviewed pipeline with staging.",
      },
      {
        title: "Access cleanup",
        summary:
          "Reduced standing production access for an Edmonton software shop and wrote the on-call notes.",
      },
    ],
  },
  {
    id: "hannah-reid",
    name: "Hannah Reid",
    role: "Illustrator",
    city: "Winnipeg",
    province: "Manitoba",
    skills: ["Illustration", "Brand identity"],
    hourlyRate: 85,
    availability: "Available this week",
    bio: "Hannah draws for prairie publishers, food brands, and annual reports that need a human hand instead of another stock photograph. She delivers print-ready files and a small set of spot illustrations teams can reuse.",
    sampleWork: [
      {
        title: "Co-op cookbook",
        summary:
          "Chapter openers and ingredient drawings for a Manitoba food co-op.",
      },
      {
        title: "Arts annual report",
        summary:
          "A cover and six scenes for a Winnipeg theatre company's year in review.",
      },
    ],
  },
  {
    id: "luca-moretti",
    name: "Luca Moretti",
    role: "Frontend engineer",
    city: "Victoria",
    province: "British Columbia",
    skills: ["Frontend engineering", "Accessibility"],
    hourlyRate: 150,
    availability: "Available this week",
    bio: "Luca builds interfaces that stay fast on older laptops and pass an accessibility check before they are called done. Most of his clients are public agencies and B.C. companies replacing a site that was hard to use on a phone.",
    sampleWork: [
      {
        title: "Parks reservation UI",
        summary:
          "Rebuilt a campsite booking flow so it worked with a keyboard and a spotty connection.",
      },
      {
        title: "Municipal newsroom",
        summary:
          "A readable news template for a capital-region city site, with bilingual toggles left intact.",
      },
    ],
  },
  {
    id: "owen-fraser",
    name: "Owen Fraser",
    role: "iOS developer",
    city: "Saskatoon",
    province: "Saskatchewan",
    skills: ["iOS development", "Product design"],
    hourlyRate: 145,
    availability: "Limited",
    bio: "Owen ships iPhone apps for prairie co-ops, field crews, and local services that need to work offline in a truck. He designs the small screen himself when the client does not have a product designer on staff.",
    sampleWork: [
      {
        title: "Field inspection app",
        summary:
          "An offline checklist for grain-elevator inspectors, synced when they reached the yard office.",
      },
      {
        title: "Tool library pilot",
        summary:
          "A borrow-and-return app tested with a Saskatoon neighbourhood workshop.",
      },
    ],
  },
  {
    id: "nadia-belanger",
    name: "Nadia Bélanger",
    role: "French-English translator",
    city: "Moncton",
    province: "New Brunswick",
    skills: ["Translation", "Copywriting"],
    hourlyRate: 80,
    availability: "Available this week",
    bio: "Nadia translates campaigns, product copy, and public notices between French and English for Atlantic organizations. She flags sentences that are technically correct and still wrong for New Brunswick readers.",
    sampleWork: [
      {
        title: "Bilingual harvest ads",
        summary:
          "French and English versions of a fall campaign for a regional food brand.",
      },
      {
        title: "Clinic notices",
        summary:
          "Patient letters for a Moncton clinic, checked against the terms the nurses already use.",
      },
    ],
  },
  {
    id: "theo-nguyen",
    name: "Théo Nguyen",
    role: "Security consultant",
    city: "Waterloo",
    province: "Ontario",
    skills: ["Security", "DevOps"],
    hourlyRate: 175,
    availability: "Booking in two weeks",
    bio: "Théo reviews web apps for Canadian companies before a launch or a procurement questionnaire. He writes findings a developer can fix, ranked by what an actual attacker would try first, not by a generic checklist.",
    sampleWork: [
      {
        title: "Pre-launch review",
        summary:
          "A focused review of a member portal, with fixes merged before the public opening.",
      },
      {
        title: "Vendor questionnaire",
        summary:
          "Helped a Waterloo software team answer a hospital client's security questions without bluffing.",
      },
    ],
  },
  {
    id: "grace-kim",
    name: "Grace Kim",
    role: "Product lead",
    city: "St. John's",
    province: "Newfoundland and Labrador",
    skills: ["Product design", "Marketing"],
    hourlyRate: 160,
    availability: "Available this week",
    bio: "Grace helps Atlantic founders decide what to build next and how to explain it. She has run discovery for fisheries software, tourism bookings, and a design festival that needed a membership site before the posters went up.",
    sampleWork: [
      {
        title: "Wharf software scope",
        summary:
          "Turned a year of harbour interviews into a six-month build plan a local team could staff.",
      },
      {
        title: "Festival membership",
        summary:
          "Defined the offer and the pages for a St. John's design week membership.",
      },
    ],
  },
  {
    id: "samuel-tremblay",
    name: "Samuel Tremblay",
    role: "Photographer",
    city: "Whitehorse",
    province: "Yukon",
    skills: ["Photography", "Motion design"],
    hourlyRate: 100,
    availability: "Limited",
    bio: "Samuel photographs places, crews, and small manufacturers across the North, then cuts short motion pieces when a still will not carry the story. He plans around weather and the cost of getting there.",
    sampleWork: [
      {
        title: "Outfitter lookbook",
        summary:
          "A season of location photographs for a Yukon guiding company.",
      },
      {
        title: "Route film stills",
        summary:
          "Stills and a one-minute cut for a territorial travel board.",
      },
    ],
  },
  {
    id: "leah-nitsiza",
    name: "Leah Nitsiza",
    role: "Community researcher",
    city: "Yellowknife",
    province: "Northwest Territories",
    skills: ["UX research", "Copywriting"],
    hourlyRate: 115,
    availability: "Available this week",
    bio: "Leah runs interviews and workshops for services meant to be used in the Northwest Territories, not adapted from a southern template after the fact. She writes what she heard in language the community and the agency can both stand behind.",
    sampleWork: [
      {
        title: "Housing intake interviews",
        summary:
          "Spoke with applicants and case workers about a form that was failing in person.",
      },
      {
        title: "Service guide",
        summary:
          "Rewrote a public service guide after testing it with readers in Yellowknife.",
      },
    ],
  },
  {
    id: "aisha-rahman",
    name: "Aisha Rahman",
    role: "Marketing lead",
    city: "Charlottetown",
    province: "Prince Edward Island",
    skills: ["Marketing", "Copywriting"],
    hourlyRate: 120,
    availability: "Available this week",
    bio: "Aisha plans seasonal campaigns for Island food producers, inns, and cultural groups that sell to visitors and to people who live there year-round. She is skeptical of national media plans that forget the ferry schedule.",
    sampleWork: [
      {
        title: "Shoulder-season inn campaign",
        summary:
          "A spring campaign aimed at Atlantic weekenders, not only July visitors.",
      },
      {
        title: "Producer co-op launch",
        summary:
          "Named the offer and wrote the first ads for a P.E.I. food co-op's city accounts.",
      },
    ],
  },
];

export const seedJobs: Job[] = [
  {
    id: "river-pine-portal",
    title: "Redesign the member portal for a credit union",
    description: [
      "River & Pine Credit Union needs a calmer way for members to book appointments, check a balance summary, and update an address. The current portal was built a decade ago and fails basic checks on a phone.",
      "The team is in Toronto and wants a designer and a frontend engineer who have shipped something for a regulated Canadian financial shop. French is a plus, not a requirement. The work stays with a Canadian contractor.",
    ],
    budgetMin: 18000,
    budgetMax: 28000,
    location: "Ontario",
    skills: ["Product design", "Frontend engineering", "Accessibility"],
    postedAt: posted - 6 * hour,
    postedLabel: "6 hours ago",
    client: "River & Pine Credit Union",
  },
  {
    id: "prairie-harvest",
    title: "Bilingual campaign for a prairie grain co-op",
    description: [
      "A Saskatchewan and Manitoba grain co-op is preparing its fall member campaign in English and French. They need a writer and a translator who can keep the offer specific: delivery windows, varieties, and the phone number that actually gets answered.",
      "The team will review from Regina and Winnipeg. The contractor can work anywhere in Canada. Stock rural imagery is not welcome.",
    ],
    budgetMin: 8000,
    budgetMax: 12000,
    location: REMOTE_IN_CANADA,
    skills: ["Copywriting", "Translation", "Marketing"],
    postedAt: posted - 26 * hour,
    postedLabel: "1 day ago",
    client: "Prairie Grain Co-operative",
  },
  {
    id: "cape-fir-shop",
    title: "Storefront for an Atlantic outfitter",
    description: [
      "Cape & Fir sells outerwear and repair services from a shop in Halifax and wants the online store to match the counter: clear sizes, real repair times, and no carousel. They have product photographs. They need the store built and the type set.",
      "Budget covers theme work, a simple content model, and a week of fixes after launch. The person should be able to join a call in the Atlantic time zone.",
    ],
    budgetMin: 6500,
    budgetMax: 9000,
    location: "Nova Scotia",
    skills: ["Frontend engineering", "Brand identity"],
    postedAt: posted - 50 * hour,
    postedLabel: "2 days ago",
    client: "Cape & Fir Outfitters",
  },
  {
    id: "northbank-housing",
    title: "Housing waitlist dashboard for a municipal office",
    description: [
      "Northbank Housing Office in Edmonton tracks applications in three spreadsheets. Staff need one dashboard: where a file sits, how long it has waited, and which buildings have a vacant unit this week.",
      "The data is sensitive. The contractor must be prepared to work under the city's existing access rules. No offshore subcontracting.",
    ],
    budgetMin: 22000,
    budgetMax: 32000,
    location: "Alberta",
    skills: ["Data analysis", "Frontend engineering"],
    postedAt: posted - 4 * hour,
    postedLabel: "4 hours ago",
    client: "Northbank Housing Office",
  },
  {
    id: "yukon-routes",
    title: "Short brand film for a Yukon travel board",
    description: [
      "Yukon Routes needs a one-minute film and a set of stills for the winter shoulder season. The story is roadhouses, repair shops, and the people who keep them open, not a drone shot of a highway.",
      "Travel inside the territory is part of the budget. The editor can finish the cut from anywhere in Canada after the shoot.",
    ],
    budgetMin: 14000,
    budgetMax: 20000,
    location: "Yukon",
    skills: ["Motion design", "Photography"],
    postedAt: posted - 72 * hour,
    postedLabel: "3 days ago",
    client: "Yukon Routes",
  },
  {
    id: "island-access",
    title: "Accessibility audit of a health information site",
    description: [
      "Island Health Cooperative in Victoria is republishing patient information and wants an audit before the pages go live. They need findings tied to specific templates, not a generic score.",
      "The reviewer should be able to test with a keyboard and a screen reader and to explain the fixes to a small in-house team. The site is English only.",
    ],
    budgetMin: 9000,
    budgetMax: 12000,
    location: "British Columbia",
    skills: ["Accessibility", "UX research"],
    postedAt: posted - 8 * hour,
    postedLabel: "8 hours ago",
    client: "Island Health Cooperative",
  },
  {
    id: "mile-end-tools",
    title: "iOS app for a neighbourhood tool library",
    description: [
      "The Mile End Tool Library lends tools to members and currently tracks loans in a notebook. They want an iPhone app for volunteers at the desk and a simple view for members checking what is out.",
      "The library can host the developer in Montréal for the first workshop. The rest of the build can be remote inside Canada. Budget includes a small design pass.",
    ],
    budgetMin: 30000,
    budgetMax: 45000,
    location: "Quebec",
    skills: ["iOS development", "Product design"],
    postedAt: posted - 120 * hour,
    postedLabel: "5 days ago",
    client: "Mile End Tool Library",
  },
  {
    id: "red-river-report",
    title: "Illustrated annual report for an arts non-profit",
    description: [
      "Red River Arts needs a 16-page year in review: a cover, six illustrations, and a layout that a board member can read on a phone. The numbers are ready. The voice is not corporate.",
      "The illustrator or designer should be comfortable with a Winnipeg arts audience and a tight print deadline in November.",
    ],
    budgetMin: 4500,
    budgetMax: 7000,
    location: "Manitoba",
    skills: ["Illustration", "Brand identity"],
    postedAt: posted - 30 * hour,
    postedLabel: "1 day ago",
    client: "Red River Arts",
  },
];

export function getFreelancer(id: string) {
  return freelancers.find((person) => person.id === id);
}

export function getSeedJob(id: string) {
  return seedJobs.find((job) => job.id === id);
}

export function matchesRate(rate: number, band: string) {
  if (band === "under-100") return rate < 100;
  if (band === "100-140") return rate >= 100 && rate < 140;
  if (band === "140-170") return rate >= 140 && rate < 170;
  if (band === "170-plus") return rate >= 170;
  return true;
}

export function filterFreelancers(
  people: Freelancer[],
  filters: { search: string; province: string; skill: string; rate: string },
) {
  const needle = filters.search.trim().toLowerCase();
  return people.filter((person) => {
    if (filters.province !== "all" && person.province !== filters.province) {
      return false;
    }
    if (filters.skill !== "all" && !person.skills.includes(filters.skill)) {
      return false;
    }
    if (!matchesRate(person.hourlyRate, filters.rate)) return false;
    if (!needle) return true;
    const haystack = [person.name, ...person.skills].join(" ").toLowerCase();
    return haystack.includes(needle);
  });
}

export function filterJobs(
  jobs: Job[],
  filters: { search: string; location: string },
) {
  const needle = filters.search.trim().toLowerCase();
  return jobs.filter((job) => {
    if (filters.location !== "all" && job.location !== filters.location) {
      return false;
    }
    if (!needle) return true;
    const haystack = [job.title, job.client, ...job.skills]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
