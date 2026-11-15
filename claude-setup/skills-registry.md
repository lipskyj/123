# Skills registry

Maintained by the `skill-scout` skill. The user doesn't need to edit this.

Last scan: 2026-11-15

## Adopted
| Name | Source | How | Date |
|---|---|---|---|
| orchestrator | own | account skill + repo copy | 2026-11-14 |
| kickoff / blindspots / ship-check | own (game repo) | repo skills | 2026-11-14 |
| advisor (built-in) | Claude Code | `/advisor opus` | 2026-11-14 |
| agent-skills ideas: thin slices, docs-first, debug order, doubt review | addyosmani/agent-skills (MIT) | merged into orchestrator §4–5 in own words | 2026-11-15 |

## Rejected
| Name | Source | Reason | Date |
|---|---|---|---|
| OmniRoute | diegosouzapw/OmniRoute | pools free tiers/subscription logins (ToS risk), TLS-stealth + MITM features, breaks advisor | 2026-11-14 |
| Headroom | chopratejas/headroom | proxies all model traffic; ~20% saving on coding, telemetry on by default; low value for this user | 2026-11-14 |
| claude-mem (cloud) | thedotmack/claude-mem | memory wiped in cloud containers; telemetry on by default. Fine on a desktop — reconsider if user works locally | 2026-11-14 |

## Watching
| Name | Source | Why / next step | Date |
|---|---|---|---|
| agent-skills (rest) | addyosmani/agent-skills | MIT, ~118k★. Full plugin not installed: overlaps built-ins/ours. Hooks audited 2026-11-15: no telemetry; `sdd-cache` only HEAD-revalidates docs URLs Claude fetched; `simplify-ignore` rewrites source files in place during reads (risky). Next candidates: frontend-ui-engineering + performance-optimization checklists for web/graphics work | 2026-11-15 |
| task-observer | rebelytics/one-skill-to-rule-them-all | Self-improving skill logs; worth it once there are many custom skills | 2026-11-14 |
