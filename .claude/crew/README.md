# Crew Layout

Create one folder per crew:

```text
.claude/crew/<crew>/
  multi-team.yaml
  agents/
  expertise/
  sessions/
```

Shared skills live at:

```text
.claude/skills/
```

Tool availability is declared per agent in `multi-team.yaml` / agent frontmatter and resolved at runtime (plus MCP tools from `.mcp.json` / `.claude/mcp.json`).

Current crews in this branch:

- `dev`
- `marketing`

Useful commands:

```bash
npm --prefix .claude run list:crews
npm --prefix .claude run use:crew -- <crew>
npm --prefix .claude run run:crew -- --crew <crew>
```
