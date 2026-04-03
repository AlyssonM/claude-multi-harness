<p align="center">
  <img src="./assets/claude-code-multi-harness.png" alt="CLAUDE CODE MULTI HARNESS" width="100%" />
</p>

[![](https://img.shields.io/badge/%F0%9F%87%A7%F0%9F%87%B7-README%20PT--BR-009C3B?style=flat)](README_pt.md)
[![](https://img.shields.io/github/last-commit/AlyssonM/multi-agents?style=flat)](https://github.com/AlyssonM/multi-agents/commits)
[![](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=000000)](https://buymeacoffee.com/alyssonm)

# Claude Multi-Team Harness

A multi-team/multi-agent runtime focused on **Claude Code TUI + Claude Code Router (CCR)**.

Operational model:
- `orchestrator`
- `team leads`
- `workers`

## Differences Between Claude Code and Claude Multi-Team Harness

| Area | Plain Claude Code | Claude Multi-Team Harness |
| --- | --- | --- |
| Session model | Single interactive agent session | Hierarchical runtime with `orchestrator -> leads -> workers` |
| Team structure | Manual agent usage | Crew topology declared in `.claude/crew/<crew>/multi-team.yaml` |
| Routing | Direct model selection or plain CCR usage | Policy-based CCR routing with scoped role/team/intent resolution |
| Delegation guardrails | User-driven | Strict hierarchy by default, with lead-only visibility at the root |
| Agent ownership | Ad hoc | Per-agent prompts, expertise, tools, skills, and domain ownership |
| MCP usage | Manual per session | Shared MCP strategy embedded into crew topology and prompts |
| Validation | Manual sanity checks | `ccmh doctor`, `ccmh check:runtime`, route-map validation, smoke tests |
| Repeatability | Depends on operator discipline | Re-runnable crew definitions and reusable multi-agent topology |

## What This Project Delivers

- Single launcher for Claude TUI with crews: `run:crew`
- Automatic custom-agent generation from `.claude/crew/<crew>/multi-team.yaml`
- Policy-based routing through CCR
- Strict hierarchy by default (`orchestrator -> leads`)
- Hierarchy opt-out with `--no-hierarchy`
- MCP configuration compatible with Claude's expected format (`mcpServers`)
- Durable per-agent expertise backed by a local MCP tool: `update_mental_model`

## Structure

- [`.claude/crew/`](./.claude/crew): crew definitions
- [`.claude/crew/<crew>/expertise/`](./.claude/crew): durable mental-model files per agent
- [`.claude/scripts/`](./.claude/scripts): launcher and utilities
- [`.claude/package.json`](./.claude/package.json): runtime commands
- [`.claude/ccr/`](./.claude/ccr): custom router and route map
- [`.mcp.json`](./.mcp.json): Claude-format MCP config
- [`docs/mental-model.md`](./docs/mental-model.md): durable expertise and updater behavior

## Prerequisites

- Node.js
- `claude` CLI available in PATH
- `ccr` available in PATH

## Installation

```bash
npm --prefix .claude install
```

## Short CLI (`ccmh`)

Install the shortcut CLI once:

```bash
npm --prefix .claude run ccmh:install
```

Use `ccmh` commands:

```bash
ccmh list:crews
ccmh use marketing
ccmh use --marketing
ccmh --use marketing
ccmh run --crew marketing
```

## Main Commands

List crews:

```bash
ccmh list:crews
```

Select active crew:

```bash
ccmh use <crew>
```

Clear active crew:

```bash
ccmh clear
```

Open Claude TUI with multi-team (primary alias):

```bash
ccmh run --crew marketing
```

Resume session (`-c`):

```bash
ccmh run --crew marketing -- -c
```

Mirror session metadata into the crew directory (optional):

```bash
ccmh run --crew marketing --session-mirror
```

## Hierarchy UX

Strict hierarchy (default):
- The root session agent catalog exposes only `leads`.
- The orchestrator receives explicit rules to avoid direct delegation to workers.

Relax hierarchy:

```bash
ccmh run --crew marketing --no-hierarchy
```

Force strict hierarchy explicitly:

```bash
ccmh run --crew marketing --hierarchy
```

## CCR Routing

Install custom router + route map:

```bash
ccmh ccr:install-router
ccmh ccr:sync-route-map
```

Validate the route map and detect sync drift:

```bash
ccmh ccr:validate-route-map
```

Run with a policy:

```bash
ccmh run --crew marketing --policy economy
```

Force routing for the root/orchestrator:

```bash
ccmh run --crew marketing \
  --root-route --root-model lmstudio,nvidia/nemotron-3-nano-4b
```

Routing precedence and scope resolution:
- [docs/routing.md](./docs/routing.md)

## MCP (Claude Format)

Valid file for Claude:
- [`.mcp.json`](./.mcp.json)

Format:

```json
{
  "mcpServers": {
    "server-name": {
      "transport": "stdio",
      "command": "...",
      "args": []
    }
  }
}
```

This runtime also ships a local MCP server:

- `mental-model` -> exposes `update_mental_model`
- used by agents to persist durable expertise without broad repo write access

## Durable Expertise

Each agent owns a structured YAML mental model under:

- `.claude/crew/<crew>/expertise/<agent>-mental-model.yaml`

This is one of the main differences from plain Claude Code:

- expertise is durable across sessions
- the runtime gives every configured agent a stable memory file
- updates happen through the MCP tool `update_mental_model`, not by ad hoc YAML edits

What the updater does:

- resolves the expertise path from the active `multi-team.yaml`
- appends structured entries such as `lessons`, `risks`, `decisions`, `tools`, or `open_questions`
- preserves YAML validity
- enforces `meta.max_lines`
- fails closed on ambiguity, malformed YAML, or non-updatable expertise

Typical call shape:

```json
{
  "agent": "planning-lead",
  "category": "lessons",
  "note": "Route campaign scoping through Planning before Creative execution."
}
```

Why this matters:

- orchestrators and leads can keep durable memory without broad file-write permissions
- teams accumulate reusable operational knowledge instead of losing it per chat session
- crew behavior becomes more repeatable over time

Detailed guide:

- [docs/mental-model.md](./docs/mental-model.md)

## Quick Troubleshooting

Show launcher help:

```bash
ccmh run --help
```

Run environment doctor:

```bash
ccmh doctor
```

If CCR does not apply route changes:

```bash
ccr restart
```

If you only want to validate the command without opening TUI:

```bash
ccmh run --crew marketing --dry-run -- --version
```

## Contributor Checks

Validate runtime files:

```bash
ccmh check:runtime
```

Validate the CCR route map only:

```bash
ccmh ccr:validate-route-map
```

Run smoke tests:

```bash
ccmh test:smoke
```

## Support & Sponsoring

<p align="center">
  <img src="./assets/buymeacoffee.png" alt="Buy Me a Coffee" width="100%" />
</p>

If this project helps you, consider supporting it:

- Buy Me a Coffee: https://buymeacoffee.com/alyssonm
