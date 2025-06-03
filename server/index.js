import express from "express";
import html2pug from "html2pug";
import { setupAI } from "./utils/utils.js";


const finalHTML = `
  <div>
    <h1>Hello World</h1>
    <p>This is a paragraph</p>
  </div>
`;

const finalDOM = html2pug(finalHTML, { tabs: true });

console.log(finalDOM);

const app = express();
const port = 3000;

import cors from "cors";
// import { GoogleGenerativeAI } from "@google/generative-ai";

app.use(cors());
app.use(express.json({ limit: "5mb" })); 


app.post("/api/process-dom", async (req, res) => {
  const { dom, commandText, apiKey } = req.body;

  if (!dom || !commandText) {
    return res
      .status(400)
      .json({ error: "DOM content and command are required" });
  }

  try {
    const minimizedDOM = html2pug(dom, { tabs: true });

    const model = setupAI(apiKey);
    if (!model) {
      return res.status(500).json({ error: "Failed to initialize Gemini AI" });
    }

    const prompt = `
Your task is to act as a DOM interaction planner. Analyze the user command and the provided DOM structure. Identify the target element and the intended action.

Instructions:
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
10. Generate a JavaScript code snippet (string) that performs the action safely with target element.
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
  "isEnabled": true,
  "jsCode": "<A short, clean JavaScript snippet to execute the action>"
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

    const chat = model.startChat();
    const result = await chat.sendMessage(prompt);

    const response = result.response;

    console.log("AI response:", response);
    let aiResponseText = response.text().trim();

    if (aiResponseText.startsWith("```json")) {
      aiResponseText = aiResponseText.substring(7);
      if (aiResponseText.endsWith("```")) {
        aiResponseText = aiResponseText.substring(0, aiResponseText.length - 3);
      }
      aiResponseText = aiResponseText.trim();
    }

    try {
      const aiResponse = JSON.parse(aiResponseText);

      if (aiResponse.selector && !aiResponse.error) {
        if (!aiResponse.selector.includes(":not([disabled])")) {
          aiResponse.selector =
            aiResponse.selector +
            ':not([disabled]):not([aria-disabled="true"]):not(.disabled)';
        }

        aiResponseText = JSON.stringify(aiResponse);
      }
    } catch (e) {
      console.error("Error parsing AI response:", e);
    }
    console.log("AI response:", aiResponseText);

    // return response
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


app.post("/api/generate-cypress", async (req, res) => {
  const { dom, commandText, apiKey } = req.body;

  if (!dom || !commandText) {
    return res
      .status(400)
      .json({ error: "DOM content and command are required" });
  }

  const minimizedDOM = html2pug(dom, { tabs: true });

  const commands = Array.isArray(commandText) ? commandText : [commandText];
  let combinedCode = "";
  const individualResults = [];

  for (const command of commands) {


    const model = setupAI(apiKey);
    if (!model) {
      return res.status(500).json({ error: "Failed to initialize Gemini AI" });
    }

    const chat = model.startChat();
    console.log("Command:", command);
    const prompt = `
Your task is to generate Cypress autotest code based on the user's command and the provided DOM structure.

Instructions:
1. Analyze the user command and the provided DOM structure.
2. Identify ONLY the target element based on the command.
3. Generate the appropriate Cypress command to interact with the element. You MUST only generate Cypress code strictly for the provided command.
DO NOT generate Cypress code for other parts of the DOM or unrelated fields.
IMPORTANT: DO NOT add or assume any class, id, attribute, or state (like '.loading', '.active', ':hover', etc.) that is NOT present in the provided DOM into Cypress code.
4. Output ONLY the Cypress code. Do NOT include any other text, explanations, or markdown.
5. For SELECT elements, should use:
   cy.get('selector').select('value');
   For common elements (not input elements), prefer these custom commands:
   - cy.getButton("Button Text")
   - cy.getCheckbox("Label")
   - cy.getDialog("Title or Label")
   - cy.getMenuItem("Text")
6. Select Elements: ( not select2 )
- For any command that selects a value from a dropdown (<select>), do NOT use the .select() command.
- Instead, use the following format:
    cy.get('select-selector').getMenuItem('Visible Option Text').then($option => {
      cy.get('#select-selector').select($option.val());
    });
  where:
    - 'select-selector' is the actual selector of the <select> tag (e.g., #select-province).
    - 'Visible Option Text' is the text content of the <option> to be selected (e.g., 'Hà Nội').
- You MUST always call .get() or cy.get() on the <select> element first, and then chain .getMenuItem(...).
If the <select> has class select2-hidden-accessible or appears to be enhanced with Select2, then:
- Click the visible UI element (e.g. .select2, .select2-selection, or adjacent span).
- Click the desired option text from the dropdown list.
Example:

cy.get('#select-id').next().find('.select2-selection').click();
cy.get('.select2-results__option').contains('Visible Option Text').click();
Do not use .select() for Select2-enhanced dropdowns.


7. Add a .should('have.value', VALUE) check after each select action.
8. ALWAYS ensure Cypress selectors target only **enabled** elements.

   - Do not attempt to interact with any element that is disabled or marked as aria-disabled.
   - If there are multiple matching elements, filter by enabled ones before applying index.
9. For **input elements**, follow this priority to determine the selector method:
    a. If there is a <label for="..."> that matches the input by id, use:
       → cy.getInput("Label Text").type("...") — custom command using 'label'
    b. Else if input has a 'placeholder', use:
       → cy.getInput("Placeholder Text").type("...")
       (custom command matched by placeholder)
    c. If the input element has neither a matching label with 'for' nor a placeholder attribute, then fall back to using a standard Cypress selector targeting the element by id or class exactly as it appears in the DOM: cy.get('#id'), cy.get('.class')
10. When the user command specifies the n-th element (e.g., "the 2nd button", or "the 3rd checkbox"):
    - Use the :eq(n) selector to target the n-th element (0-based index).
11. For commands that check element visibility or disabled status, generate Cypress assertions accordingly:

To check if an element is visible:
Use .should('be.visible')

To check if an element is not visible:
Use .should('not.be.visible')

To check if an element is not disabled:
Use .should('not.be.disabled')

To check if an element is disabled:
Use .should('be.disabled')

Use the appropriate selector as per rules above (custom commands or cy.get() selectors).

12.To verify selected option:
- For commands check selected item in a select, checkbox, radio or menu like "check if 'Option Text' is selected in dropdown", use the following format:
    cy.get('select-selector')
      .getOptionValueByText('Option Text')
      .then((value) => {
        cy.get('select-selector').should('have.value', value);
      });
    Example:
Command: select "Hà Nội" in select province dropdown  
DOM:
<select id="select-province" class="select-class">
  <option value="1" id="option-1" class="option-class">Hải Dương</option>
  <option value="2" id="option-2" class="option-class">Hải Phòng</option>
  <option value="3" id="option-3" class="option-class">Hà Nội</option>
</select>
Code:
cy.get('#select-province').getMenuItem('Hà Nội').then($option => {
  cy.get('#select-province').select($option.val());
});


Command: click "Submit" button  
DOM: <button id="submitBtn">Submit</button>  
Code:  
cy.getButton("Submit").click();

Command:  type "Họ và tên" input with value "ExampleName"
DOM:
<label for="patientName">Họ và tên</label>
<input id="patientName" type="text" />
Code:
cy.getInput("Họ và tên").type("John Doe");

Command: type "Nhập họ và tên" input with value "ExampleName"
DOM:
<label>Thông tin</label>
<input placeholder="Nhập họ và tên" type="text" name="address" />
Code:
cy.getInput("Nhập họ và tên").type("Hà Nội");

Command: type "Bệnh đau đầu" into note textarea
DOM:
<textarea id="requestNote" name="note"></textarea>
Code:
cy.get('#requestNote').type("Bệnh đau đầu");

Command: type into birthYear input with value "2000"
DOM:
<input id="birthYear" class="input-class" type="text" />
Code:
cy.get('#birthYear').type("2002");

Command: check "I agree to terms" checkbox  
DOM: <label><input type="checkbox" id="agreeTerms"> I agree to terms</label>  
Code:  
cy.getCheckbox("I agree to terms").check();

Command: check if "Tiếp theo" button is visible
DOM:
<button id="nextBtn">Tiếp theo</button>
Code:
cy.getButton("Tiếp theo").should('be.visible');

Command: "Select "Chọn giới tính" dropdown and choose option "Nam""
DOM:
<label for="patientSex">Giới tính</label>
<select data-placeholder="Chọn giới tính"
        class="form-control select2-hidden-accessible"
        name="patientSex"
        data-select2-id="select2-data-patientSex">
  <option></option>
  <option value="MALE">Nam</option>
  <option value="FEMALE">Nữ</option>
</select>

<span class="selection">
  <span class="select2-selection select2-selection--single" role="combobox" aria-haspopup="true">
    <span class="select2-selection__rendered">Chọn giới tính</span>
    <span class="select2-selection__arrow" role="presentation"></span>
  </span>
</span>
Code: 
cy.get('#patientSex').next().find('.select2-selection').click();
cy.get('.select2-results__option').contains('Nam').click();



---
User Command: ${command}
---
DOM:
\`\`\`html
${minimizedDOM}
\`\`\`
Cypress Code:
`;

    try {
      const result = await chat.sendMessage(prompt);
      let text = (await result.response.text()).trim();

      console.log("Cypress AI response:", text);

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
