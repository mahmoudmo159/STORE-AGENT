export function json(res, status, data, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extra
    }
  });
}

export function corsHeaders() {
  const origin = process.env.CORS_ORIGIN || "*";
  return {
    "access-control-allow-origin": origin.includes(",") ? "*" : origin,
    "access-control-allow-headers": "content-type, authorization, x-store-id",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  };
}

export async function readJson(req) {
  try { return await req.json(); }
  catch { return {}; }
}

export function withCors(response) {
  const h = new Headers(response.headers);
  for (const [k,v] of Object.entries(corsHeaders())) h.set(k,v);
  return new Response(response.body, {status: response.status, headers: h});
}
