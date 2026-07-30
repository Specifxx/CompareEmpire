/**
 * READ-MOSTLY: uses the Neon API (NEON_API_KEY) to find the DexCompare project
 * by matching its endpoint hostname, print its real status, and — only if the
 * endpoint is merely suspended/idle (not project-suspended) — issue a start
 * call to wake it. Prints everything either way so the real state is visible.
 */
const API = "https://console.neon.tech/api/v2";
const KEY = process.env.NEON_API_KEY;
const TARGET_HOST_FRAGMENT = process.env.TARGET_HOST_FRAGMENT || "ep-polished-forest-ay6vxl7o";

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* leave null */ }
  return { status: res.status, ok: res.ok, json, text };
}

async function main() {
  if (!KEY) {
    console.log("NEON_API_KEY not set — cannot query the Neon API.");
    return;
  }

  console.log(`Looking for a project with an endpoint host containing "${TARGET_HOST_FRAGMENT}"...`);
  const projectsRes = await api("/projects?limit=100");
  if (!projectsRes.ok) {
    console.log("Failed to list projects:", projectsRes.status, projectsRes.text.slice(0, 1000));
    return;
  }
  const projects = projectsRes.json?.projects ?? [];
  console.log(`Found ${projects.length} project(s) visible to this API key.`);

  let match: any = null;
  for (const p of projects) {
    const epRes = await api(`/projects/${p.id}/endpoints`);
    if (!epRes.ok) continue;
    const endpoints = epRes.json?.endpoints ?? [];
    for (const ep of endpoints) {
      console.log(`  project=${p.name} (${p.id})  endpoint=${ep.host}  state=${ep.current_state}  disabled=${ep.disabled}  suspend_timeout_seconds=${ep.suspend_timeout_seconds}`);
      if (ep.host && ep.host.includes(TARGET_HOST_FRAGMENT)) {
        match = { project: p, endpoint: ep };
      }
    }
  }

  if (!match) {
    console.log(`\nNo endpoint matched "${TARGET_HOST_FRAGMENT}" across projects visible to this API key.`);
    console.log("Either this key doesn't have access to the DexCompare project, or the project/endpoint no longer exists under this account.");
    return;
  }

  const { project, endpoint } = match;
  console.log(`\nMATCH: project "${project.name}" (${project.id}), endpoint ${endpoint.id} (${endpoint.host})`);
  console.log(`  current_state=${endpoint.current_state}  disabled=${endpoint.disabled}`);

  // Project-level consumption / suspension info, if the API exposes it.
  const projDetail = await api(`/projects/${project.id}`);
  if (projDetail.ok) {
    const pj = projDetail.json?.project;
    console.log(`  project.settings: ${JSON.stringify(pj?.settings ?? {})}`);
    console.log(`  project quota / consumption fields present: ${Object.keys(pj ?? {}).filter(k => /quota|consumption|limit/i.test(k)).join(", ") || "(none in payload)"}`);
  }

  if (endpoint.disabled) {
    console.log("\nEndpoint is explicitly DISABLED. This is not something the API's start call can override — this means the project/branch was administratively disabled (commonly: free-tier limit exceeded, or manually disabled in the console). Needs console.neon.tech review.");
    return;
  }

  if (endpoint.current_state === "idle") {
    console.log("\nEndpoint is idle (normal free-tier auto-suspend). Attempting to wake it via the start API...");
    const startRes = await api(`/projects/${project.id}/endpoints/${endpoint.id}/start`, { method: "POST" });
    console.log(`  start call: ${startRes.status} ${JSON.stringify(startRes.json ?? startRes.text.slice(0, 500))}`);
  } else {
    console.log(`\nEndpoint state is "${endpoint.current_state}" (not idle/disabled) — likely already active or transitioning.`);
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
