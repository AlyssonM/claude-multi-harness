# Routing Precedence

The Claude harness resolves routing in a strict order. This matters because the same crew can behave very differently depending on which layer wins.

## Effective Policy Resolution

When you run `ccmh run`, the active policy is chosen in this order:

1. `--policy <name>`
2. `default_policy` from [`.claude/ccr/route-map.example.json`](/home/alysson/Github/multi-agents/.claude/ccr/route-map.example.json)
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

## Route Map Scope Resolution

Inside the custom router, model resolution checks the most specific scope first:

1. `agents.<agent-id>`
2. `team_roles.<team>:<role>`
3. `intents.<intent>`
4. `teams.<team>`
5. `roles.<role>`
6. `systems.<system>`

This happens first inside the selected policy block, then against the top-level route map, and finally against `default_policy` if needed.

## Route Map Validation

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

## Common Checks

Sync the current route map into CCR home:

```bash
ccmh ccr:sync-route-map
```

Inspect the resolved launcher settings without opening TUI:

```bash
ccmh run --crew marketing --dry-run --show-launch-info
```
