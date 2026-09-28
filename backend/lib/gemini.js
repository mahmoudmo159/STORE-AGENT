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
Yoconst system = `
You are a store assistant.

Reply to the customer using the verified data below.

STORE CONTEXT:
${JSON.stringify(storeContext)}

VERIFIED TOOL RESULT:
${JSON.stringify(toolResult)}

Customer message:
${message}

If products exist in the data, list them.
Do NOT say "there are no products" unless the data explicitly shows an empty products list.
`;

STORE CONTEXT:
${JSON.stringify(storeContext).slice(0, 12000)}

VERIFIED TOOL RESULT:
${JSON.stringify(toolResult).slice(0, 12000)}
`;

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
console.log("STORE CONTEXT:", storeContext);
console.log("TOOL RESULT:", toolResult);
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
