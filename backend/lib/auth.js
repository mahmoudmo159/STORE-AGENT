function getHeader(req, name) {
  // Web Headers API
  if (req?.headers && typeof req.headers.get === "function") {
    return req.headers.get(name);
  }

  // Node.js / Vercel headers
  if (req?.headers) {
    return (
      req.headers[name.toLowerCase()] ??
      req.headers[name] ??
      null
    );
  }

  return null;
}

export function getStoreId(req, body = {}) {
  return (
    body?.storeId ||
    body?.store_id ||
    getHeader(req, "x-store-id") ||
    null
  );
}

export async function requireOwner(req) {
  const authorization =
    getHeader(req, "authorization");

  const token =
    authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

  // مؤقتًا: لو مفيش Authorization
  // نرفض طلبات الـOwner بشكل صحيح.
  if (!token) {
    return null;
  }

  // هنا بنحط التحقق الحقيقي من الـOwner
  // بعد توصيل Supabase Auth.
  return null;
}
