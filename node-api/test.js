const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();
const port = 3000;

// Load environment variables
require("dotenv").config();

// Middleware
app.use(cors());
app.use(express.json({ limit: "5mb" })); 

// Function to minimize DOM (compatible replacement for html2pug)
function getMinimizedDOM(domString) {
  try {
    // A simple DOM minimization approach - remove unnecessary whitespace and comments
    let minimized = domString
      .replace(/<!--[\s\S]*?-->/g, "") // Remove HTML comments
      .replace(/\s+/g, " ") // Collapse whitespace
      .replace(/>\s+</g, "><") // Remove whitespace between tags
      .trim();

    return minimized;
  } catch (error) {
    console.error("Error minimizing DOM:", error);
    return domString; // Return original if minimization fails
  }
}

// Setup Google Generative AI
const setupAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in environment variables");
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: "gemini-pro" });
  } catch (error) {
    console.error("Error setting up Gemini AI:", error);
    return null;
  }
};

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/api/process-dom", async (req, res) => {
  const { dom, commandText } = req.body;

  if (!dom || !commandText) {
    return res
      .status(400)
      .json({ error: "DOM content and command are required" });
  }

  try {
    // 1. Minimize the DOM
    const minimizedDOM = getMinimizedDOM(dom);

    // 2. Set up Gemini AI
    const model = setupAI();
    if (!model) {
      return res.status(500).json({ error: "Failed to initialize Gemini AI" });
    }

    // 3. Create the prompt
    const prompt = `
Your task is to act as a DOM interaction planner. Analyze the user command and the provided DOM structure. Identify the target element and the intended action.

Instructions:
1. Find the target element based on the Command and DOM.
2. Determine the best CSS selector using this priority: id > data-testid > class > tag+attributes.
3. Identify the action: "click", "type", "focus", "submit", "select".
4. For "select" action, determine if it's a regular select or Select2 dropdown (has class "select2-hidden-accessible").
5. For Select2, identify the option value from the DOM (not just the display text).
6. For "type" or "select" action, extract the value from the Command.
7. IMPORTANT: If the Command specifies a particular element among many similar ones (e.g., "the second button", "the last checkbox", "the button next to the user icon"), determine the correct index or relative position.
- Elements with CSS classes like 'disabled', 'btn-disabled', 'inactive'
Output Format:
Return ONLY a single-line JSON object. Do NOT include any other text, explanations, or markdown.
Structure:
{
  "selector": "<CSS selector string>",
  "action": "<action name>",
  "value": "<value string>", // Include for "type" or "select" actions
  "isSelect2": true/false,   // Include for "select" actions
  "optionValue": "<option value attribute>", // Include for "select" actions with Select2
  "index": 0,  // Include when there are multiple matching elements (0-based index)
  "positionHint": "next-to:selector" // Optional hint for relative positioning
}

Example for clicking a specific button: {"selector": "button.primary", "action": "click", "index": 1}
Example for clicking based on position: {"selector": "button.primary", "action": "click", "positionHint": "next-to:.user-icon"}
Example for selecting an option: {"selector": "[data-testid='booking-province-droplist']", "action": "select", "value": "Tỉnh An Giang", "isSelect2": true, "optionValue": "89"}

If the command is ambiguous or the element/action cannot be determined, return JSON: {"error": "Cannot determine action or selector."}

---
Command: ${commandText}
---
DOM:
\`\`\`html
${minimizedDOM}
\`\`\`
---
JavaScript Code:`;

    // 4. Call Gemini AI
    const chat = model.startChat();
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    let aiResponseText = (await response.text()).trim();

    // 5. Clean up AI response
    if (aiResponseText.startsWith("```json")) {
      aiResponseText = aiResponseText.substring(7);
      if (aiResponseText.endsWith("```")) {
        aiResponseText = aiResponseText.substring(0, aiResponseText.length - 3);
      }
      aiResponseText = aiResponseText.trim();
    }

    // 6. Return the processed result
    res.json({
      success: true,
      aiResponse: aiResponseText,
    });
  } catch (error) {
    console.error("Error processing DOM with AI:", error);
    res.status(500).json({
      error: "Failed to process DOM with AI",
      details: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Node.js API listening at http://localhost:${port}`);
});
