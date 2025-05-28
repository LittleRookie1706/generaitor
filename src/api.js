app.post("/api/process-dom-and-cypress", async (req, res) => {
  const { dom, commands, apiKey } = req.body;

  if (!dom || !commands || !Array.isArray(commands) || commands.length === 0) {
    return res
      .status(400)
      .json({ error: "DOM content and commands array are required" });
  }

  try {
    const minimizedDOM = html2pug(dom, { tabs: true });

    const model = setupAI(apiKey);
    if (!model) {
      return res.status(500).json({ error: "Failed to initialize Gemini AI" });
    }

    let combinedCypressCode = "";
    const targetElements = [];
    const chat = model.startChat();

    // Process each command
    for (const command of commands) {
      console.log("Processing command:", command);

      // Combined prompt that handles both DOM analysis and Cypress generation
      const combinedPrompt = `
Your task is to act as a DOM interaction planner and Cypress code generator. Analyze the user command and the provided DOM structure to:
1. Identify the target element and intended action
2. Generate corresponding Cypress test code

DOM ANALYSIS INSTRUCTIONS:
1. Find the target element based on the Command and DOM.
2. Determine the best CSS selector using this priority: id > data-testid > class > tag+attributes.
3. Identify the action: "click", "type", "focus", "submit", "select", ...
4. For "select" action, determine if it's a regular select or Select2 dropdown (has class "select2-hidden-accessible").
5. For Select2, identify the option value from the DOM (not just the display text).
6. For "type" or "select" action, extract the value from the Command.
7. IMPORTANT: If the Command specifies a particular element among many similar ones (e.g., "the second button", "the last checkbox", "the button next to the user icon"), determine the correct index or relative position.
8. CRITICAL: NEVER select disabled elements. Check for all possible indicators of disabled state:
   - Elements with attribute 'disabled'
   - Elements with attribute 'aria-disabled="true"'
   - Parent elements that might contain the above attributes/classes
9. If multiple elements match your selector, but some are disabled, only consider the enabled ones for indexing.

CYPRESS CODE GENERATION INSTRUCTIONS:
1. Generate the appropriate Cypress command to interact with the element.
2. You MUST only generate Cypress code strictly for the provided command.
3. DO NOT generate Cypress code for other parts of the DOM or unrelated fields.
4. IMPORTANT: DO NOT add or assume any class, id, attribute, or state (like '.loading', '.active', ':hover', etc.) that is NOT present in the provided DOM.
5. For SELECT elements, especially when enhanced with Select2 or similar libraries (class 'select2-hidden-accessible'), always use:
   cy.get('selector').select('value', { force: true });
6. For select commands, extract the VALUE from <option value="">, not just the text.
7. Add a .should('have.value', VALUE) check after each select action.
8. ALWAYS ensure Cypress selectors target only **enabled** elements by adding :not([disabled]).
9. Avoid using placeholder attributes in selectors. Prefer data-testid, id, name, class, tagname or other stable attributes.

Output Format:
Return ONLY a single-line JSON object with both target element info and Cypress code. Do NOT include any other text, explanations, or markdown.

Structure:
{
  "selector": "<CSS selector string>",
  "action": "<action name>",
  "value": "<value string>", // Include for "type" or "select" actions
  "isSelect2": true/false,   // Include for "select" actions
  "optionValue": "<option value attribute>", // Include for "select" actions with Select2
  "index": 0,  // Include when there are multiple matching elements (0-based index)
  "positionHint": "next-to:selector", // Optional hint for relative positioning
  "isEnabled": true,
  "jsCode": "<A short, clean JavaScript snippet to execute the action>",
  "cypressCode": "<Clean Cypress code without markdown or explanations>"
}

If the command is ambiguous or the element/action cannot be determined, return JSON: {"error": "Cannot determine action or selector."}

Examples:
- Click button: {"selector": "button.primary", "action": "click", "index": 1, "cypressCode": "cy.get('button.primary:not([disabled])').eq(1).click();"}
- Select option: {"selector": "[data-testid='province-select']", "action": "select", "value": "Tỉnh An Giang", "isSelect2": true, "optionValue": "89", "cypressCode": "cy.get('[data-testid=\"province-select\"]').select('89', { force: true });\ncy.get('[data-testid=\"province-select\"]').should('have.value', '89');"}
- Type text: {"selector": "#patientName", "action": "type", "value": "John Doe", "cypressCode": "cy.get('#patientName:not([disabled])').type('John Doe');"}

---
Command: ${command}
---
DOM:
\\html
${minimizedDOM}
\\
---`;

      try {
        const result = await chat.sendMessage(combinedPrompt);
        let aiResponseText = result.response.text().trim();

        // Clean up response if it's wrapped in markdown
        if (aiResponseText.startsWith("```json")) {
          aiResponseText = aiResponseText.substring(7);
          if (aiResponseText.endsWith("```")) {
            aiResponseText = aiResponseText.substring(
              0,
              aiResponseText.length - 3
            );
          }
          aiResponseText = aiResponseText.trim();
        }

        try {
          const aiResponse = JSON.parse(aiResponseText);

          if (aiResponse.error) {
            targetElements.push({
              command,
              error: aiResponse.error,
            });
            combinedCypressCode += `// Error for "${command}": ${aiResponse.error}\n`;
            continue;
          }

          // Enhanced disabled validation for selector
          if (
            aiResponse.selector &&
            !aiResponse.selector.includes(":not([disabled])")
          ) {
            aiResponse.selector =
              aiResponse.selector +
              ':not([disabled]):not([aria-disabled="true"]):not(.disabled)';
          }

          // Add target element info
          const targetElement = {
            command,
            selector: aiResponse.selector,
            action: aiResponse.action,
            value: aiResponse.value,
            isSelect2: aiResponse.isSelect2,
            optionValue: aiResponse.optionValue,
            index: aiResponse.index,
            positionHint: aiResponse.positionHint,
            isEnabled: aiResponse.isEnabled !== false,
            jsCode: aiResponse.jsCode,
          };

          targetElements.push(targetElement);

          // Add Cypress code
          if (aiResponse.cypressCode) {
            let cypressCode = aiResponse.cypressCode.trim();

            // Clean up Cypress code if wrapped in markdown
            if (cypressCode.startsWith("```")) {
              cypressCode = cypressCode
                .replace(/```.*?\n/, "")
                .replace(/\n```/, "")
                .trim();
            }

            if (!cypressCode.endsWith(";")) {
              cypressCode += ";";
            }

            combinedCypressCode += cypressCode + "\n";
          }
        } catch (parseError) {
          console.error("Error parsing AI response:", parseError);
          targetElements.push({
            command,
            error: "Failed to parse AI response",
          });
          combinedCypressCode += `// Error parsing response for "${command}"\n`;
        }
      } catch (aiError) {
        console.error("AI error for command:", command, aiError);
        targetElements.push({
          command,
          error: aiError.message,
        });
        combinedCypressCode += `// AI Error for "${command}": ${aiError.message}\n`;
      }
    }

    // Return combined results
    res.json({
      success: true,
      targetElements,
      combinedCypressCode: combinedCypressCode.trim(),
      totalCommands: commands.length,
      processedSuccessfully: targetElements.filter((el) => !el.error).length,
    });
  } catch (error) {
    console.error("Error processing DOM with AI:", error);
    res.status(500).json({
      error: "Failed to process DOM with AI",
      details: error.message,
    });
  }
});
