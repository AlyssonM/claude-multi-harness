<p align="center">
  <img src="./assets/claude-code-multi-harness.png" alt="CLAUDE CODE MULTI HARNESS" width="100%" />
</p>

[![](https://img.shields.io/badge/%F0%9F%87%A7%F0%9F%87%B7-README%20PT--BR-009C3B?style=flat)](README_pt.md)

# Claude Multi-Team Harness

A multi-team/multi-agent runtime focused on **Claude Code TUI + Claude Code Router (CCR)**.

Operational model:
- `orchestrator`
- `team leads`
- `workers`

## What This Branch Delivers

- Single launcher for Claude TUI with crews: `run:crew`
- Automatic custom-agent generation from `.claude/crew/<crew>/multi-team.yaml`
- Policy-based routing through CCR
- Strict hierarchy by default (`orchestrator -> leads`)
- Hierarchy opt-out with `--no-hierarchy`
- MCP configuration compatible with Claude's expected format (`mcpServers`)

## Structure

- [`.claude/crew/`](./.claude/crew): crew definitions
- [`.claude/scripts/`](./.claude/scripts): launcher and utilities
- [`.claude/package.json`](./.claude/package.json): runtime commands
- [`.claude/ccr/`](./.claude/ccr): custom router and route map
- [`.mcp.json`](./.mcp.json) and [`.claude/mcp.json`](./.claude/mcp.json): Claude-format MCP config

## Prerequisites

- Node.js
- `claude` CLI available in PATH
- `ccr` available in PATH

## Installation

```bash
npm --prefix .claude install
```

## Main Commands

List crews:

```bash
npm --prefix .claude run list:crews
```

Select active crew:

```bash
npm --prefix .claude run use:crew -- <crew>
```

Clear active crew:

```bash
npm --prefix .claude run clear:crew
```

Open Claude TUI with multi-team (primary alias):

```bash
npm --prefix .claude run run:crew -- --crew marketing
```

Also available as:

```bash
npm --prefix .claude run run:crew:claude -- --crew marketing
```

Resume session (`-c`):

```bash
npm --prefix .claude run run:crew -- --crew marketing -- -c
```

Mirror session metadata into the crew directory (optional):

```bash
npm --prefix .claude run run:crew -- --crew marketing --session-mirror
```

Notes:
- The canonical conversation runtime remains in `~/.claude/projects/...`.
- With `--session-mirror`, the launcher creates a mirror in `.claude/crew/<crew>/sessions/...` with `manifest.json`, `session_index.json`, `events.jsonl`, and a pointer/symlink to `conversation.jsonl`.

## Hierarchy UX

Strict hierarchy (default):
- The root session agent catalog exposes only `leads`.
- The orchestrator receives explicit rules to avoid direct delegation to workers.

Relax hierarchy:

```bash
npm --prefix .claude run run:crew -- --crew marketing --no-hierarchy
```

Force strict hierarchy explicitly:

```bash
npm --prefix .claude run run:crew -- --crew marketing --hierarchy
```

## CCR Routing

Install custom router + route map:

```bash
npm --prefix .claude run ccr:install-router
npm --prefix .claude run ccr:sync-route-map
```

Run with a policy:

```bash
npm --prefix .claude run run:crew -- --crew marketing --policy economy
```

Force routing for the root/orchestrator:

```bash
npm --prefix .claude run run:crew -- --crew marketing \
  --root-route --root-model lmstudio,nvidia/nemotron-3-nano-4b
```

## MCP (Claude Format)

Valid files for Claude:
- [`.mcp.json`](./.mcp.json)
- [`.claude/mcp.json`](./.claude/mcp.json)

Both use:

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

## Quick Troubleshooting

Show launcher help:

```bash
npm --prefix .claude run run:crew -- --help
```

If CCR does not apply route changes:

```bash
ccr restart
```

If you only want to validate the command without opening TUI:

```bash
npm --prefix .claude run run:crew -- --crew marketing --dry-run -- --version
```

## Support & Sponsoring

<p align="center">
  <img src="./assets/buymeacoffee.png" alt="Buy Me a Coffee" width="100%" />
</p>

If this project helps you, consider supporting it:

- Buy Me a Coffee: https://buymeacoffee.com/alyssonm
