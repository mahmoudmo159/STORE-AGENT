export async function geminiReply({
  message,
  language,
  history = [],
  storeContext,
  toolResult
}) {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  const model =
    process.env.GEMINI_MODEL ||
    "gemini-3.5-flash-lite";

  const system = `
You are a store assistant.

The application logic, permissions, tools and database are authoritative.

Use ONLY the verified data provided below.

Never invent products, prices, stock, orders, customers, shipping or policies.

If products exist in the verified data, list them clearly.

If the product data is empty or unavailable, say that no verified products were found.

Reply in the same language as the customer.

Keep the response concise and helpful.

STORE CONTEXT:
${JSON.stringify(storeContext).slice(0, 12000)}

VERIFIED TOOL RESULT:
${JSON.stringify(toolResult).slice(0, 12000)}
`;

  console.log("STORE CONTEXT:", storeContext);
  console.log("TOOL RESULT:", toolResult);

  const contents = [
    {
      role: "user",
      parts: [
        {
          text: system
        }
      ]
    },

    ...history.slice(-10).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [
        {
          text: String(m.content || "")
        }
      ]
    })),

    {
      role: "user",
      parts: [
        {
          text:
            `Language: ${language}\n` +
            `Customer message: ${message}`
        }
      ]
    }
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 400
        }
      })
    }
  );

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(
      `GEMINI_ERROR_${response.status}: ${raw.slice(0, 1000)}`
    );
  }

  let data;

  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("GEMINI_INVALID_JSON");
  }

  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join("")
      .trim();

  if (!text) {
    throw new Error("GEMINI_EMPTY_RESPONSE");
  }

  return text;
}
