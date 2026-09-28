export async function geminiReply({message, language, history = [], storeContext, toolResult}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const system = `
You are the language layer of a store agent.
The application logic, permissions, tools and database are authoritative.
Never invent product, stock, price, shipping, policy, customer or order information.
Use ONLY the verified storeContext and toolResult supplied below.
Reply in the same language as the customer.
If the data is insufficient, say so instead of guessing.
Keep the response concise and helpful.

STORE CONTEXT:
${JSON.stringify(storeContext).slice(0,12000)}

VERIFIED TOOL RESULT:
${JSON.stringify(toolResult).slice(0,12000)}
`;

  const contents = [
    {role:"user", parts:[{text:system}]},
    ...history.slice(-10).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{text:String(m.content || "")}]
    })),
    {role:"user", parts:[{text:`Language: ${language}\nCustomer message: ${message}`}]}
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method:"POST",
      headers: {
        "content-type":"application/json",
        "x-goog-api-key":key
      },
      body:JSON.stringify({
        contents,
        generationConfig:{temperature:0.2, maxOutputTokens:400}
      })
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim() || null;
}
