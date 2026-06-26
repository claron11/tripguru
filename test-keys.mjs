// Quick debug script to test Gemini + Tavily keys directly
// Run with: node test-keys.mjs

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

console.log("=== Testing Tavily API ===");
try {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query: "best hotels in Paris France 2024",
      search_depth: "basic",
      max_results: 2,
    }),
  });
  const data = await res.json();
  if (res.ok) {
    console.log("✅ Tavily OK — got", data.results?.length, "results");
    console.log("   Answer preview:", (data.answer || "").slice(0, 100));
  } else {
    console.log("❌ Tavily FAILED:", res.status, JSON.stringify(data));
  }
} catch (e) {
  console.log("❌ Tavily ERROR:", e.message);
}

console.log("\n=== Testing Gemini API ===");
try {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Say 'Gemini OK' and nothing else." }] }],
        generationConfig: { maxOutputTokens: 20 },
      }),
    }
  );
  const data = await res.json();
  if (res.ok) {
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "no text";
    console.log("✅ Gemini OK —", text.trim());
  } else {
    console.log("❌ Gemini FAILED:", res.status, JSON.stringify(data?.error || data));
  }
} catch (e) {
  console.log("❌ Gemini ERROR:", e.message);
}
