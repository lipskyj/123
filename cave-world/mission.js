// The mission that turns the cave into a simulation: a reason to investigate, a mentor who reacts to what you do,
// a decision with consequences, and a debrief built from your own record. Characters and finds are fictional.

export const MENTOR = { name: "Dr. Ama Reyes", role: "field lead, on the radio from the entrance" };

export const BRIEF = {
  title: "The council's question",
  lines: [
    "The regional council meets next month to decide what happens to this cave. A tour company wants to open it to visitors. The council will follow your field report.",
    "Your job: investigate the chamber like a professional, using the right tool and the right technique each time. Then recommend what should happen, backed by what you found.",
    "I'll be on the radio. I can see your instrument log, so I'll know how careful you are.",
  ],
};

// Activation of prior knowledge. Not graded; compared with what you find.
export const PRIOR = {
  q: "Before you go in: what do you think the long spikes hanging from cave ceilings are made of?",
  options: ["Ice that never melts down there", "Mineral left behind by dripping water", "Rock that a river carved into points"],
  correct: 1, linkedFind: "stalactite",
};

// What each find contributes to the report. Tags: fragile, life, archaeology, safety, age.
export const EVIDENCE = {
  stalagmite: { line: "The tallest stalagmite is about 2 m: roughly 20,000 years of growth. A broken tip would not regrow for thousands of years.", tags: ["fragile", "age"] },
  stalactite: { line: "Stalactites grow from drips, starting as hollow straws. Touching or breaking them stops growth for good.", tags: ["fragile"] },
  skylight: { line: "The skylight is a roof collapse with jagged edges: loose rock can still fall near it.", tags: ["safety"] },
  column: { line: "The column records seasonal growth bands; it is the chamber's best climate archive.", tags: ["fragile", "age"] },
  pool: { line: "The pool holds blind, colourless animals found only in caves, and calcite rafts that break if the water is disturbed.", tags: ["life", "fragile"] },
  glow: { line: "Algae already grow where light reaches. Visitor lamps would spread this green growth over the formations.", tags: ["life", "fragile"] },
  limestone: { line: "The walls are limestone: weak acid dissolves them, which is how the cave formed.", tags: ["age"] },
  boulder: { line: "A foreign boulder shows floods once poured through the tunnel. A flood could happen again.", tags: ["safety"] },
  loose: { line: "Fresh rock is fine lime mud from an old sea floor, with calcite veins.", tags: ["age"] },
  chert: { line: "The tunnel floor has chert, the stone people used for tools.", tags: ["archaeology"] },
  fossil: { line: "The walls are full of crinoid fossils: the rock formed on an ancient sea floor.", tags: ["age"] },
  hearth: { line: "There is an intact ancient hearth with a chert blade lying in the charcoal: an undisturbed archaeological layer.", tags: ["archaeology", "fragile"] },
  bones: { line: "A cave bear tooth lies sealed under flowstone, which can date it. The floor is a fossil site.", tags: ["archaeology", "fragile"] },
};

// Plain names used in sentences ("the limestone wall").
export const NAMES = { stalagmite: "stalagmites", stalactite: "stalactites", skylight: "skylight", column: "column", pool: "pool", glow: "green wall patches", limestone: "limestone wall", boulder: "dark boulder", loose: "loose rock", chert: "chert lump", fossil: "fossil wall", hearth: "hearth", bones: "bear tooth" };

export const OPTIONS = [
  { id: "open", label: "Open the cave freely to visitors", supportedBy: [], contradictedBy: ["fragile", "life", "archaeology", "safety"] },
  { id: "guided", label: "Open with guided tours only: fixed paths, protected zones, dim lighting", supportedBy: ["fragile", "life", "safety"], contradictedBy: ["archaeology"] },
  { id: "closed", label: "Keep it closed for research and conservation for now", supportedBy: ["archaeology", "life", "fragile"], contradictedBy: [] },
];
export const TAG_NAMES = { fragile: "fragile formations", life: "living things", archaeology: "archaeology", safety: "safety risks", age: "the cave's age and origin" };

// Places where using the wrong tool damages the site.
export const DAMAGE_TOOLS = { hammer: ["fragile", "archaeology", "life"], brush: ["fragile", "life"], acid: ["life", "archaeology"] };

export const RADIO = {
  start: "Reyes here. Take your time. Look before you touch anything, and tell me what you find.",
  damage: (find, tool) => `Stop! You just used the ${tool} on the ${find}. That can't be undone, and it goes in your report to the council.`,
  goggles: "I saw that strike without goggles. Goggles go on before every blow, no exceptions.",
  sloppy: (find) => `That ${find} work was rough. A careful technique is half of what makes a result trustworthy.`,
  firstTry: (find) => `Good reasoning on the ${find}. That's exactly what the evidence says.`,
  secondTry: (find) => `You got to the ${find} answer in the end. Remember which clue settled it.`,
  struggling: "Tip: two interpretations in a row needed hints. Before you choose, read your observation again. The answer is in what you saw, not what you expected.",
  prior: (was, now) => `Before you came in you said they were "${was.toLowerCase()}". What you just saw says otherwise: ${now}`,
  priorRight: "You expected mineral from dripping water, and that's what you found. Nice.",
  ready: "You have enough evidence for a report. Press Report when you're ready, or keep exploring; more evidence makes a stronger case.",
};

export const TRANSFER = {
  q: "A different site: a sea cave on the coast that a company wants to use for kayak tours. Which three things would you check first, with which tools, and why?",
  model: "A strong answer covers: what the rock is (acid test, hand lens) and whether the roof is stable (survey, look for collapse); what is fragile or alive (lens, UV, the tide pools); and any sign of people or animals in the past (careful digging only by permit). It ties each check to a decision about visitors.",
};
