import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateRouteMapObject } from "../scripts/lib/route-map.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const runtimeRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(runtimeRoot, "..");
const ccmhPath = path.join(runtimeRoot, "bin", "ccmh");
const doctorPath = path.join(runtimeRoot, "scripts", "doctor.mjs");
const runCrewPath = path.join(runtimeRoot, "scripts", "run-crew-claude.mjs");
const validateRouteMapPath = path.join(runtimeRoot, "scripts", "validate-ccr-route-map.mjs");
const checkRuntimePath = path.join(runtimeRoot, "scripts", "check-runtime.mjs");

function createFixture(t) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "ccmh-smoke-"));
  const fixtureRuntimeRoot = path.join(tempRoot, ".claude");
  cpSync(path.join(runtimeRoot, "bin"), path.join(fixtureRuntimeRoot, "bin"), { recursive: true });
  cpSync(path.join(runtimeRoot, "scripts"), path.join(fixtureRuntimeRoot, "scripts"), { recursive: true });
  cpSync(path.join(runtimeRoot, "tests"), path.join(fixtureRuntimeRoot, "tests"), { recursive: true });
  cpSync(path.join(runtimeRoot, "crew"), path.join(fixtureRuntimeRoot, "crew"), { recursive: true });
  cpSync(path.join(runtimeRoot, "ccr"), path.join(fixtureRuntimeRoot, "ccr"), { recursive: true });
  cpSync(path.join(runtimeRoot, "package.json"), path.join(fixtureRuntimeRoot, "package.json"));
  cpSync(path.join(runtimeRoot, "settings.json"), path.join(fixtureRuntimeRoot, "settings.json"));
  if (existsSync(path.join(repoRoot, ".mcp.json"))) {
    cpSync(path.join(repoRoot, ".mcp.json"), path.join(tempRoot, ".mcp.json"));
  }

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

function writeScalarPolicyRouteMap(routeMapPath, policyName = "balanced") {
  const routeMap = JSON.parse(readFileSync(routeMapPath, "utf-8"));
  routeMap.default_policy = policyName;
  routeMap.policies[policyName] = "lmstudio/foo";
  writeFileSync(routeMapPath, `${JSON.stringify(routeMap, null, 2)}\n`, "utf-8");
}

test("validateRouteMapObject rejects scalar policy definitions referenced by default_policy", () => {
  const validation = validateRouteMapObject({
    default_policy: "balanced",
    policies: {
      balanced: "lmstudio/foo",
    },
  });

  assert.equal(validation.ok, false);
  assert.match(validation.issues.join("\n"), /policies\.balanced must be an object/);
  assert.match(validation.issues.join("\n"), /default_policy "balanced" must reference an object policy definition/);
});

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

test("ccmh ccr:validate-route-map validates the source route map without requiring CCR home", (t) => {
  const fixture = createFixture(t);
  const result = runNode(validateRouteMapPath, ["--json", "--no-check-home", "--path", fixture.routeMapPath], {
    MULTI_HOME: fixture.fixtureRuntimeRoot,
    PI_MULTI_HOME: fixture.fixtureRuntimeRoot,
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.results.length, 1);
  assert.equal(payload.results[0].label, "source");
  assert.equal(payload.results[0].status, "ok");
});

test("ccmh ccr:validate-route-map returns structured source error for malformed route map JSON", (t) => {
  const fixture = createFixture(t);
  writeFileSync(fixture.routeMapPath, "{ invalid json\n", "utf-8");

  const result = runNode(validateRouteMapPath, ["--json", "--no-check-home", "--path", fixture.routeMapPath], {
    MULTI_HOME: fixture.fixtureRuntimeRoot,
    PI_MULTI_HOME: fixture.fixtureRuntimeRoot,
  });

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.results[0].label, "source");
  assert.equal(payload.results[0].status, "error");
});

