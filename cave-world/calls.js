// Phone calls with Dr. Reyes (and one guest). Lines are scripted; timing, triggers and challenges react to the player.
// Places use the cave's own coordinates: the entrance is near z = 0, the tunnel near z = -37, the skylight near (-4, -20).

export const CALLERS = {
  reyes: { name: "Dr. Ama Reyes", initials: "AR", photo: "portraits/reyes.svg", sub: "Field lead · cave radio link", voice: { pitch: 1.05, rate: 1.02 } },
  hale: { name: "Victor Hale, Hale Cave Tours", initials: "VH", photo: "portraits/hale.svg", sub: "Hale Cave Tours", voice: { pitch: 0.75, rate: 1.1 } },
};

export const PLACES = { skylight: [-4, -20.3], safeZ: -10, deepZ: -16 };

// Hints about method, never about the answer. Keyed by the tool a find needs.
export const METHOD_HINTS = {
  lens: "Get close and look before you touch anything. The detail will tell you more than the shape.",
  acid: "Ask yourself what it is made of. There's a quick chemical test, one drop is enough.",
  hammer: "If it's loose, the inside will tell you what the outside hides. Safety first.",
  uv: "Some things only show themselves in the right light.",
  brush: "Something may be under the surface. Go slowly, layer by layer, and record before you lift.",
  survey: "Here, size tells you time. Measure it properly.",
};

export const LINES = {
  checkin: {
    open: "Reyes here, just checking in. What's the most important thing you've learned so far?",
    good: (x) => `Right, ${x} That matters for the council. What made you sure of it?`,
    sure: ["I tested it myself", "It looked that way", "I read it somewhere"],
    sureReply: ["Good. A result you produced yourself is worth ten you assumed.", "Looks can mislead in a cave. Next time, back it with a test.", "Fair, but the council wants what you observed down there, not what you read."],
    close: "Keep going. Call me if you get stuck.",
  },
  flood: {
    open: "Listen carefully: heavy rain upstream, and the tunnel stream is rising fast. Get back toward the entrance, now. You have twenty seconds.",
    tick: "Ten seconds. Keep moving toward the light.",
    ok: (s) => `You made it out of the low chamber in ${s} seconds. Good. That's exactly what a flood drill is for. Remember the boulder that floods brought in? This is why.`,
    fail: "You're still down in the low section. In a real flood that's where people get trapped. We'll count this one as a drill, but it goes in the log.",
  },
  rockfall: {
    open: "Pebbles are dropping from the skylight edge on my sensor. Move out from under it, now!",
    ok: (s) => `Clear in ${s} seconds. Jagged collapse edges keep shedding rock. That's a safety point for your report.`,
    fail: "You stayed under the skylight. If that had been a block instead of pebbles, we'd be having a very different conversation.",
  },
  tour: {
    intro: "I've got Victor Hale from the tour company on the line. He wants an answer from you directly.",
    ask: "Hi. Look, we want to bring forty visitors in tomorrow, with good bright lights so they can see everything. Is there any reason we can't?",
    good: "Hm. That's… a specific point. All right, I'll hold off until the council has your report.",
    vague: "If that's all you've got, we're coming in tomorrow.",
    yes: "Great, see you at nine with the group.",
    reyesGood: "Well handled. You answered with evidence, not opinion.",
    reyesWeak: "He'll push the council the same way. Next time, give him a fact you found yourself.",
    reyesYes: "You just told a tour company to bring forty people and bright lights into a cave you've barely surveyed. We need to talk about that.",
    timeout: "Hello? I'll take that as a yes, then.",
  },
  menu: {
    open: "Reyes. What do you need?",
    options: ["Help with what's in front of me", "What's left to investigate?", "Tell you about a find", "Nothing, sorry. Hanging up."],
    noTarget: "I can't tell what you're looking at. Walk up to something that stands out, aim at it, then call me.",
    hintCost: "Here's a nudge, but I'm logging that you asked:",
    leftNone: "You've investigated everything. Write that report.",
    left: (n, dir, m) => `${n} thing${n > 1 ? "s" : ""} still to look at. The nearest is ${dir}, about ${m} metre${m === 1 ? "" : "s"} away.`,
    bye: "Talk soon.",
  },
};
