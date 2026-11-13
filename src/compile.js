// Compile an approved design into an immutable, versioned experience package.
const { newId, now } = require('./store');
const { validateDesign } = require('./design');

const BUILDABLE = ['educator-approved', 'test-approved'];

function compile(project, designId) {
  const dsg = project.designs.find((x) => x.id === designId);
  if (!dsg) throw Object.assign(new Error('Design not found'), { status: 404 });
  if (!BUILDABLE.includes(dsg.status)) throw Object.assign(new Error(`Approval required: this design is "${dsg.status}". Only approved designs can be built into a learner experience.`), { status: 403 });
  const errs = validateDesign(dsg);
  if (errs.length) throw Object.assign(new Error('Design invalid: ' + errs.join('; ')), { status: 400 });
  const d = dsg.decisions;
  const pkg = {
    id: newId('exp'), schema: 'primer.experience/1', createdAt: now(),
    projectId: project.id, designId: dsg.id, designVersion: dsg.version,
    approval: dsg.approval, testOnly: dsg.status === 'test-approved',
    title: d.title, template: d.template, objective: d.objective,
    learner: dsg.derived.learner,
    engine: {
      concepts: d.concepts, misconceptions: d.misconceptions, criteria: d.criteria,
      briefing: dsg.derived.briefing, retrieval: dsg.derived.retrieval, challenges: dsg.derived.challenges,
      adaptation: d.adaptation, practiceTurns: d.practiceTurns, character: d.character, constraints: d.constraints,
    },
    prompts: dsg.derived.prompts,
    provenance: dsg.provenance,
  };
  const perr = validatePackage(pkg);
  if (perr.length) throw Object.assign(new Error('Package invalid: ' + perr.join('; ')), { status: 500 });
  return pkg;
}

function validatePackage(p) {
  const e = [];
  if (p.schema !== 'primer.experience/1') e.push('schema');
  for (const k of ['id', 'designId', 'title', 'template', 'objective']) if (!p[k]) e.push('missing ' + k);
  if (!p.approval || !['educator', 'test'].includes(p.approval.kind)) e.push('missing approval');
  if (p.testOnly !== (p.approval && p.approval.kind === 'test')) e.push('testOnly must match approval kind');
  const en = p.engine || {};
  if (!Array.isArray(en.challenges) || !en.challenges.length) e.push('no practice challenges');
  if (!Array.isArray(en.criteria) || !en.criteria.length) e.push('no criteria');
  if (!Array.isArray(en.retrieval)) e.push('no retrieval');
  for (const ch of en.challenges || []) for (const cid of ch.conceptIds) if (!(en.concepts || []).some((c) => c.id === cid)) e.push('challenge ' + ch.id + ' references unknown concept');
  if (!p.learner || !p.learner.purpose || !p.learner.role) e.push('learner purpose/role');
  return e;
}

module.exports = { compile, validatePackage, BUILDABLE };
