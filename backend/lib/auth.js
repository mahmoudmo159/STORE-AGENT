import { select, verifyOwnerToken } from "./supabase.js";

export async function requireOwner(req) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const user = await verifyOwnerToken(token);
  if (!user?.id) return null;

  const members = await select(
    "store_members",
    `user_id=eq.${encodeURIComponent(user.id)}&select=store_id,role,active`
  );

  const member = members.find(x => x.active !== false && ["owner","admin"].includes(x.role));
  if (!member) return null;

  return {user, storeId: member.store_id, role: member.role};
}

export function getStoreId(req, body = {}) {
  return body.storeId || req.headers.get("x-store-id") || null;
}
