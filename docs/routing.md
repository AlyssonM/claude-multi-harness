# Routing Guide

The Claude harness uses a CCR route map to decide which model should handle each agent turn.

This file explains:

- where the route map lives
- how the active route map path is resolved
- the JSON structure
- how scope matching works
- how to validate and sync changes safely

## Route Map Files

Source of truth in this repository:

- [`.claude/ccr/route-map.example.json`](/home/alysson/Github/claude-multi-harness/.claude/ccr/route-map.example.json)

CCR home copy used by the router:

- `~/.claude-code-router/multi-route-map.json`


## Active Route Map Path Resolution

The custom router resolves the active route map path in this order:

1. `MULTI_CCR_ROUTE_MAP_PATH`
2. `PI_MULTI_CCR_ROUTE_MAP_PATH`
3. `~/.claude-code-router/multi-route-map.json`

That matters in two places:

- the router itself
- `ccmh ccr:validate-route-map`

If you use a custom path, validation now checks that exact configured file rather than assuming the default CCR home location.

Example:

```bash
export MULTI_CCR_ROUTE_MAP_PATH="$PWD/.claude/ccr/route-map.example.json"
ccmh ccr:validate-route-map --strict-sync
```

## Route Map Structure

Minimal valid shape:

```json
{
  "default_policy": "balanced",
  "policies": {
    "balanced": {
      "roles": {
        "orchestrator": "provider,model",
        "lead": "provider,model",
        "worker": "provider,model"
      }
    }
  }
}
```

Top-level keys:

- `default_policy`: name of the policy to use when no explicit `--policy` wins
- `policies`: named policy objects
- `systems`: optional direct routing by system name
- `roles`: optional direct routing by role
- `teams`: optional direct routing by team
- `team_roles`: optional direct routing by `team:role`
- `intents`: optional direct routing by inferred or tagged intent
- `agents`: optional direct routing by agent id

Every routing value must be a model ref in one of these forms:

- `provider,model`
- `provider/model`

Examples:

- `lmstudio,nvidia/nemotron-3-nano-4b`
- `openai-codex/gpt-5.3-codex`
- `Zai Coding Plan,glm-5`

## Policies

A policy is a scoped override block under `policies.<name>`.

Example:

```json
{
  "default_policy": "balanced",
  "policies": {
    "balanced": {
      "roles": {
        "orchestrator": "Zai Coding Plan,glm-5-turbo",
        "lead": "Zai Coding Plan,glm-4.7-flash",
        "worker": "Zai Coding Plan,glm-5"
      },
      "intents": {
        "coding": "Zai Coding Plan,glm-5",
        "validation": "Zai Coding Plan,glm-4.7"
      }
    },
    "local": {
      "roles": {
        "orchestrator": "lmstudio,nvidia/nemotron-3-nano-4b",
        "lead": "lmstudio,nvidia/nemotron-3-nano-4b",
        "worker": "lmstudio,nvidia/nemotron-3-nano-4b"
      }
    }
  }
}
```

Policy blocks must be objects. Scalar policy definitions are invalid and will be rejected by:

- `ccmh ccr:validate-route-map`
- `ccmh doctor`
- `ccmh check:runtime`

## Scope Resolution

Inside the router, matching checks the most specific scope first:

1. `agents.<agent-id>`
2. `team_roles.<team>:<role>`
3. `intents.<intent>`
4. `teams.<team>`
5. `roles.<role>`
6. `systems.<system>`

Resolution order is:

1. selected policy block
2. top-level route map
3. `default_policy` block, if still unresolved

This means a policy-scoped `agents.frontend-dev` beats a top-level `roles.worker`.

## How the Router Knows Role, Team, Agent, and Intent

The router uses either:

- explicit tags in the prompt/system text
- runtime hints embedded by the harness
- intent inference from user text

The custom router recognizes:

- `MULTI-ROUTE` / `PI-MULTI-ROUTE` JSON tags
- `CCR-SUBAGENT-MODEL`
- `CCR-ROOT-MODEL`

Intent is inferred from task wording when not explicitly tagged.

Current inferred intents:

- `status`
- `research`
- `planning`
- `coding`
- `validation`
- `general`

## Effective Policy Resolution

When you run `ccmh run`, the active policy is chosen in this order:

1. `--policy <name>`
2. `default_policy` from the route map
3. `MULTI_CCR_POLICY` or `PI_MULTI_CCR_POLICY`
4. built-in fallback: `balanced`

Example:

```bash
MULTI_CCR_POLICY=local ccmh run --crew dev --dry-run --show-launch-info
```

If the route map says `"default_policy": "balanced"`, the effective policy is still `balanced`.

Explicit override always wins:

```bash
ccmh run --crew dev --policy quality --dry-run --show-launch-info
```

## Root Routing vs Subagent Routing

There are two separate routing concerns:

- root/orchestrator routing
- delegated lead/worker routing

By default:

- the root Claude session uses normal CCR behavior
- delegated agents use the multi-team route map hints

If you want the root/orchestrator routed by policy too, enable:

```bash
ccmh run --crew marketing --root-route
```

If you want to pin the root to a specific model:

```bash
ccmh run --crew marketing --root-route --root-model lmstudio,nvidia/nemotron-3-nano-4b
```

## Recommended Configuration Workflow

1. edit [`.claude/ccr/route-map.example.json`](/home/alysson/Github/claude-multi-harness/.claude/ccr/route-map.example.json)
2. validate locally:

```bash
ccmh ccr:validate-route-map --no-check-home
```

3. sync to CCR home:

```bash
ccmh ccr:sync-route-map
```

4. verify source and synced copies match:

```bash
ccmh ccr:validate-route-map --strict-sync
```

5. inspect effective launcher config:

```bash
ccmh run --crew marketing --dry-run --show-launch-info
```

## Common Examples

Use a balanced default, but keep coding and validation on stronger models:

```json
{
  "default_policy": "balanced",
  "policies": {
    "balanced": {
      "roles": {
        "orchestrator": "Zai Coding Plan,glm-5-turbo",
        "lead": "Zai Coding Plan,glm-4.7-flash",
        "worker": "Zai Coding Plan,glm-5"
      },
      "intents": {
        "coding": "Zai Coding Plan,glm-5",
        "validation": "Zai Coding Plan,glm-4.7"
      }
    }
  }
}
```

Run leads locally, but keep workers on a stronger remote model:

```json
{
  "default_policy": "economy",
  "policies": {
    "economy": {
      "roles": {
        "orchestrator": "lmstudio,nvidia/nemotron-3-nano-4b",
        "lead": "lmstudio,nvidia/nemotron-3-nano-4b",
        "worker": "openai-codex/gpt-5.3-codex"
      }
    }
  }
}
```

Pin one specific worker regardless of broader role defaults:

```json
{
  "agents": {
    "market-researcher": "Zai Coding Plan,glm-5"
  }
}
```

## Common Failure Modes

- `default_policy` points to a policy name that does not exist
- `policies.<name>` is a scalar instead of an object
- route map was edited in the repo but never synced to CCR home
- custom route-map path is configured, but validation is run against the wrong file
- model ref is malformed or unsupported by the provider/router

## Validation Commands

Validate the source route map:

```bash
ccmh ccr:validate-route-map --no-check-home
```

Validate source plus synced CCR home copy:

```bash
ccmh ccr:validate-route-map
```

Fail if the synced CCR copy is missing or drifted:

```bash
ccmh ccr:validate-route-map --strict-sync
```
