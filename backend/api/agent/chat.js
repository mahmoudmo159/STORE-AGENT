import { runAgent } from "../../lib/agent.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Store-Id"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "POST, OPTIONS"
    );
    return res.end();
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "METHOD_NOT_ALLOWED"
    });
  }

  try {
    let body = req.body;

    if (!body) {
      body = await new Promise((resolve) => {
        let raw = "";

        req.on("data", (chunk) => {
          raw += chunk;
        });

        req.on("end", () => {
          try {
            resolve(raw ? JSON.parse(raw) : {});
          } catch {
            resolve({});
          }
        });
      });
    }

    const {
      storeId,
      message,
      history = []
    } = body || {};

    if (!storeId || !message) {
      return res.status(400).json({
        error: "STORE_ID_AND_MESSAGE_REQUIRED"
      });
    }

    const result = await runAgent({
      storeId,
      message: String(message),
      history: Array.isArray(history) ? history : [],
      role: "customer"
    });

    return res.status(200).json(result);

  } catch (error) {
    console.error("AGENT_CHAT_ERROR", error);

    return res.status(500).json({
      error: error?.message || "INTERNAL_ERROR"
    });
  }
}
