import { select, insert, update, upsert } from "./supabase.js";

const esc = v => encodeURIComponent(String(v));

export async function getStore(storeId) {
  const stores = await select("stores", `id=eq.${esc(storeId)}&select=*`, {single:true});
  if (!stores) throw new Error("STORE_NOT_FOUND");
  return stores;
}

export async function getProducts(storeId, filters = {}) {
  let query = `store_id=eq.${esc(storeId)}&select=*&order=created_at.desc`;
  if (filters.active !== undefined) query += `&active=eq.${filters.active}`;
  if (filters.limit) query += `&limit=${Math.min(Number(filters.limit)||50,100)}`;
  return select("products", query);
}

export async function getProduct(storeId, id) {
  return select("products", `store_id=eq.${esc(storeId)}&id=eq.${esc(id)}&select=*`, {single:true});
}

export async function getOrders(storeId) {
  return select("orders", `store_id=eq.${esc(storeId)}&select=*&order=created_at.desc`);
}

export async function getOrder(storeId, id) {
  return select("orders", `store_id=eq.${esc(storeId)}&id=eq.${esc(id)}&select=*`, {single:true});
}

export async function getSettings(storeId) {
  return select("store_settings", `store_id=eq.${esc(storeId)}&select=*`, {single:true});
}

export async function getAgentConfig(storeId) {
  return select("agent_configs", `store_id=eq.${esc(storeId)}&select=*`, {single:true});
}

export async function saveAgentConfig(storeId, patch) {
  return upsert("agent_configs", {store_id: storeId, ...patch});
}

export async function saveSettings(storeId, patch) {
  return upsert("store_settings", {store_id: storeId, ...patch});
}

export async function addProduct(storeId, product) {
  return insert("products", {...product, store_id: storeId});
}

export async function updateProduct(storeId, id, patch) {
  return update("products", `store_id=eq.${esc(storeId)}&id=eq.${esc(id)}`, patch);
}

export async function updateOrder(storeId, id, patch) {
  return update("orders", `store_id=eq.${esc(storeId)}&id=eq.${esc(id)}`, patch);
}

export async function addOrder(storeId, order) {
  return insert("orders", {...order, store_id: storeId});
}

export async function addKnowledge(storeId, item) {
  return insert("knowledge", {...item, store_id: storeId});
}

export async function getKnowledge(storeId) {
  return select("knowledge", `store_id=eq.${esc(storeId)}&enabled=eq.true&select=*`);
}

export async function recordAnalytics(storeId, patch) {
  return upsert("analytics_daily", {store_id: storeId, day: new Date().toISOString().slice(0,10), ...patch});
}
