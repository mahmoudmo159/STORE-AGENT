import { corsHeaders, json, readJson } from "../lib/http.js";
import { requireOwner, getStoreId } from "../lib/auth.js";
import { getStore, getProducts, getOrders, getSettings, getAgentConfig, saveAgentConfig, saveSettings, addProduct, updateProduct, updateOrder } from "../lib/store.js";
import { runAgent } from "../lib/agent.js";

function ok(data, status=200) {
  return json(new Response(), status, data, corsHeaders());
}

function err(message, status=400, details) {
  return json(new Response(), status, {error:message, ...(details ? {details} : {})}, corsHeaders());
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, {status:204, headers:corsHeaders()});

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "") || "health";
    const body = req.method === "GET" ? {} : await readJson(req);

    if (path === "health") {
      return ok({ok:true, service:"nike-store-agent-backend", version:"2.0.0", time:new Date().toISOString()});
    }

    if (path === "store" && req.method === "GET") {
      const storeId = getStoreId(req, body) || url.searchParams.get("store");
      if (!storeId) return err("STORE_ID_REQUIRED",400);
      const [store, products, settings, agent] = await Promise.all([
        getStore(storeId), getProducts(storeId,{active:true,limit:100}), getSettings(storeId), getAgentConfig(storeId)
      ]);
      return ok({store,products,settings,agent});
    }

    if (path === "agent/chat" && req.method === "POST") {
      const storeId = getStoreId(req, body);
      if (!storeId || !body.message) return err("STORE_ID_AND_MESSAGE_REQUIRED",400);
      return ok(await runAgent({storeId,message:String(body.message),history:Array.isArray(body.history)?body.history:[],role:"customer"}));
    }

    const owner = await requireOwner(req);
    if (!owner) return err("UNAUTHORIZED",401);
    const storeId = owner.storeId;

    if (path === "owner/products" && req.method === "GET")
      return ok({products:await getProducts(storeId,{limit:500})});

    if (path === "owner/orders" && req.method === "GET")
      return ok({orders:await getOrders(storeId)});

    if (path === "owner/agent/chat" && req.method === "POST")
      return ok(await runAgent({storeId,message:String(body.message||""),history:body.history||[],role:"owner"}));

    if (path === "owner/agent-config" && req.method === "GET")
      return ok({config:await getAgentConfig(storeId)});

    if (path === "owner/agent-config" && req.method === "PUT")
      return ok({config:await saveAgentConfig(storeId, body)});

    if (path === "owner/settings" && req.method === "GET")
      return ok({settings:await getSettings(storeId)});

    if (path === "owner/settings" && req.method === "PUT")
      return ok({settings:await saveSettings(storeId, body)});

    if (path === "owner/product" && req.method === "POST") {
      if (!body.name) return err("NAME_REQUIRED",400);
      return ok({product:await addProduct(storeId,{
        ...body, id:body.id || crypto.randomUUID(), price:Number(body.price||0), active:body.active !== false
      })},201);
    }

    if (path === "owner/product/update" && req.method === "POST") {
      if (!body.id) return err("PRODUCT_ID_REQUIRED",400);
      return ok({product:await updateProduct(storeId,body.id,body.patch||{})});
    }

    if (path === "owner/order/status" && req.method === "POST") {
      if (!body.id || !body.status) return err("ORDER_ID_AND_STATUS_REQUIRED",400);
      return ok({order:await updateOrder(storeId,body.id,{status:body.status})});
    }

    if (path === "owner/import/preview" && req.method === "POST") {
      if (!body.base64) return err("FILE_REQUIRED",400);
      const {default:XLSX}=await import("xlsx");
      const wb=XLSX.read(Buffer.from(body.base64,"base64"),{type:"buffer"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:""});
      const max=Number(process.env.MAX_IMPORT_ROWS||10000);
      if (rows.length > max) return err("IMPORT_TOO_LARGE",413,{maxRows:max});
      const aliases={"product name":"name","product_name":"name","title":"name","price":"price","unit price":"price","unit_price":"price","category":"category","brand":"brand","sku":"sku","barcode":"barcode","color":"colors","colors":"colors","size":"sizes","sizes":"sizes","stock":"stock","quantity":"quantity","image":"images","image_url":"images","image_urls":"images"};
      const existing=await getProducts(storeId,{limit:5000});
      const mapped=rows.map(row=>{
        const o={};
        for(const [k,v] of Object.entries(row)){
          const key=String(k).trim().toLowerCase();
          o[aliases[key]||key.replace(/\s+/g,"_")]=v;
        }
        o.id=o.id||o.sku||crypto.randomUUID();
        o.price=Number(o.price||0);
        o.currency=o.currency||"EGP";
        o.colors=String(o.colors||"").split(",").map(x=>x.trim()).filter(Boolean);
        o.sizes=String(o.sizes||"").split(",").map(x=>x.trim()).filter(Boolean);
        o.active=true;
        return o;
      });
      const invalid=mapped.filter(p=>!p.name || !Number.isFinite(p.price));
      const duplicates=mapped.filter(p=>existing.some(x=>String(x.id)===String(p.id)||(p.sku&&x.sku===p.sku)));
      return ok({rows:mapped,summary:{total:rows.length,invalid:invalid.length,duplicates:duplicates.length}});
    }

    if (path === "owner/import/commit" && req.method === "POST") {
      if (!Array.isArray(body.products)) return err("PRODUCTS_REQUIRED",400);
      let added=0, skipped=0;
      for (const p of body.products) {
        if (!p.name || !Number.isFinite(Number(p.price))) { skipped++; continue; }
        try { await addProduct(storeId,p); added++; } catch { skipped++; }
      }
      return ok({added,skipped});
    }

    return err("NOT_FOUND",404);
  } catch (e) {
    console.error(e);
    const status = e.message === "STORE_NOT_FOUND" ? 404 : (e.status || 500);
    return err(e.message || "INTERNAL_ERROR", status, process.env.NODE_ENV === "development" ? e.details : undefined);
  }
}
