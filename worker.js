const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/ask" && request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (url.pathname === "/api/ask" && request.method === "POST") {
      return handleAsk(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleAsk(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  const context = typeof body.context === "string" ? body.context.trim() : "";

  if (!question) {
    return jsonResponse({ error: "Missing question" }, 400);
  }
  if (question.length > 2000) {
    return jsonResponse({ error: "Question too long" }, 400);
  }

  const messages = [
    {
      role: "system",
      content:
        "You are a helpful tutor assistant embedded inside LessonCanvas, a lesson-viewer app. " +
        "Answer the student's question clearly and concisely (a few sentences unless more is truly needed). " +
        "Use the provided slide content as context when it's relevant to the question. " +
        "If the slide content doesn't cover the question, answer from general knowledge but say so briefly.",
    },
    {
      role: "user",
      content:
        (context ? `Current slide content:\n${context}\n\n` : "") +
        `Student question: ${question}`,
    },
  ];

  try {
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", { messages });
    return jsonResponse({ answer: result.response || "(no answer returned)" });
  } catch (err) {
    return jsonResponse({ error: "AI request failed: " + err.message }, 502);
  }
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
