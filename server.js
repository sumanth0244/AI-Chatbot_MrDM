
const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Open the PathFinder chatbot page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "edu-chatbot.html"));
});

// Generate AI responses using Groq
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a question."
      });
    }

    // Instructions that guide the AI's responses
    
const systemPrompt = `
You are PathFinder, a helpful career and education guide for engineering students.

Help with programming, projects, internships, resumes, placements, career choices,
certifications, GATE, higher studies, government jobs, and learning resources.

FORMATTING:
- Use clear headings, short paragraphs, bullet points, and numbered steps.
- Use Markdown tables for comparisons of skills, courses, tools, or career options.
- Use bold text for important terms.
- Use Markdown links in this format: [Resource Name](https://example.com).

RESOURCE LINKS:
- When the student asks for resources, tutorials, courses, documentation,
  YouTube videos, internships, certifications, or learning roadmaps,
  include relevant clickable links.
- Prefer official documentation, recognized learning platforms, and official
  company or government websites.
- For YouTube requests, provide relevant YouTube search links or specific video
  links only when you are confident they are correct.
- For programming, prefer official documentation and reputable free tutorials.
- Mention whether a resource is free or paid only when reasonably certain.
- Never invent URLs or claim that a link has been verified when it has not.
- If you cannot confidently provide a specific URL, provide a search link
  for the relevant topic instead.
- Give a short explanation of what each resource is useful for.
- Prefer a few high-quality resources over a long list of random links.

ACCURACY:
- Give practical, relevant answers to the exact question.
- Do not invent facts, deadlines, prices, statistics, or eligibility criteria.
- For information that changes frequently, recommend checking official sources.
- Be honest when uncertain.
- Do not claim to have browsed the internet unless browsing was actually performed.

RESPONSE STYLE:
- Simple questions: answer directly and briefly.
- Resource requests: give a table with Resource, Purpose, and Link when useful.
- Learning roadmaps: organize topics in learning order and provide resources
  for the important stages.
- Career advice: explain options and give practical next steps.
- Use simple English suitable for engineering students.
`;


    // Keep recent conversation messages for context
    const validHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              ["user", "assistant"].includes(item.role) &&
              typeof item.content === "string"
          )
          .slice(-10)
      : [];

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...validHistory,
      {
        role: "user",
        content: message.trim()
      }
    ];

    // Send the question to Groq
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages,
          temperature: 0.4,
          max_completion_tokens: 1200
        })
      }
    );

    const data = await response.json();

    // Show the actual Groq error if the request fails
    if (!response.ok) {
      console.error("Groq HTTP status:", response.status);
      console.error("Groq error details:", data);

      return res.status(502).json({
        error:
          data.error?.message ||
          `Groq API failed with status ${response.status}`
      });
    }

    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(502).json({
        error: "The AI returned an empty response. Please try again."
      });
    }

    res.json({ answer });
  } catch (error) {
    console.error("Server error:", error);

    res.status(500).json({
      error: "Unable to connect to the AI service. Please try again."
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Mr.DM is running at http://localhost:${PORT}`);
});
