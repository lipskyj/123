// Deterministic provider: a rule-based stand-in for a language model. It builds designs from the educator's own
// words and materials, detects evidence by matching learner text against educator-approved look-fors, and writes
// character lines from design fields. It makes no network calls and gives the same output for the same input.
import { sentences, content, stems, stem, keyTerms, overlap, matchLookFors, NEGATION, ANSWER_SEEKING, quote, hash, rng, pick } from "./text.js";

const NAMES = ["Dana Okafor", "Marek Lindqvist", "Priya Raman", "Tomás Herrera", "Aiko Tanaka", "Samira Haddad", "Jonas Weber", "Lucia Ferrante"];
const GENERIC = new Set("explicitly correctly clearly accurately properly reading refers mentions mention least really rejects reject gives give shows show states state says say names name makes make takes take includes include using based rather instead without within least most more less well thing things way ways part parts kind kinds something anything someone anyone means mean meaning non etc example examples".split(" "));
const useful = (words) => words.filter((w) => w.length > 3 && !GENERIC.has(w));
// A short neutral phrase naming what a criterion is about, without stating the claim it makes.
export function topicOf(criterion) {
  const VERBISH = /^(explain|identif|propos|distinguish|recommend|creat|set|use|describ|appl|compar|justif|evaluat|analy|predict|calculat|estimat|interpret|argu|defin|list|giv|show|stat|mak|tak|reject|accept|connect|link|relat|separat|consider|support)/i;
  const seen = new Set(), out = [];
  for (const w of criterion.text.replace(/^\s*\S+\s+/, " ").match(/[A-Za-z][A-Za-z'-]+/g) || []) { const l = w.toLowerCase();
    if (l.length < 4 || GENERIC.has(l) || VERBISH.test(l) || !content(l).length || ["underlying", "each", "both", "side", "sides", "instead", "before", "after", "between", "least"].includes(l)) continue;
    const k = stem(l); if (seen.has(k)) continue; seen.add(k); out.push(/^[A-Z]{2,}$/.test(w) ? w : l); if (out.length === 3) break; }
  return out.length > 1 ? out.slice(0, -1).join(", ") + " and " + out.at(-1) : out[0] || "this";
}
// "Jordan, a classmate" / "a classmate called Jordan who ..." -> { name, role }
export function splitCharacter(text) {
  let t = (text || "").trim().replace(/[.?!]+$/, ""), m;
  if ((m = t.match(/\b(?:called|named)\s+([A-Z][\w'-]+)/))) return { name: m[1], role: t.replace(/,?\s*\b(?:called|named)\s+[A-Z][\w'-]+,?/, "").replace(/\s{2,}/g, " ").trim() };
  if ((m = t.match(/^([A-Z][a-z'-]+(?: [A-Z][a-z'-]+)?)\s*(?:,|—|–| - | is | who is )\s*(.+)$/))) return { name: m[1], role: m[2].trim() };
  return { name: "", role: t };
}
const lc = (s) => (s && /^[A-Z][a-z]+\s+[A-Z]/.test(s) ? s : lcRaw(s));
const lcRaw = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const strip = (s) => (s || "").trim().replace(/[.?!]+$/, "");
// "Explains why limestone fizzes" -> "explain why limestone fizzes"
export function toTask(criterion) {
  let w = strip(criterion).split(/\s+/); if (!w.length) return "";
  if (w.length > 1 && /ly$/i.test(w[0])) { const rest = toTask(w.slice(1).join(" ")); return w[0].toLowerCase() + " " + rest; }
  let v = w[0].toLowerCase();
  if (v.endsWith("ies")) v = v.slice(0, -3) + "y"; else if (/(ches|shes|sses|xes|zes)$/.test(v)) v = v.slice(0, -2); else if (v.endsWith("s") && !v.endsWith("ss")) v = v.slice(0, -1);
  return [v, ...w.slice(1)].join(" ");
}
const DIFF = { gentle: { raise: false, maxAttempts: 3, minTurns: 3 }, moderate: { raise: true, maxAttempts: 3, minTurns: 4 }, demanding: { raise: true, maxAttempts: 2, minTurns: 5 } };
export const difficultyRules = (d) => DIFF[d] || DIFF.moderate;

export class DeterministicProvider {
  constructor() { this.name = "deterministic"; this.kind = "rule-based substitute (no language model)"; }

  // ---------- authoring ----------
  interviewQuestions(intake) {
    const q = [];
    if (!intake.template) q.push({ id: "template", text: "How should students practise: by acting inside a situation with a character (Roleplay), or by teaching the idea to a newcomer who asks questions (Teachback)?", options: ["Roleplay", "Teachback"], why: "This decides what kind of work students do in the practice scene." });
    q.push({ id: "character", text: "Who should the student talk to in the practice scene, and what does that person want from them?", why: "The character's goal is what makes the student's knowledge necessary." });
    q.push({ id: "stakes", text: "In the scenario, what goes wrong if the student gets it wrong?", why: "Stakes create the productive friction that makes the content matter." });
    q.push({ id: "difficulty", text: "How hard should the character push the student?", options: ["Gentle", "Moderate", "Demanding"], why: "This sets how quickly the character raises the challenge and how many attempts a student gets." });
    q.push({ id: "help", text: "When a student is stuck, how much help is acceptable?", options: ["No hints — only repeat the question", "Guiding questions only", "Guiding questions, then point back to the materials"], why: "This limits assistance so the student still does the thinking." });
    q.push({ id: "transfer", text: "After the scenario, what different situation should students be able to carry this into?", why: "Used for the transfer question at the end of feedback." });
    return q;
  }

  proposeDesign(intake) {
    const ans = Object.fromEntries((intake.answers || []).map((a) => [a.qid, (a.answer || "").trim()]));
    const assumptions = [], recs = [];
    const mats = (intake.materials || []).filter((m) => m.text && m.text.trim());
    const allText = mats.map((m) => m.text).join("\n");
    const r = rng(hash((intake.title || "") + intake.objective));

    // Concepts: characteristic terms of the educator's materials, each anchored to a sentence from those materials.
    const terms = keyTerms(allText + " " + intake.objective, 10);
    const concepts = [], usedFacts = new Set();
    for (const term of terms) {
      for (const m of mats) { const s = sentences(m.text).find((x) => !usedFacts.has(x) && content(x).map(stem).includes(stem(term)) && x.split(" ").length >= 8);
        if (s) { usedFacts.add(s); concepts.push({ term, fact: quote(s, 260), source: { material: m.name, excerpt: quote(s, 120) } }); break; } }
    }

    let template = intake.template || (ans.template ? ans.template.toLowerCase() : "");
    if (!["roleplay", "teachback"].includes(template)) {
      template = /\b(explain|teach|describe|define|summari[sz]e|present)\b/i.test(intake.studentWork) ? "teachback" : "roleplay";
      assumptions.push({ text: `Template chosen by Primer: ${template === "teachback" ? "Teachback" : "Roleplay"}, based on the student work you described.`, source: "ai", field: "template" });
    }

    const difficulty = (ans.difficulty || "").toLowerCase().match(/gentle|moderate|demanding/)?.[0] || "moderate";
    if (!ans.difficulty) assumptions.push({ text: "Difficulty set to Moderate because none was specified.", source: "ai", field: "difficulty" });
    const helpPolicy = /no hints/i.test(ans.help || "") ? "none" : /point back|materials/i.test(ans.help || "") ? "questions-then-materials" : "questions";
    if (!ans.help) assumptions.push({ text: "Help limited to guiding questions because no help policy was specified.", source: "ai", field: "helpPolicy" });

    const given = splitCharacter(ans.character); let role = given.role;
    const name = given.name || pick(NAMES, r);
    if (ans.character && !given.name) assumptions.push({ text: `You did not name the character, so Primer chose "${name}". Use Edit to change it.`, source: "ai", field: "character.name" });
    assumptions.push({ text: "Primer wrote the character's questions from your success criteria using fixed sentence patterns. Read them under \"Practice\" and edit any that sound wrong or give too much away.", source: "ai", field: "questions" });
    if (!role) { role = template === "teachback" ? "a curious newcomer who has never studied this topic" : `someone who depends on the outcome of this work: ${lc(strip(intake.studentWork))}`;
      assumptions.push({ text: `Practice character invented by Primer: ${name}, ${role}.`, source: "ai", field: "character" }); }
    const stakes = strip(ans.stakes) || (assumptions.push({ text: "No stakes were given, so the scenario uses a generic consequence. Consider adding a specific one.", source: "ai", field: "stakes" }), `${name} will act on what the student says, so a wrong or vague answer leads to a bad decision`);

    const criteria = (intake.evidenceOfProgress || []).map((text, i) => {
      const own = content(text.replace(/^\s*\S+\s+/, " ")); const ownStems = new Set(own.map(stem));   // drop the leading task verb ("Explains", "Uses", ...)
      const rel = concepts.filter((c) => ownStems.has(stem(c.term)) || overlap(c.fact, [...ownStems]).hits.length >= 2);
      const extra = rel.flatMap((c) => content(c.fact)).filter((w) => !ownStems.has(stem(w)));
      const lookFors = [...new Set(useful([...own, ...keyTerms(extra.join(" "), 6)]))].slice(0, 12);
      return { id: "c" + (i + 1), text: strip(text), lookFors, source: { kind: "teacher", field: `evidenceOfProgress[${i}]`, materials: rel.map((c) => c.source) } };
    });
    const misconceptions = (intake.misconceptions || []).map((text, i) => ({ id: "m" + (i + 1), text: strip(text), cues: content(text).slice(0, 10), source: { kind: "teacher", field: `misconceptions[${i}]` } }));

    if (!ans.transfer) assumptions.push({ text: "No transfer situation was given, so the final question asks students to think of one themselves.", source: "ai", field: "transfer" });
    if (criteria.length > 5) recs.push({ id: "r1", text: `You listed ${criteria.length} success criteria. A single session rarely gives a fair chance at more than four or five; consider trimming.`, accepted: null });
    if (!misconceptions.length) recs.push({ id: "r2", text: "No misconceptions were listed. Adding one or two lets the character test for them.", accepted: null });
    if (allText.split(/\s+/).length < 80) recs.push({ id: "r3", text: "The materials are short. The preparation briefing and the look-fors will be richer with more source text.", accepted: null });

    const design = {
      id: "design-" + hash(intake.id + ":v1"), intakeId: intake.id, version: 1, state: "draft", supersedes: null, createdAt: new Date().toISOString(),
      title: strip(intake.title) || quote(strip(intake.objective), 70), template, world: intake.world && intake.world !== "none" ? intake.world : null,
      goal: { text: strip(intake.objective), source: { kind: "teacher", field: "objective" } },
      learnerProfile: { text: strip(intake.learners), priorKnowledge: strip(intake.priorKnowledge), source: { kind: "teacher", field: "learners" } },
      learnerRole: { text: strip(intake.studentWork), source: { kind: "teacher", field: "studentWork" } },
      character: { name, role, source: { kind: ans.character ? "teacher" : "ai", field: "answers.character" }, nameSource: { kind: given.name ? "teacher" : "ai", field: "answers.character" } },
      materials: mats.map((m) => ({ name: m.name, text: m.text })), notes: [],
      stakes: { text: stakes, source: { kind: ans.stakes ? "teacher" : "ai", field: "answers.stakes" } },
      difficulty, helpPolicy, criteria, misconceptions, concepts,
      constraints: (intake.constraints || "").split(/\n/).map((s) => strip(s)).filter(Boolean),
      transfer: { text: strip(ans.transfer), source: { kind: ans.transfer ? "teacher" : "ai", field: "answers.transfer" } },
      assumptions, recommendations: recs, overrides: {}, revisions: [],
      history: [{ at: new Date().toISOString(), actor: { type: "system", name: "Primer" }, action: "propose", from: null, to: "draft", note: "Proposed from educator intake." }],
    };
    return this.derive(design);
  }

  // Everything below the core fields is derived, so a revision to a core field propagates to prompts, runtime and feedback.
  derive(d) {
    const tb = d.template === "teachback", ch = d.character, first = ch.name.split(" ")[0];
    const top = d.concepts.slice(0, 3);
    // Words that belong to a misconception but not to the correct account; a learner must use at least one before a statement counts as that misconception.
    const corpus = new Set([...d.concepts.flatMap((c) => content(c.fact)), ...d.criteria.flatMap((c) => [...content(c.text), ...c.lookFors])].map(stem));
    for (const m of d.misconceptions) { if (!m.cues || !m.cues.length) m.cues = content(m.text).slice(0, 10); m.distinct = m.cues.filter((w) => !corpus.has(stem(w))); }
    // Drop "Primer decided" notes for anything the teacher has since supplied.
    const taught = { stakes: d.stakes.source, character: d.character.source, "character.name": d.character.nameSource, transfer: d.transfer.source };
    d.assumptions = d.assumptions.filter((a) => !(taught[a.field] && taught[a.field].kind === "teacher"));
    const TB_Q = ["Where should I start? What's the most important idea I need to get?", "Okay. What else do I need to understand to really get this?", "What do people usually get wrong about this, and why are they wrong?", "How would I know whether I had understood it properly?", "Can you give me an example that shows it?", "Is there anything that would change the answer?"];
    const RP_Q = ["Where would you start with my situation?", "What else should I be thinking about before I decide?", "What would you do differently from what I had planned?", "What's the risk if I get this wrong?", "Is there an option I haven't considered?", "What would you say if they push back?"];
    d.preparation = {
      briefing: `Purpose: ${d.goal.text}.\nYour role: ${d.learnerRole.text}.\nYou will ${tb ? "teach" : "talk with"} ${ch.name}.`,
      keyPoints: d.concepts.slice(0, 5).map((c) => ({ text: c.fact, source: c.source })),
      activation: [
        `Before you begin: in your own words, what do you already know about "${d.title}"?`,
        `Which idea from earlier lessons do you expect to need most here, and why?`,
      ],
    };
    d.practice = {
      opening: tb ? `Hi, I'm ${first}. I was told you could help me understand this. I'm starting from zero, so please go slowly.`
                  : `Hi, I'm ${ch.name}. Thanks for making time. I really need your help with this.`,
      challenges: d.criteria.map((c, i) => ({ criterionId: c.id, written: c.question ? "teacher" : "primer",
        prompt: c.question || (tb ? TB_Q : RP_Q)[i % 6],
        harder: tb ? `Okay, I think I follow. But suppose someone disagreed with you. What would you say to convince them?` : `That helps. But this matters a lot to me, so let me push: why are you sure? What would make you change your advice?`,
        support: [tb ? `I'm not sure I follow yet. Can you say a bit more, maybe with an example?` : `Can you say a bit more about what you're basing that on?`,
          `Maybe look back at the course material from before we started. Is there a part of it that helps here?`] })),
      ack: tb ? `Oh, that's useful, it answers something I was going to ask.` : `That's useful, it covers something I was going to ask about.`,
      probes: d.misconceptions.map((m) => ({ misconceptionId: m.id,
        voice: tb ? `Wait, I read somewhere that ${lc(strip(m.text))}. Is that right?` : `I've always heard that ${lc(strip(m.text))}. Any reason I shouldn't go with that?`,
        challenge: `Hold on. You said something that sounded like "${lc(strip(m.text))}". If that were true, what would we expect to see? Does that match what you know?` })),
      closing: tb ? `Thank you. I think I could explain some of this to someone else now.` : `All right. I have what I need to decide. Thank you for your time.`,
      closingUnsure: tb ? `Thanks for trying. I'm still a bit confused, so I'll keep reading about it.` : `Thanks for your time. I'm still not sure what to do, so I'll think about it some more.`,
      refusal: tb ? `I can't tell you the answer; I'm the one who doesn't know it! Try explaining the part you're surest of.` : `I can't answer that for you. Your judgement is exactly what I came for. Start with what you're surest of.`,
      maxTurns: Math.max(6, d.criteria.length * 3 + 2), ...difficultyRules(d.difficulty),
    };
    const tr = strip(d.transfer.text);
    d.feedback = {
      selfAssessment: ["Before you see any feedback: how do you think that went? Which moment are you most satisfied with?", "What would you do differently if you did it again?"],
      transfer: tr ? (/\?\s*$/.test(d.transfer.text) ? d.transfer.text.trim() : `A different situation: ${tr}. What from this session would you use there, and what would you change?`)
        : `Imagine the same ideas coming up somewhere quite different from ${ch.name}'s situation. Describe one such situation and how you would handle it.`,
    };
    const crit = d.criteria.map((c) => `- ${c.id}: ${c.text} (look for: ${c.lookFors.join(", ")})`).join("\n");
    const mis = d.misconceptions.map((m) => `- ${m.id}: ${m.text}`).join("\n") || "- none listed";
    d.prompts = {
      character: `You play ${ch.name}, ${ch.role}, in a ${tb ? "teachback" : "roleplay"} for these learners: ${d.learnerProfile.text}.\nLearning goal (do not drift from it): ${d.goal.text}\nThe learner's job: ${d.learnerRole.text}\nStakes: ${d.stakes.text}\nDifficulty: ${d.difficulty}. Help policy: ${d.helpPolicy}.\nStay in character. Never give the answer or do the learner's work. Raise the challenge only after the learner shows evidence; give support only as the help policy allows.\nClassroom constraints (for you, never say them aloud): ${d.constraints.join("; ") || "none"}\nTeacher notes: ${(d.notes || []).join("; ") || "none"}`,
      assessor: `Record evidence only for these educator-approved criteria, quoting the learner's own words:\n${crit}\nWatch for these misconceptions:\n${mis}\nDo not assess anything the learner was not asked to do. Mark observation separately from inference.`,
      feedback: `Write feedback for the learning goal "${d.goal.text}". Ask for self-assessment first. For each criterion cite the learner's actual words and the turn they came from. Say "not assessed" where the learner had no fair opportunity. Offer concrete next actions and finish with the transfer question.`,
    };
    for (const [path, value] of Object.entries(d.overrides || {})) setPath(d, path, value);
    return d;
  }

  // Natural-language revision. Returns { design, changes[], understood }.
  reviseDesign(design, request) {
    const d = structuredClone(design), changes = [], req = request.trim(); let m;
    const ord = { gentle: 0, moderate: 1, demanding: 2 }, lv = ["gentle", "moderate", "demanding"];
    if (/\b(harder|tougher|more (challenging|demanding|difficult)|push (them )?harder)\b/i.test(req)) { const n = lv[Math.min(2, ord[d.difficulty] + 1)]; if (n !== d.difficulty) { changes.push(`Difficulty: ${d.difficulty} → ${n}`); d.difficulty = n; } }
    if (/\b(easier|gentler|less (demanding|difficult|challenging)|more supportive)\b/i.test(req)) { const n = lv[Math.max(0, ord[d.difficulty] - 1)]; if (n !== d.difficulty) { changes.push(`Difficulty: ${d.difficulty} → ${n}`); d.difficulty = n; } }
    if ((m = req.match(/add (?:a |another |the )?(?:success )?criteri(?:on|a)\s*[:\-–]?\s*(.+)/i))) { const text = strip(m[1]); const id = "c" + (Math.max(0, ...d.criteria.map((c) => +c.id.slice(1))) + 1);
      d.criteria.push({ id, text, lookFors: [...new Set(content(text.replace(/^\s*\S+\s+/, " ")))].slice(0, 12), source: { kind: "teacher", field: "revision" } }); changes.push(`Added criterion ${id}: ${text}`); }
    if ((m = req.match(/(?:remove|drop|delete) (?:the )?criteri(?:on|a) (?:number |#)?(\d+)/i))) { const c = d.criteria[+m[1] - 1]; if (c && d.criteria.length > 1) { d.criteria = d.criteria.filter((x) => x !== c); changes.push(`Removed criterion ${c.id}: ${c.text}`); } }
    if ((m = req.match(/add (?:a |another |the )?misconception\s*[:\-–]?\s*(.+)/i))) { const text = strip(m[1]); const id = "m" + (Math.max(0, ...d.misconceptions.map((c) => +c.id.slice(1))) + 1);
      d.misconceptions.push({ id, text, cues: content(text).slice(0, 10), source: { kind: "teacher", field: "revision" } }); changes.push(`Added misconception ${id}: ${text}`); }
    let named = false;
    if (/character|name/i.test(req) && (m = req.match(/\b(?:called|named|rename(?:d)?(?: the character)?(?: to| as)?|[Cc]all the character|name(?: is| should be| to))\s+([A-Z][\w'-]+(?: [A-Z][\w'-]+)?)/))) { named = true; if (m[1] !== d.character.name) { changes.push(`Character name: ${d.character.name} → ${m[1]}`); d.character.name = m[1]; d.character.nameSource = { kind: "teacher", field: "revision" }; } }
    if (/\b(?:remove|delete|drop)\b.*\b(?:last |latest )?(?:note|constraint)s?\b/i.test(req)) { const list = (d.notes || []).length ? d.notes : d.constraints; if (list.length) { const gone = list.pop(); changes.push(`Removed: "${gone}"`); } else changes.push("There was no note or constraint to remove"); named = true; }
    if (!named && (m = req.match(/(?:the )?character should be\s+(?!called|named)(.+)/i))) { changes.push(`Character role: ${d.character.role} → ${strip(m[1])}`); d.character.role = strip(m[1]); d.character.source = { kind: "teacher", field: "revision" }; }
    if ((m = req.match(/\b(?:switch to|use|make it a?)\s*(teachback|roleplay)\b/i))) { const t = m[1].toLowerCase(); if (t !== d.template) { changes.push(`Template: ${d.template} → ${t}`); d.template = t; } }
    if ((m = req.match(/stakes?\s*(?:should be|[:\-–])\s*(.+)/i))) { changes.push(`Stakes changed to: ${strip(m[1])}`); d.stakes = { text: strip(m[1]), source: { kind: "teacher", field: "revision" } }; }
    if ((m = req.match(/transfer (?:question|scenario|situation)\s*(?:should be|[:\-–])\s*(.+)/i))) { changes.push(`Transfer situation changed to: ${strip(m[1])}`); d.transfer = { text: strip(m[1]), source: { kind: "teacher", field: "revision" } }; }
    if (/\b(no hints|don'?t give (any )?hints|without hints)\b/i.test(req) && d.helpPolicy !== "none") { changes.push(`Help policy: ${d.helpPolicy} → none`); d.helpPolicy = "none"; }
    if ((m = req.match(/(?:focus|emphasi[sz]e|concentrate)(?: more)? on\s+(.+)/i))) { const t = stems(m[1]); const before = d.criteria.map((c) => c.id).join();
      d.criteria.sort((a, b) => overlap(b.text, t).score - overlap(a.text, t).score); d.criteria.forEach((c) => { if (overlap(c.text, t).score > 0) c.lookFors = [...new Set([...c.lookFors, ...content(m[1])])].slice(0, 14); });
      d.goal.emphasis = strip(m[1]); changes.push(`Emphasis added: ${strip(m[1])}` + (before !== d.criteria.map((c) => c.id).join() ? " (criteria reordered so it comes first)" : "")); }
    const understood = changes.length > 0;
    if (!understood) { d.notes = [...(d.notes || []), strip(req)]; changes.push(`saved as a note for you only (students never see it): "${strip(req)}". Nothing in the experience changed. Use the Edit buttons to make this change yourself.`); }
    // A revision invalidates direct text overrides on parts that are regenerated from the changed fields.
    d.revisions.push({ id: "rev" + (d.revisions.length + 1), at: new Date().toISOString(), request: req, changes, understood });
    return { design: this.derive(d), changes, understood };
  }

  // ---------- runtime ----------
  assess(text, design) {
    const out = [], nWords = content(text).length;
    const count = new Map(); for (const c of design.criteria) for (const lf of new Set(c.lookFors.map((x) => x.toLowerCase()))) count.set(lf, (count.get(lf) || 0) + 1);
    for (const c of design.criteria) { const lfs = [...new Set(c.lookFors.map((x) => x.toLowerCase()))]; const hits = matchLookFors(text, lfs);
      const need = Math.max(2, Math.ceil(lfs.length * 0.2));
      // Look-fors shared with other criteria are not enough by themselves: at least one hit must belong only to this criterion.
      const own = lfs.filter((x) => count.get(x) === 1);
      if (hits.length >= need && nWords >= 4 && (!own.length || hits.some((h) => own.includes(h)))) out.push({ kind: "criterion", ref: c.id, strength: hits.length >= need + 1 ? "clear" : "partial", matched: hits }); }
    for (const m of design.misconceptions) { const target = [...new Set(m.cues.map(stem))]; const { hits, score } = overlap(text, target);
      const distinct = (m.distinct || []).map(stem), hasDistinct = !distinct.length || hits.some((h) => distinct.includes(h));
      if (hits.length >= 2 && score >= 0.25 && hasDistinct) out.push({ kind: NEGATION.test(text) ? "misconception-corrected" : "misconception-voiced", ref: m.id, strength: "clear", matched: hits }); }
    return out;
  }
  isAnswerSeeking(text) { return ANSWER_SEEKING.test(text); }
  line(kind, design, ctx = {}) {
    const p = design.practice, ch = p.challenges.find((c) => c.criterionId === ctx.criterionId);
    const echo = ctx.learnerText ? `You said "${quote(ctx.learnerText, 70)}". ` : "";
    switch (kind) {
      case "opening": return p.opening;
      case "prompt": return ch.prompt;
      case "raise": return ch.harder;
      case "support": return ch.support[Math.min(ctx.level - 1, ch.support.length - 1)];
      case "repeat": return `Let me ask again. ${ch.prompt}`;
      case "redirect": return p.refusal + " " + ch.prompt;
      case "ack": return `${p.ack} ${ch.prompt}`;
      case "probe-voice": return p.probes.find((x) => x.misconceptionId === ctx.misconceptionId).voice;
      case "probe-challenge": return p.probes.find((x) => x.misconceptionId === ctx.misconceptionId).challenge;
      case "closing": return ctx.unsure && p.closingUnsure ? p.closingUnsure : p.closing;
    }
    throw new Error("Unknown line kind " + kind);
  }
}

export function setPath(obj, path, value) {
  const keys = path.split("."); let o = obj;
  for (let i = 0; i < keys.length - 1; i++) { if (o[keys[i]] == null) return false; o = o[keys[i]]; }
  if (!(keys[keys.length - 1] in o)) return false; o[keys[keys.length - 1]] = value; return true;
}

// Replay provider: records what another provider returned, or replays a recording. Used to prove the provider is
// replaceable and that runs are reproducible.
export class ReplayProvider {
  constructor(inner, tape = []) { this.inner = inner; this.tape = tape; this.pos = 0; this.name = "replay"; this.kind = inner ? "recording " + inner.name : "replaying a recording"; }
  _call(method, args) {
    if (this.inner) { const result = this.inner[method](...args); this.tape.push({ method, result: structuredClone(result) }); return result; }
    const e = this.tape[this.pos++]; if (!e || e.method !== method) throw new Error(`Replay mismatch: expected ${e ? e.method : "end of tape"}, got ${method}`); return structuredClone(e.result);
  }
  interviewQuestions(...a) { return this._call("interviewQuestions", a); }
  proposeDesign(...a) { return this._call("proposeDesign", a); }
  reviseDesign(...a) { return this._call("reviseDesign", a); }
  derive(...a) { return this._call("derive", a); }
  assess(...a) { return this._call("assess", a); }
  isAnswerSeeking(...a) { return this._call("isAnswerSeeking", a); }
  line(...a) { return this._call("line", a); }
}
