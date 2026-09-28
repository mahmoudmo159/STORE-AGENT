import { getProducts, getProduct, getOrder, getSettings, getAgentConfig, getKnowledge, recordAnalytics } from "./store.js";
import { geminiReply } from "./gemini.js";

function language(text) {
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[àâçéèêëîïôûùüÿœ]/i.test(text)) return "fr";
  if (/[äöüß]/i.test(text)) return "de";
  if (/[ñáéíóú¿¡]/i.test(text)) return "es";
  return "en";
}

function detect(text, products) {
  const t = text.toLowerCase();
  let product = null;
  for (const p of products) {
    if (p.name && t.includes(String(p.name).toLowerCase())) { product = p; break; }
  }
  const order = t.match(/(?:order|طلب|الأوردر)\s*#?(\d{3,})/i)?.[1] || t.match(/#(\d{3,})/)?.[1] || null;
  let type = "SEARCH";
  if (/track|order status|تتبع|حالة.*طلب|الأوردر/.test(t)) type = "ORDER_STATUS";
  else if (/price|cost|how much|سعر|بكام|كام/.test(t)) type = "GET_PRICE";
  else if (/stock|available|متوفر|موجود|مخزون|مقاس/.test(t)) type = "CHECK_STOCK";
  else if (/shipping|delivery|شحن|توصيل/.test(t)) type = "SHIPPING";
  else if (/return|refund|exchange|استرجاع|تبديل/.test(t)) type = "RETURN";
  else if (/recommend|suggest|best|رشح|اقترح|أفضل/.test(t)) type = "RECOMMEND";
  return {type, product, orderId: order};
}

function stock(product) {
  let q = 0;
  for (const sizes of Object.values(product?.stock || {})) {
    for (const n of Object.values(sizes || {})) q += Number(n || 0);
  }
  return q;
}

export async function runAgent({storeId, message, history = [], role = "customer"}) {
  const products = await getProducts(storeId, {active:true, limit:100});
  const intent = detect(message, products);
  let toolResult = null;

  if (intent.type === "SEARCH" || intent.type === "RECOMMEND") {
    const q = message.toLowerCase();
    toolResult = {products: products.filter(p =>
      [p.name,p.description,p.category,p.brand,...(p.colors||[])].join(" ").toLowerCase().includes(q)
    ).slice(0,20)};
  } else if (intent.type === "GET_PRICE") {
    toolResult = intent.product ? {product:intent.product} : {error:"PRODUCT_NOT_FOUND"};
  } else if (intent.type === "CHECK_STOCK") {
    toolResult = intent.product
      ? {product:intent.product, available:stock(intent.product)>0, quantity:stock(intent.product)}
      : {error:"PRODUCT_NOT_FOUND"};
  } else if (intent.type === "SHIPPING") {
    toolResult = {shipping:(await getSettings(storeId))?.shipping || {}};
  } else if (intent.type === "RETURN") {
    toolResult = {policy:(await getSettings(storeId))?.return_policy || ""};
  } else if (intent.type === "ORDER_STATUS") {
    toolResult = intent.orderId ? {order:await getOrder(storeId,intent.orderId)} : {error:"ORDER_ID_REQUIRED"};
  }

  const cfg = await getAgentConfig(storeId);
  const knowledge = await getKnowledge(storeId);
  const text = await geminiReply({
    message,
    language:language(message),
    history,
    storeContext:{config:cfg, knowledge, products:products.slice(0,50)},
    toolResult
  });

  const fallback = language(message) === "ar"
    ? (intent.type === "CHECK_STOCK"
        ? (toolResult?.available ? `أيوه، المنتج متوفر. الكمية المتاحة ${toolResult.quantity}.` : "للأسف المنتج غير متوفر حاليًا.")
        : intent.type === "ORDER_STATUS"
          ? (toolResult?.order ? `حالة الطلب #${toolResult.order.id}: ${toolResult.order.status}.` : "مش لاقي الطلب ده.")
          : intent.type === "GET_PRICE" && toolResult?.product
            ? `سعر ${toolResult.product.name} هو ${toolResult.product.price} ${toolResult.product.currency || "EGP"}.`
            : "محتاج تفاصيل أكتر عشان أساعدك.")
    : (intent.type === "CHECK_STOCK"
        ? (toolResult?.available ? `Yes, it is available. Quantity: ${toolResult.quantity}.` : "Sorry, it is currently out of stock.")
        : intent.type === "ORDER_STATUS"
          ? (toolResult?.order ? `Order #${toolResult.order.id} status: ${toolResult.order.status}.` : "I couldn't find that order.")
          : intent.type === "GET_PRICE" && toolResult?.product
            ? `${toolResult.product.name} costs ${toolResult.product.price} ${toolResult.product.currency || "EGP"}.`
            : "I need a little more detail to help you.");

  await recordAnalytics(storeId, {messages:1});
  return {response:text || fallback, language:language(message), intent:intent.type, toolResult};
}
