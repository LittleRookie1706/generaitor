import express from "express";
import html2pug from "html2pug";
import { setupAI, useAI, useAI_generateTest } from "./utils/utils.js";
import { readFile } from "fs/promises";

const app = express();
const port = 3456;

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

    return res.json(data)
});

app.post("/api/generate-auto-test", async (req, res) => {
  const { dom, commandText, apiKey, testType } = req.body;

  if (!dom || !commandText) {
    return res
      .status(422)
      .json({ error: "DOM content and command are required" });
  }

  const minimizedDOM = html2pug(dom, { tabs: true });
  const commands = Array.isArray(commandText) ? commandText : [commandText];

  const genAI = setupAI(apiKey);
  const promptTemplate = await readFile(
    `./prompts/${testType}-generate.txt`,
    "utf-8"
  );

  const promises = commands.map(async (command) => {
    const prompt = promptTemplate
      .replace("${command}", command)
      .replace("${minimizedDOM}", minimizedDOM);

    try {
      let result = await useAI_generateTest(genAI, prompt);
      if (result.startsWith("```")) {
        result = result
          .replace(/```.*?\n/, "")
          .replace(/\n```/, "")
          .trim();
      }

      if (!result.endsWith(";")) {
        result += ";";
      }

      return { command, code: result };
    } catch (err) {
      console.error("AI error:", err);
      return { command, error: err.message };
    }
  });

  const individualResults = await Promise.all(promises);
  const combinedCode = individualResults
    .map((r) => (r.code ? r.code : `// Error for "${r.command}": ${r.error}`))
    .join("\n");

  res.json({
    success: true,
    individual: individualResults,
    fullScript: combinedCode.trim(),
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
