import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const runtimeRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(runtimeRoot, "..");
const ccmhPath = path.join(runtimeRoot, "bin", "ccmh");
const doctorPath = path.join(runtimeRoot, "scripts", "doctor.mjs");
const runCrewPath = path.join(runtimeRoot, "scripts", "run-crew-claude.mjs");

function createFixture(t) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "ccmh-smoke-"));
  const fixtureRuntimeRoot = path.join(tempRoot, ".claude");
  cpSync(path.join(runtimeRoot, "crew"), path.join(fixtureRuntimeRoot, "crew"), { recursive: true });
  cpSync(path.join(runtimeRoot, "ccr"), path.join(fixtureRuntimeRoot, "ccr"), { recursive: true });
  cpSync(path.join(runtimeRoot, "package.json"), path.join(fixtureRuntimeRoot, "package.json"));
  cpSync(path.join(runtimeRoot, "settings.json"), path.join(fixtureRuntimeRoot, "settings.json"));

  t.after(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  return {
    tempRoot,
    fixtureRuntimeRoot,
    routeMapPath: path.join(fixtureRuntimeRoot, "ccr", "route-map.example.json"),
  };
}

function runNode(filePath, args, env = {}) {
  return spawnSync(process.execPath, [filePath, ...args], {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    encoding: "utf-8",
  });
}

function runCcmh(args, env = {}) {
  return runNode(ccmhPath, args, env);
}

test("ccmh list:crews reports available crews without touching runtime state", (t) => {
  const fixture = createFixture(t);
  const result = runCcmh(["list:crews"], {
    MULTI_HOME: fixture.fixtureRuntimeRoot,
    PI_MULTI_HOME: fixture.fixtureRuntimeRoot,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /dev/);
  assert.match(result.stdout, /marketing/);
  assert.match(result.stdout, /No active crew selected\./);
});

test("ccmh use writes active crew metadata into the selected runtime home", (t) => {
  const fixture = createFixture(t);
  const result = runCcmh(["use", "marketing"], {
    MULTI_HOME: fixture.fixtureRuntimeRoot,
    PI_MULTI_HOME: fixture.fixtureRuntimeRoot,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Activated crew: marketing/);

  const activeMetaPath = path.join(fixture.fixtureRuntimeRoot, ".active-crew.json");
  assert.equal(existsSync(activeMetaPath), true);
  const activeMeta = JSON.parse(readFileSync(activeMetaPath, "utf-8"));
  assert.equal(activeMeta.crew, "marketing");
});

test("ccmh doctor reports route-map defaults in ci mode", (t) => {
  const fixture = createFixture(t);
  const result = runNode(doctorPath, ["--ci", "--json"], {
    MULTI_HOME: fixture.fixtureRuntimeRoot,
    PI_MULTI_HOME: fixture.fixtureRuntimeRoot,
    MULTI_CCR_ROUTE_MAP_PATH: fixture.routeMapPath,
    PI_MULTI_CCR_ROUTE_MAP_PATH: fixture.routeMapPath,
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);

  const sourceRouteMap = payload.results.find((entry) => entry.label === "route_map_source");
  assert.equal(sourceRouteMap.status, "ok");
  assert.match(sourceRouteMap.detail, /default_policy=balanced/);
});

test("run-crew dry-run prefers route-map default policy over env policy", (t) => {
  const fixture = createFixture(t);
  const result = runNode(
    runCrewPath,
    ["--crew", "dev", "--no-ccr-activate", "--claude-command", "/bin/true", "--dry-run", "--show-launch-info"],
    {
      MULTI_HOME: fixture.fixtureRuntimeRoot,
      PI_MULTI_HOME: fixture.fixtureRuntimeRoot,
      MULTI_CCR_ROUTE_MAP_PATH: fixture.routeMapPath,
      PI_MULTI_CCR_ROUTE_MAP_PATH: fixture.routeMapPath,
      MULTI_CCR_POLICY: "local",
      PI_MULTI_CCR_POLICY: "local",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /policy=balanced/);
  assert.doesNotMatch(result.stdout, /policy=local/);
});

test("run-crew dry-run respects explicit policy overrides", (t) => {
  const fixture = createFixture(t);
  const result = runNode(
    runCrewPath,
    ["--crew", "dev", "--policy", "quality", "--no-ccr-activate", "--claude-command", "/bin/true", "--dry-run", "--show-launch-info"],
    {
      MULTI_HOME: fixture.fixtureRuntimeRoot,
      PI_MULTI_HOME: fixture.fixtureRuntimeRoot,
      MULTI_CCR_ROUTE_MAP_PATH: fixture.routeMapPath,
      PI_MULTI_CCR_ROUTE_MAP_PATH: fixture.routeMapPath,
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /policy=quality/);
});
