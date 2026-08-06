const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID; // optional — only needed for team projects

const BASE = "https://api.vercel.com";

function projectEndpoint(path: string) {
  const base = `${BASE}/v10/projects/${VERCEL_PROJECT_ID}/domains${path}`;
  return VERCEL_TEAM_ID ? `${base}?teamId=${VERCEL_TEAM_ID}` : base;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${VERCEL_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export async function addVercelDomain(domain: string) {
  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
    console.warn("[VERCEL_DOMAINS] VERCEL_API_TOKEN or VERCEL_PROJECT_ID not set — skipping domain provisioning.");
    return;
  }

  const res = await fetch(projectEndpoint(""), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name: domain }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // 409 means domain already registered on the project — treat as success
    if (res.status !== 409) {
      throw new Error(`Vercel domain add failed (${res.status}): ${body?.error?.message ?? "unknown error"}`);
    }
  }
}

export async function removeVercelDomain(domain: string) {
  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
    return;
  }

  const res = await fetch(projectEndpoint(`/${domain}`), {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok && res.status !== 404) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Vercel domain remove failed (${res.status}): ${body?.error?.message ?? "unknown error"}`);
  }
}

export async function getVercelDomainStatus(domain: string): Promise<"valid" | "pending" | "invalid" | "unknown"> {
  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
    return "unknown";
  }

  const res = await fetch(projectEndpoint(`/${domain}`), {
    method: "GET",
    headers: authHeaders(),
  });

  if (!res.ok) {
    return "unknown";
  }

  const data = await res.json();

  if (data?.verified === true) {
    return "valid";
  }

  if (data?.verification && data.verification.length > 0) {
    return "pending";
  }

  return "invalid";
}
