# Skills registry

Maintained by the `skill-scout` skill. The user doesn't need to edit this.

Last scan: 2026-11-15

## Adopted
| Name | Source | How | Date |
|---|---|---|---|
| orchestrator | own | account skill + repo copy | 2026-11-14 |
| kickoff / blindspots / ship-check | own (game repo) | repo skills | 2026-11-14 |
| advisor (built-in) | Claude Code | `/advisor opus` | 2026-11-14 |

## Rejected
| Name | Source | Reason | Date |
|---|---|---|---|
| OmniRoute | diegosouzapw/OmniRoute | pools free tiers/subscription logins (ToS risk), TLS-stealth + MITM features, breaks advisor | 2026-11-14 |
| Headroom | chopratejas/headroom | proxies all model traffic; ~20% saving on coding, telemetry on by default; low value for this user | 2026-11-14 |
| claude-mem (cloud) | thedotmack/claude-mem | memory wiped in cloud containers; telemetry on by default. Fine on a desktop — reconsider if user works locally | 2026-11-14 |

## Watching
| Name | Source | Why / next step | Date |
|---|---|---|---|
| agent-skills (Addy Osmani) | addyosmani/agent-skills | MIT, ~118k★, 25 lifecycle skills. Good ideas to merge (doubt-driven review, source-driven development, incremental slices, debugging triage, frontend/perf checklists); full plugin overlaps built-ins + ours and has hooks to audit first | 2026-11-15 |
| task-observer | rebelytics/one-skill-to-rule-them-all | Self-improving skill logs; worth it once there are many custom skills | 2026-11-14 |
