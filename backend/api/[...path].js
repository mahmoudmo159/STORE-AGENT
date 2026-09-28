import {
  getStore,
  getProducts,
  getOrders,
  getSettings,
  getAgentConfig,
  saveAgentConfig,
  saveSettings,
  addProduct,
  updateProduct,
  updateOrder
} from "../lib/store.js";

import { runAgent } from "../lib/agent.js";
import { requireOwner, getStoreId } from "../lib/auth.js";

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.CORS_ORIGIN || "*"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Store-Id"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );

  res.end(JSON.stringify(data));
}

async function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      if (!raw) return resolve({});

      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
  });
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;

    res.setHeader(
      "Access-Control-Allow-Origin",
      process.env.CORS_ORIGIN || "*"
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Store-Id"
    );

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );

    return res.end();
  }

  try {
    const url = new URL(
      req.url,
      `https://${req.headers.host || "localhost"}`
    );

    const path =
      url.pathname
        .replace(/^\/api\/?/, "")
        .replace(/\/$/, "") || "health";

    const data =
      req.method === "GET"
        ? {}
        : await readBody(req);

    // =========================
    // HEALTH
    // =========================

    if (path === "health") {
      return send(res, 200, {
        ok: true,
        service: "nike-store-agent-backend",
        version: "2.0.0",
        time: new Date().toISOString()
      });
    }

    // =========================
    // PUBLIC STORE
    // =========================

    if (path === "store" && req.method === "GET") {
      const storeId =
        getStoreId(req, data) ||
        url.searchParams.get("store");

      if (!storeId) {
        return send(res, 400, {
          error: "STORE_ID_REQUIRED"
        });
      }

      const [
        store,
        products,
        settings,
        agent
      ] = await Promise.all([
        getStore(storeId),

        getProducts(storeId, {
          active: true,
          limit: 100
        }),

        getSettings(storeId),

        getAgentConfig(storeId)
      ]);

      return send(res, 200, {
        store,
        products,
        settings,
        agent
      });
    }

    // =========================
    // CUSTOMER AGENT
    // =========================

    if (
      path === "agent/chat" &&
      req.method === "POST"
    ) {
      const storeId = getStoreId(req, data);

      if (!storeId || !data.message) {
        return send(res, 400, {
          error: "STORE_ID_AND_MESSAGE_REQUIRED"
        });
      }

      const result = await runAgent({
        storeId,

        message: String(data.message),

        history: Array.isArray(data.history)
          ? data.history
          : [],

        role: "customer"
      });

      return send(res, 200, result);
    }

    // =========================
    // OWNER AUTH
    // =========================

    const owner = await requireOwner(req);

    if (!owner) {
      return send(res, 401, {
        error: "UNAUTHORIZED"
      });
    }

    const storeId = owner.storeId;

    // =========================
    // OWNER PRODUCTS
    // =========================

    if (
      path === "owner/products" &&
      req.method === "GET"
    ) {
      return send(res, 200, {
        products: await getProducts(storeId, {
          limit: 500
        })
      });
    }

    // =========================
    // OWNER ORDERS
    // =========================

    if (
      path === "owner/orders" &&
      req.method === "GET"
    ) {
      return send(res, 200, {
        orders: await getOrders(storeId)
      });
    }

    // =========================
    // OWNER AGENT CHAT
    // =========================

    if (
      path === "owner/agent/chat" &&
      req.method === "POST"
    ) {
      return send(
        res,
        200,
        await runAgent({
          storeId,

          message: String(
            data.message || ""
          ),

          history:
            Array.isArray(data.history)
              ? data.history
              : [],

          role: "owner"
        })
      );
    }

    // =========================
    // AGENT CONFIG
    // =========================

    if (
      path === "owner/agent-config" &&
      req.method === "GET"
    ) {
      return send(res, 200, {
        config:
          await getAgentConfig(storeId)
      });
    }

    if (
      path === "owner/agent-config" &&
      req.method === "PUT"
    ) {
      return send(res, 200, {
        config:
          await saveAgentConfig(
            storeId,
            data
          )
      });
    }

    // =========================
    // STORE SETTINGS
    // =========================

    if (
      path === "owner/settings" &&
      req.method === "GET"
    ) {
      return send(res, 200, {
        settings:
          await getSettings(storeId)
      });
    }

    if (
      path === "owner/settings" &&
      req.method === "PUT"
    ) {
      return send(res, 200, {
        settings:
          await saveSettings(
            storeId,
            data
          )
      });
    }

    // =========================
    // ADD PRODUCT
    // =========================

    if (
      path === "owner/product" &&
      req.method === "POST"
    ) {
      if (!data.name) {
        return send(res, 400, {
          error: "NAME_REQUIRED"
        });
      }

      const product =
        await addProduct(
          storeId,
          {
            ...data,

            id:
              data.id ||
              crypto.randomUUID(),

            price:
              Number(data.price || 0),

            active:
              data.active !== false
          }
        );

      return send(res, 201, {
        product
      });
    }

    // =========================
    // UPDATE PRODUCT
    // =========================

    if (
      path === "owner/product/update" &&
      req.method === "POST"
    ) {
      if (!data.id) {
        return send(res, 400, {
          error: "PRODUCT_ID_REQUIRED"
        });
      }

      return send(res, 200, {
        product:
          await updateProduct(
            storeId,
            data.id,
            data.patch || {}
          )
      });
    }

    // =========================
    // UPDATE ORDER
    // =========================

    if (
      path === "owner/order/status" &&
      req.method === "POST"
    ) {
      if (!data.id || !data.status) {
        return send(res, 400, {
          error:
            "ORDER_ID_AND_STATUS_REQUIRED"
        });
      }

      return send(res, 200, {
        order:
          await updateOrder(
            storeId,
            data.id,
            {
              status: data.status
            }
          )
      });
    }

    // =========================
    // NOT FOUND
    // =========================

    return send(res, 404, {
      error: "NOT_FOUND",
      path
    });

  } catch (error) {
    console.error(
      "BACKEND_ERROR",
      error
    );

    return send(
      res,
      error.status || 500,
      {
        error:
          error.message ||
          "INTERNAL_ERROR"
      }
    );
  }
      }
