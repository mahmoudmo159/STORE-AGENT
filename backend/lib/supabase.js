const url = () => process.env.SUPABASE_URL;
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertConfig() {
  if (!url() || !serviceKey()) throw new Error("SUPABASE_NOT_CONFIGURED");
}

async function request(path, options = {}) {
  assertConfig();
  const res = await fetch(`${url()}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey(),
      Authorization: `Bearer ${serviceKey()}`,
      "Content-Type": "application/json",
      Prefer: options.method === "POST" ? "return=representation" : undefined,
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const err = new Error("SUPABASE_REQUEST_FAILED");
    err.status = res.status;
    err.details = body;
    throw err;
  }
  return body;
}

export async function select(table, query = "", {single = false} = {}) {
  const rows = await request(`${table}?${query}`);
  if (single) return rows?.[0] || null;
  return rows || [];
}

export async function insert(table, payload) {
  return request(table, {method:"POST", body:JSON.stringify(payload)});
}

export async function update(table, query, patch) {
  return request(`${table}?${query}`, {method:"PATCH", body:JSON.stringify(patch)});
}

export async function upsert(table, payload) {
  return request(table, {
    method:"POST",
    body:JSON.stringify(payload),
    headers: {"Prefer":"resolution=merge-duplicates,return=representation"}
  });
}

export async function deleteRows(table, query) {
  return request(`${table}?${query}`, {method:"DELETE"});
}

export async function verifyOwnerToken(token) {
  if (!token || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return null;
  const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) return null;
  return await res.json();
}
