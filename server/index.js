import express from "express";
import html2pug from "html2pug";
import { setupAI, useAI, useAI_genCypress } from "./utils/utils.js";
import { readFile } from "fs/promises";

const app = express();
const port = 3000;

import cors from "cors";

app.use(cors());
app.use(express.json({ limit: "100mb" }));

app.post("/api/process-dom", async (req, res) => {
  const { dom, commandText, apiKey } = req.body;

  if (!dom || !commandText) {
    return res
      .status(422)
      .json({ error: "DOM content and command are required" });
  }

  try {
    const minimizedDOM = html2pug(dom, { tabs: true });
    const genAI = setupAI(apiKey);
    const promptTemplate = await readFile(
      "./prompts/dom-interaction.txt",
      "utf-8"
    );
    const prompt = promptTemplate
      .replace("${commandText}", commandText)
      .replace("${minimizedDOM}", minimizedDOM);

    const data = await useAI(genAI, prompt);
    res.json({
      success: true,
      aiResponse: data,
    });
  } catch (error) {
    console.error("Error processing DOM with AI:", error);
    res.status(500).json({
      error: "Failed to process DOM with AI",
      details: error.message,
    });
  }
});

app.post("/api/generate-cypress", async (req, res) => {
  const { dom, commandText, apiKey } = req.body;

  if (!dom || !commandText) {
    return res
      .status(422)
      .json({ error: "DOM content and command are required" });
  }

  const minimizedDOM = html2pug(dom, { tabs: true });

  const commands = Array.isArray(commandText) ? commandText : [commandText];
  let combinedCode = "";
  const individualResults = [];

  for (const command of commands) {
    const genAI = setupAI(apiKey);
    const promptTemplate = await readFile(
      "./prompts/cypress-generate.txt",
      "utf-8"
    );

    const prompt = promptTemplate
      .replace("${command}", commandText)
      .replace("${minimizedDOM}", minimizedDOM);

    try {
      const result = await useAI_genCypress(genAI, prompt);
      let text = result;

      if (text.startsWith("```")) {
        text = text
          .replace(/```.*?\n/, "")
          .replace(/\n```/, "")
          .trim();
      }

      if (!text.endsWith(";")) {
        text += ";";
      }

      combinedCode += text + "\n";
      individualResults.push({ command, code: text });
    } catch (err) {
      console.error("AI error:", err);
      individualResults.push({ command, error: err.message });
      combinedCode += `// Error for "${command}": ${err.message}\n`;
    }
  }

  res.json({
    success: true,
    individual: individualResults,
    fullScript: combinedCode.trim(),
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
