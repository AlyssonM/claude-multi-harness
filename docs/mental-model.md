# Durable Expertise Guide

Claude Multi-Team Harness gives each configured agent a durable expertise file and a safe way to update it.

This is not generic chat memory. It is structured, file-backed operational memory for the crew runtime.

## What It Is

Each agent owns a YAML file under:

- `.claude/crew/<crew>/expertise/<agent>-mental-model.yaml`

These files are declared in each crew's `multi-team.yaml` through the `expertise` block.

Example:

```yaml
lead:
  name: planning-lead
  expertise:
    path: .claude/crew/marketing/expertise/planning-lead-mental-model.yaml
    updatable: true
    max-lines: 10000
```

## Why It Exists

Without durable expertise, multi-agent sessions lose high-signal lessons between runs.

This feature lets agents preserve:

- stable architecture and workflow patterns
- recurring risks
- durable decisions
- tool-specific lessons
- open questions worth revisiting

That makes crews more repeatable and less dependent on the operator remembering prior findings.

## Update Path

Claude runtime exposes a local MCP server:

- server: `mental-model`
- tool: `update_mental_model`

Agents should update expertise through that tool instead of editing YAML manually.

Why:

- keeps YAML valid
- resolves the correct expertise file from active crew config
- enforces `meta.max_lines`
- prevents broad write access just to maintain memory

## Required Call Pattern

The MCP server is shared by all crew agents, so it cannot safely infer agent identity on its own.

Use this shape:

```json
{
  "agent": "planning-lead",
  "category": "lessons",
  "note": "Planning performs better when creative execution starts only after audience and offer constraints are explicit."
}
```

Rules:

- always pass your own `agent` id
- use `category` only when it improves structure
- use `expertise_path` only for manual recovery or ambiguity handling

## Supported Categories

The Claude expertise schema currently defaults to these top-level arrays:

- `patterns`
- `workflows`
- `risks`
- `tools`
- `decisions`
- `lessons`
- `open_questions`

You can add other categories, but prefer the existing structure unless there is a clear reason to extend it.

Default category:

- `lessons`

## Safety Model

`update_mental_model` is intentionally narrow.

It will:

- resolve the expertise path from the active `multi-team.yaml` when possible
- reject ambiguous agents across multiple crews
- reject malformed YAML instead of overwriting it
- reject updates when `updatable: false`
- reject explicit `expertise_path` values outside `.claude` expertise directories

This is deliberate. The updater is not a general-purpose file editor.

## Failure Modes

Common failures and what they mean:

- `agent "<id>" is ambiguous across multiple crews`
  - activate the correct crew first with `ccmh use <crew>`
  - or pass the explicit `expertise_path`

- `failed to parse expertise YAML`
  - the current file is malformed and must be repaired before new entries are appended

- `expertise ... is marked as non-updatable`
  - the crew config intentionally disallows updates for that agent

- `expertise_path must stay within ... expertise directories`
  - the tool is rejecting out-of-scope file writes

## Relationship to Skills

The skill:

- [`.claude/skills/mental-model/SKILL.md`](../.claude/skills/mental-model/SKILL.md)

defines when agents should read and update expertise.

The MCP tool:

- executes the update safely
- gives the runtime a stable, structured persistence mechanism

The intended model is:

- SKILL-enforced usage
- MCP-backed persistence

## Validation

This feature is covered in smoke tests.

Current checks validate:

- expertise path resolution from the active crew
- ambiguous agent rejection
- malformed YAML rejection
- MCP `tools/list`
- MCP `tools/call`

Run:

```bash
ccmh test:smoke
```
