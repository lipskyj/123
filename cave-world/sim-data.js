// Simulator content: the hands-on part and the interpretation question for each find.
const sk = (body) => `<svg viewBox="0 0 200 120" fill="none" stroke="#e9f3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const yrs = (n) => Math.round(n).toLocaleString("en-US") + " years";

export const SIM = {
  stalagmite: {
    measure: { mode: "two", top: "tip of the tallest spike", expect: 2.1 },
    quiz: (r) => ({ q: `You measured ${r.height.toFixed(1)} m. Stalagmites here grow about 0.1 mm per year. Roughly how old is it?`,
      options: [yrs(r.height * 1000), yrs(r.height * 10000), yrs(r.height * 100000)], correct: 1,
      why: "Convert metres to millimetres (×1000), then divide by 0.1 mm per year." }),
  },
  skylight: {
    measure: { mode: "one", top: "rim of the opening", expect: 8.2 },
    quiz: { q: "The edges of the hole are jagged broken rock. What made the skylight?",
      options: ["Water slowly dissolved a round hole", "The roof lost support and collapsed", "People dug it as an entrance"], correct: 1,
      why: "Dissolving leaves smooth, rounded surfaces. Sharp broken edges mean rock fell." },
  },
  stalactite: {
    sketch: sk('<path d="M70 0 L92 78 Q100 92 108 78 L130 0" fill="rgba(200,170,120,.35)"/><path d="M96 20v52M104 20v52" stroke-dasharray="3 5" stroke-width="1.2"/><path d="M100 92q-7 10 0 16q7-6 0-16z" fill="rgba(140,220,255,.6)"/><circle cx="100" cy="88" r="9" stroke-width="1.2" stroke-dasharray="2 3"/>'),
    quiz: { q: "Why does the drip leave calcite behind at the tip?",
      options: ["The water freezes in the cold cave", "The water loses CO₂ to the cave air and can hold less calcite", "Dust in the air sticks to the wet tip"], correct: 1,
      why: "Caves like this stay above freezing. Think about what the water was carrying and why it must let go of it." },
  },
  pool: {
    sketch: sk('<path d="M0 30h200" stroke-dasharray="6 6"/><path d="M30 28l22-4 14 6-20 5zM120 26l26-3 10 6-24 4z" fill="rgba(255,255,255,.7)"/><path d="M70 78q14-14 34-8q14 4 24-2" /><path d="M76 78l-6 10M86 74l-4 12M96 71l-2 12M106 71l2 12M116 72l5 10"/><path d="M128 68q10-8 22-10M128 68q12-2 22 4"/><circle cx="72" cy="78" r="3"/>'),
    quiz: { q: "The animal has no eyes and no colour. Why?",
      options: ["It is sick from the mineral water", "In total darkness eyes and pigment are wasted energy, so they were lost over generations", "It is a baby and will grow them later"], correct: 1,
      why: "This is a healthy adult of a cave-only species. Think about what eyes cost and what they are worth in the dark." },
  },
  fossil: {
    sketch: sk('<g fill="rgba(240,230,200,.3)"><ellipse cx="50" cy="40" rx="16" ry="6"/><ellipse cx="50" cy="52" rx="16" ry="6"/><ellipse cx="50" cy="64" rx="16" ry="6"/><ellipse cx="50" cy="76" rx="16" ry="6"/><circle cx="120" cy="45" r="15"/><circle cx="120" cy="45" r="4"/></g><path d="M105 45h30M120 30v30M110 34l20 22M130 34l-20 22" stroke-width="1"/><path d="M150 90q20-26 40-4M156 92q14-16 28-2"/><path d="M20 104h160" stroke-dasharray="2 6"/>'),
    quiz: { q: "Crinoid stems and shell fragments are cemented in the wall. What was this rock originally?",
      options: ["Lava from a volcano", "Lime mud and skeletons on a shallow sea floor", "Sand from a desert dune"], correct: 1,
      why: "Crinoids are sea animals. Their remains can only pile up in one kind of place." },
  },
  column: {
    quiz: { q: "The calcite glows under UV and keeps glowing briefly afterwards. What causes it?",
      options: ["Radioactive minerals in the rock", "Traces of organic acids from the soil, trapped in the calcite", "Glowing bacteria on the surface"], correct: 1,
      why: "The glow needs the UV lamp to charge it, so nothing is producing light by itself. Think about what drip water carries down from the soil." },
  },
  glow: {
    quiz: { q: "Some patches flash bright green under UV; others stay dull and fuzzy. What are the dull fuzzy ones?",
      options: ["Algae and cyanobacteria growing where light reaches", "Copper ore", "Paint left by visitors"], correct: 0,
      why: "They sit where daylight from the skylight falls, and they look soft and fuzzy rather than crystalline." },
  },
  limestone: {
    fizz: true,
    quiz: { q: "The rock fizzes hard with dilute acid. Which mineral is reacting?",
      options: ["Quartz (SiO₂)", "Calcite (CaCO₃)", "Iron oxide (rust)"], correct: 1,
      why: "The gas is CO₂, so the mineral must contain carbonate." },
  },
  boulder: {
    fizz: false,
    quiz: { q: "This boulder does not fizz, but the walls do. What does that tell you?",
      options: ["The acid has gone off", "It is the same limestone, just dirtier", "It is a different rock, carried in from outside — probably by a flood"], correct: 2,
      why: "Your acid worked a moment ago on the wall. A different result on the same test means a different material." },
  },
  loose: {
    quiz: { q: "Why break a loose rock instead of just looking at its surface?",
      options: ["Weathered surfaces hide the true colour and grain; a fresh face shows them", "To check how hard you can hit", "Because broken rock is easier to carry"], correct: 0,
      why: "Compare the dull outer skin with the clean interior you just exposed." },
  },
  chert: {
    quiz: { q: "The lump broke with a smooth, curved, shell-like surface and a sharp edge. What is that kind of break called?",
      options: ["Cleavage", "Conchoidal fracture", "Bedding"], correct: 1,
      why: "Cleavage gives flat planes and bedding gives layers. This is the curved break typical of glass and flint." },
  },
  hearth: {
    layers: [
      { name: "Grey silt", color: "#7d8480", text: "Fine grey silt, washed in by slow water. Nothing in it." },
      { name: "Brown clay", color: "#7a5a3c", text: "Sticky brown clay with a few rock chips. Its top is flat — an old floor surface." },
      { name: "Charcoal lens", color: "#1c1a18", text: "Black charcoal with a reddened rim. A small chert blade lies flat in it." },
    ],
    quiz: { q: "The blade lies inside the charcoal layer. What does that position tell you?",
      options: ["The blade is younger than the fire", "The blade and the fire belong to the same moment", "Nothing — position doesn't matter"], correct: 1,
      why: "Things sealed in the same thin layer were laid down together. That is why you recorded it before touching it." },
  },
  bones: {
    layers: [
      { name: "Wet mud", color: "#6b5a46", text: "Soft pool-edge mud. A pale curved shape begins to show." },
      { name: "Flowstone crust", color: "#cbb892", text: "A thin, hard calcite crust. You work along its edge instead of breaking through, and a large tooth appears beneath it." },
    ],
    quiz: { q: "A flowstone crust formed over the bone. If the crust is dated to 40,000 years, how old is the bone?",
      options: ["Younger than 40,000 years", "Exactly 40,000 years", "At least 40,000 years — it was there before the crust formed"], correct: 2,
      why: "What lies underneath had to be there first. The crust gives a minimum age." },
  },
};