test("ccmh ccr:validate-route-map rejects scalar policy definitions", (t) => {
  const fixture = createFixture(t);
  writeScalarPolicyRouteMap(fixture.routeMapPath);

  const result = runNode(validateRouteMapPath, ["--json", "--no-check-home", "--path", fixture.routeMapPath], {
    MULTI_HOME: fixture.fixtureRuntimeRoot,
    PI_MULTI_HOME: fixture.fixtureRuntimeRoot,
  });

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.results[0].label, "source");
  assert.equal(payload.results[0].status, "error");
  assert.match(payload.results[0].detail, /policies\.balanced must be an object/);
});

test("ccmh ccr:validate-route-map returns structured ccr_home error for malformed synced route map", (t) => {
  const fixture = createFixture(t);
  const fakeHome = path.join(fixture.tempRoot, "home");
  const fakeCcrHome = path.join(fakeHome, ".claude-code-router");
  mkdirSync(fakeCcrHome, { recursive: true });
  writeFileSync(path.join(fakeCcrHome, "multi-route-map.json"), "{ invalid json\n", "utf-8");

  const result = runNode(validateRouteMapPath, ["--json", "--path", fixture.routeMapPath], {
    HOME: fakeHome,
    MULTI_HOME: fixture.fixtureRuntimeRoot,
    PI_MULTI_HOME: fixture.fixtureRuntimeRoot,
  });

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);

  const source = payload.results.find((entry) => entry.label === "source");
  const ccrHome = payload.results.find((entry) => entry.label === "ccr_home");
  assert.equal(source.status, "ok");
  assert.equal(ccrHome.status, "error");
});

test("ccmh ccr:validate-route-map respects MULTI_CCR_ROUTE_MAP_PATH during sync checks", (t) => {
  const fixture = createFixture(t);
  const fakeHome = path.join(fixture.tempRoot, "home");
  const customMapDir = path.join(fixture.tempRoot, "custom-router");
  const customMapPath = path.join(customMapDir, "multi-route-map.json");
  mkdirSync(fakeHome, { recursive: true });
  mkdirSync(customMapDir, { recursive: true });
  cpSync(fixture.routeMapPath, customMapPath);

  const result = runNode(validateRouteMapPath, ["--json", "--strict-sync", "--path", fixture.routeMapPath], {
    HOME: fakeHome,
    MULTI_HOME: fixture.fixtureRuntimeRoot,
    PI_MULTI_HOME: fixture.fixtureRuntimeRoot,
    MULTI_CCR_ROUTE_MAP_PATH: customMapPath,
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);

  const ccrHome = payload.results.find((entry) => entry.label === "ccr_home");
  assert.equal(ccrHome.status, "ok");
  assert.match(ccrHome.detail, /custom-router/);
});

test("ccmh doctor rejects scalar policy definitions in ci mode", (t) => {
  const fixture = createFixture(t);
  writeScalarPolicyRouteMap(fixture.routeMapPath);

  const result = runNode(doctorPath, ["--ci", "--json"], {
    MULTI_HOME: fixture.fixtureRuntimeRoot,
    PI_MULTI_HOME: fixture.fixtureRuntimeRoot,
    MULTI_CCR_ROUTE_MAP_PATH: fixture.routeMapPath,
    PI_MULTI_CCR_ROUTE_MAP_PATH: fixture.routeMapPath,
  });

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  const routeMap = payload.results.find((entry) => entry.label === "route_map_source");
  assert.equal(routeMap.status, "error");
  assert.match(routeMap.detail, /policies\.balanced must be an object/);
});

test("check-runtime rejects scalar policy definitions in the runtime route map", (t) => {
  const fixture = createFixture(t);
  writeScalarPolicyRouteMap(fixture.routeMapPath);

  const result = runNode(path.join(fixture.fixtureRuntimeRoot, "scripts", "check-runtime.mjs"), []);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /route-map\.example\.json -> .*policies\.balanced must be an object/);
  assert.match(result.stderr, /default_policy "balanced" must reference an object policy definition/);
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
