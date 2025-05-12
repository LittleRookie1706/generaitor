<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { useDateFormat, useLocalStorage, useScroll } from "@vueuse/core";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getMinimizedDOM } from "./utils/domUtils.js";

// Template Refs
const messagesAreaRef = ref(null);
const { y } = useScroll(messagesAreaRef);

// Reactive Gemini API Setup
const apiKey = useLocalStorage("gemini-api-key", "");
const apiKeyInput = ref("");
const genAIInstance = ref(null);
const modelInstance = ref(null);
const showApiKeyInput = ref(!apiKey.value);

// Function to initialize or update the Gemini client
const initializeGemini = (key) => {
  if (key) {
    try {
      const genAI = new GoogleGenerativeAI(key);
      genAIInstance.value = genAI;
      modelInstance.value = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite",
      });
      console.log("Gemini client initialized successfully.");
      showApiKeyInput.value = false;
    } catch (error) {
      console.error("Failed to initialize Gemini client:", error);
      showApiKeyInput.value = true;
      genAIInstance.value = null;
      modelInstance.value = null;
      messages.value.push({
        id: Date.now(),
        text: "Failed to initialize Gemini with the provided key.",
        sender: "bot",
        timestamp: Date.now(),
      });
    }
  } else {
    genAIInstance.value = null;
    modelInstance.value = null;
    console.log("Gemini client requires an API key.");
    showApiKeyInput.value = true;
  }
};

// Function to scroll messages area to bottom
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesAreaRef.value) {
      y.value = messagesAreaRef.value.scrollHeight;
    }
  });
};

// Initialize on component mount and watch for changes in stored key
watch(
  apiKey,
  (newKey) => {
    initializeGemini(newKey);
  },
  { immediate: true }
);

const saveApiKey = () => {
  apiKey.value = apiKeyInput.value;
  apiKeyInput.value = "";
  alert("API Key saved!");
};

const isApiKeySet = computed(() => !!apiKey.value);

// Chatbox State and Messages
const messages = useLocalStorage("chat-history", [
  {
    id: 1,
    text: "Hello! Ask me anything.",
    sender: "bot",
    timestamp: Date.now() - 10000,
  },
]);
const newMessage = ref("");
const isChatboxVisible = ref(false);
const isLoading = ref(false);

const formattedTimestamp = (ts) => {
  return useDateFormat(ts, "HH:mm").value;
};

// const sendMessage = async () => {
//   const userText = newMessage.value.trim();
//   if (
//     userText === "" ||
//     isLoading.value ||
//     !isApiKeySet.value ||
//     !modelInstance.value
//   ) {
//     if (!isApiKeySet.value) {
//       alert("Please set your Gemini API Key first.");
//     }
//     return;
//   }

//   // Handle both explicit newlines and "\n" as text
//   const commands = userText
//     .replace(/\\n/g, "\n") // Replace "\n" text with actual newlines
//     .split("\n")
//     .map((cmd) => cmd.trim())
//     .filter((cmd) => cmd !== ""); // Split into commands

//   if (commands.length === 0) {
//     return; // No commands to process
//   }

//   messages.value.push({
//     id: Date.now(),
//     text: `Commands: ${userText}`,
//     sender: "user",
//     timestamp: Date.now(),
//   });

//   newMessage.value = "";
//   isLoading.value = true;
//   let combinedCypressCode = "";

//   console.log("Detected commands:", commands); // Debug log

//   // Process each command separately
//   for (const commandText of commands) {
//     try {
//       const currentDOM = document.body.outerHTML;
//       const prompt = `
//           Your task is to generate Cypress autotest code based on the user's command and the provided DOM structure.

//           Instructions:
//           1. Analyze the user command and the provided DOM structure.
//           2. Identify the target element based on the command.
//           3. Generate the appropriate Cypress command to interact with the element.
//           4. IMPORTANT: For SELECT elements, especially when they appear to be enhanced with Select2 or similar libraries
//              (check for classes like 'select2-hidden-accessible'), always use the force approach:
//              cy.get('selector').select('value', { force: true })
//           5. For select commands, identify both the visible text and the actual option value from the DOM.
//           6. Always add verification steps after actions.
//           7. Output ONLY the Cypress code without any commentary. Do NOT include any explanations or markdown.

//           SPECIFIC HANDLING FOR SELECT COMMANDS:
//           - When a user command mentions selecting an option (like "select X in Y dropdown"):
//             1. Find the select element in the DOM
//             2. Look for the option with text matching what the user specified
//             3. Get the VALUE attribute of that option (not just the display text)
//             4. Use .select(VALUE, { force: true }) in the Cypress code
//             5. Add a verification step using .should('have.value', VALUE)

//           Example:
//           User Command: select "Tỉnh An Giang" in province dropdown
//           DOM: (contains <select data-testid="booking-province-droplist"><option value="89">Tỉnh An Giang</option>...)
//           Cypress Code:
//           cy.get('[data-testid="booking-province-droplist"]').select('89', { force: true });
//           cy.get('[data-testid="booking-province-droplist"]').should('have.value', '89');

//           ---
//           User Command: ${commandText}
//           ---
//           DOM:
//           \`\`\`html
//           ${currentDOM}
//           \`\`\`
//           Cypress Code:`;

//       const chat = modelInstance.value.startChat();
//       const result = await chat.sendMessage(prompt);
//       const response = await result.response;
//       let cypressCode = (await response.text()).trim();

//       console.log("Raw AI response:", cypressCode);

//       // Clean potential Markdown fences
//       if (cypressCode.startsWith("```")) {
//         cypressCode = cypressCode
//           .replace(/```.*?\n/, "")
//           .replace(/\n```/, "")
//           .trim();
//       }

//       // Clean any language specifier
//       cypressCode = cypressCode
//         .replace(/^(javascript|typescript|js|ts)$\n/i, "")
//         .trim();

//       // Ensure the cypress code uses the force option for select operations
//       if (
//         commandText.toLowerCase().includes("select") &&
//         cypressCode.includes(".select(") &&
//         !cypressCode.includes("force: true")
//       ) {
//         cypressCode = cypressCode.replace(
//           /\.select\(([^)]+)\)/,
//           ".select($1, { force: true })"
//         );
//       }

//       // Ensure there's a verification step for select operations
//       if (
//         commandText.toLowerCase().includes("select") &&
//         cypressCode.includes(".select(")
//       ) {
//         const selectorMatch = cypressCode.match(/cy\.get\(['"]([^'"]+)['"]\)/);
//         const valueMatch = cypressCode.match(/\.select\(['"]([^'"]+)['"]/);

//         if (
//           selectorMatch &&
//           valueMatch &&
//           !cypressCode.includes(".should('have.value'")
//         ) {
//           const selector = selectorMatch[1];
//           const value = valueMatch[1];

//           // Add verification if not already present
//           if (!cypressCode.includes(".should")) {
//             cypressCode += `\ncy.get('${selector}').should('have.value', '${value}');`;
//           }
//         }
//       }

//       // Add individual command response to the messages
//       messages.value.push({
//         id: Date.now() + Math.random(),
//         text: `Command: ${commandText}\nCypress Code: ${cypressCode}`,
//         sender: "bot",
//         timestamp: Date.now(),
//       });

//       // Ensure each command ends with semicolon
//       const lines = cypressCode.split("\n");
//       const formattedLines = lines.map((line) => {
//         const trimmedLine = line.trim();
//         if (trimmedLine && !trimmedLine.endsWith(";")) {
//           return trimmedLine + ";";
//         }
//         return trimmedLine;
//       });

//       combinedCypressCode += formattedLines.join("\n") + "\n\n";
//     } catch (apiError) {
//       console.error("Gemini API error:", apiError);
//       const errorMessage = `// Error generating code for command: ${commandText}\n// ${apiError.message}`;

//       // Add error message for this specific command
//       messages.value.push({
//         id: Date.now() + Math.random(),
//         text: `Command: ${commandText}\nError: ${apiError.message}`,
//         sender: "bot",
//         timestamp: Date.now(),
//       });

//       combinedCypressCode += errorMessage + "\n\n";
//     }
//   }

//   // Format the combined Cypress code and wrap in a test block if not already wrapped
//   let formattedCypressCode = combinedCypressCode.trim();
//   if (
//     !formattedCypressCode.includes("describe(") &&
//     !formattedCypressCode.includes("it(")
//   ) {
//     formattedCypressCode = `describe('User Commands Test', () => {
//   it('should execute user commands', () => {
//     cy.visit('your-website-url'); // Replace with actual URL

//     ${formattedCypressCode.replace(/^/gm, "    ")}
//   });
// });`;
//   }

//   // Add the final combined message with all Cypress code
//   messages.value.push({
//     id: Date.now() + Math.random(),
//     text: `Complete Cypress Test:\n\`\`\`javascript\n${formattedCypressCode}\n\`\`\``,
//     sender: "bot",
//     timestamp: Date.now(),
//   });

//   isLoading.value = false;
// };

//==============================

const getMinimizedDOM2 = (rootElement) => {
  if (!rootElement || typeof rootElement.cloneNode !== "function") {
    console.error("Invalid rootElement", rootElement);
    return "";
  }
  const clone = rootElement.cloneNode(true);

  // remove script, style tags
  clone.querySelectorAll("script").forEach((script) => script.remove());
  // check visible before removing style
  clone.querySelectorAll("style").forEach((styleTag) => styleTag.remove());

  // remove style attribute
  const allElementsInClone = Array.from(clone.querySelectorAll("*"));

  for (const el of allElementsInClone) {
    if (!el.parentNode) {
      continue;
    }
    const isHidden =
      el.hasAttribute("hidden") ||
      el.getAttribute("aria-hidden") === "true" ||
      el.style.display === "none" ||
      el.style.visibility === "hidden";

    const isDisabled =
      el.hasAttribute("disabled") ||
      el.getAttribute("aria-disabled") === "true";
    if (!isHidden && !isDisabled) {
      el.removeAttribute("style");
    }

    // remove event handlers
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith("on")) {
        el.removeAttribute(attr.name);
      }
    });
  }

  return clone.outerHTML;
};

const sendMessage2 = async () => {
  const userText = newMessage.value.trim();
  if (
    userText === "" ||
    isLoading.value ||
    !isApiKeySet.value ||
    !modelInstance.value
  ) {
    if (!isApiKeySet.value) {
      alert("Please set your Gemini API Key first.");
    }
    return;
  }

  // Handle both explicit newlines and "\n" as text
  const commands = userText
    .replace(/\\n/g, "\n") // Replace "\n" text with actual newlines
    .split("\n")
    .map((cmd) => cmd.trim())
    .filter((cmd) => cmd !== ""); // Split into commands

  if (commands.length === 0) {
    return; // No commands to process
  }

  messages.value.push({
    id: Date.now(),
    text: `Commands: ${userText}`,
    sender: "user",
    timestamp: Date.now(),
  });

  newMessage.value = "";
  isLoading.value = true;
  let combinedCypressCode = "";

  console.log("Detected commanddds:", commands); // Debug log

  // Process each command separately
  for (const commandText of commands) {
    try {
      const currentDOM = document.body.outerHTML;
      const prompt = `
          Your task is to generate Cypress autotest code based on the user's command and the provided DOM structure.

          Instructions:
          1.  Analyze the user command and the provided DOM structure.
          2.  Identify the target element based on the command.
          3.  Generate the appropriate Cypress command to interact with the element.
          4.  Output ONLY the Cypress code. Do NOT include any other text, explanations, or markdown.
          5.  For SELECT elements, especially when they appear to be enhanced with Select2 or similar libraries (check for classes like 'select2-hidden-accessible'), always use the force approach:
              cy.get('selector').select('value', { force: true })
          6.  For select commands, identify both the visible text and the actual option value from the DOM.
          
          SPECIFIC HANDLING FOR SELECT COMMANDS:
           - When a user command mentions selecting an option (like "select X in Y dropdown"):
             1. Find the select element in the DOM
             2. Look for the option with text matching what the user specified
             3. Get the VALUE attribute of that option (not just the display text)
             4. Use .select(VALUE, { force: true }) in the Cypress code
             5. Add a verification step using .should('have.value', VALUE)
          Example:
          User Command: select "Tỉnh An Giang" in province dropdown
           DOM: (contains <select data-testid="booking-province-droplist"><option value="89">Tỉnh An Giang</option>...)
           Cypress Code:
           cy.get('[data-testid="booking-province-droplist"]').select('89', { force: true });
           cy.get('[data-testid="booking-province-droplist"]').should('have.value', '89');
          User Command: click a time slot button (eg: 09:30 - 10:00)
          DOM:
          \`\`\`html
          <button class="time-slot" data-time="09:30-10:00">09:30 - 10:00</button>
          \`\`\`
          Cypress Code:
          it('should click time slot', () => {
            cy.get('button.time-slot[data-time="09:30-10:00"]').click()

          });

          ---
          User Command: ${commandText}
          ---
          DOM:
          \`\`\`html
          ${currentDOM}
          \`\`\`
          Cypress Code:`;

      const chat = modelInstance.value.startChat();
      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      let cypressCode = (await response.text()).trim();

      console.log("Raw AI response:", cypressCode);

      // Clean potential Markdown fences
      if (cypressCode.startsWith("```")) {
        cypressCode = cypressCode
          .replace(/```.*?\n/, "")
          .replace(/\n```/, "")
          .trim();
      }

      // Add individual command response to the messages
      messages.value.push({
        id: Date.now() + Math.random(),
        text: `Command: ${commandText}\nCypress Code: ${cypressCode}`,
        sender: "bot",
        timestamp: Date.now(),
      });

      // Add a semicolon if needed and ensure each command is on a new line
      if (!cypressCode.trim().endsWith(";")) {
        cypressCode = cypressCode.trim() + ";";
      }
      combinedCypressCode += cypressCode + "\n"; // Append to combined code
    } catch (apiError) {
      console.error("Gemini API error:", apiError);
      const errorMessage = `// Error generating code for command: ${commandText}\n// ${apiError.message}`;

      // Add error message for this specific command
      messages.value.push({
        id: Date.now() + Math.random(),
        text: `Command: ${commandText}\nError: ${apiError.message}`,
        sender: "bot",
        timestamp: Date.now(),
      });

      combinedCypressCode += errorMessage + "\n";
    }
  }

  // Format the combined Cypress code for better readability
  const formattedCypressCode = combinedCypressCode
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => line.trim())
    .join("\n");

  // Add the final combined message with all Cypress code
  messages.value.push({
    id: Date.now() + Math.random(),
    text: `Complete Cypress Test:\n${formattedCypressCode}`,
    sender: "bot",
    timestamp: Date.now(),
  });

  isLoading.value = false;
};

// =================================

// last version ================

// DOM is minimized: hidden elements removed, scripts/styles removed, 'disabled' attribute preserved.

const sendMessageAct = async () => {
  const userText = newMessage.value.trim();
  if (
    userText === "" ||
    isLoading.value ||
    !isApiKeySet.value ||
    !modelInstance.value
  ) {
    if (!isApiKeySet.value) {
      alert("Please set your Gemini API Key first.");
    }
    return;
  }

  const commands = userText
    .split("\n")
    .map((cmd) => cmd.trim())
    .filter((cmd) => cmd !== "");

  if (commands.length === 0) return;

  messages.value.push({
    id: Date.now(),
    text: `Commands: ${userText}`,
    sender: "user",
    timestamp: Date.now(),
  });

  newMessage.value = "";
  isLoading.value = true;

  for (const commandText of commands) {
    try {
      let baseElementForDom = document.body;
      const locationMatch = commandText.match(/inLocation\s+([a-zA-Z0-9-_]+)/i);
      if (locationMatch && locationMatch[1]) {
        const selector = "." + locationMatch[1].replace(/[^a-zA-Z0-9-_]/g, "");
        const section = document.querySelector(selector);
        if (section) {
          baseElementForDom = section;
        }
      }

      const currentDOM = baseElementForDom;
      console.log("Current DOM:", currentDOM);

      const prompt = `
Your task is to act as a DOM interaction planner. Analyze the user command and the provided DOM structure. Identify the target element and the intended action.

Instructions:
 IMPORTANT:  Filtering out all disabled elements. Skip elements with attribute disabled="true", disabled="disabled" or disabled
1. Find the target element based on the Command and DOM.
2. Determine the best CSS selector using this priority: id > data-testid > class > tag+attributes.
3. Identify the action: "click", "type", "focus", "submit", "select".
4. For "select" action, determine if it's a regular select or Select2 dropdown (has class "select2-hidden-accessible").
5. For Select2, identify the option value from the DOM (not just the display text).
6. If action is "type" or "select", extract the value from the Command.
7. If the Command specifies a particular element among many similar ones (e.g., "the second button", "the last checkbox", "the button next to the user icon"), determine the correct index or relative position.


Output Format:
Return ONLY a single-line JSON object. Do NOT include any other text, explanations, or markdown.
Structure:
{
  "selector": "<CSS selector string>",
  "action": "<action name>",
  "value": "<value string>", 
  "isSelect2": true/false,   
  "optionValue": "<option value attribute>",
  "index": 0,
  "positionHint": "next-to:selector"
}

---
Command: ${commandText}
---
DOM:
\`\`\`html
${currentDOM}
\`\`\`
---
JavaScript Code:`;

      const chat = modelInstance.value.startChat();
      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      let aiResponseText = (await response.text()).trim();

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
        const actionData = JSON.parse(aiResponseText);

        if (actionData.error) {
          messages.value.push({
            id: Date.now() + 1,
            text: `AI Error: ${actionData.error}`,
            sender: "bot",
            timestamp: Date.now(),
          });
        } else if (actionData.selector && actionData.action) {
          const allMatchingElements = document.querySelectorAll(
            actionData.selector
          );
          let targetElement = null;

          if (allMatchingElements.length === 0) {
            messages.value.push({
              id: Date.now() + 1,
              text: `Error: No elements found for selector: ${actionData.selector}`,
              sender: "bot",
              timestamp: Date.now(),
            });
            continue;
          } else if (allMatchingElements.length > 1) {
            if (
              typeof actionData.index === "number" &&
              actionData.index >= 0 &&
              actionData.index < allMatchingElements.length
            ) {
              targetElement = allMatchingElements[actionData.index];
            } else if (actionData.positionHint?.startsWith("next-to:")) {
              const nearbySelector = actionData.positionHint.substring(8);
              const referenceElement = document.querySelector(nearbySelector);

              if (referenceElement) {
                let closestElement = null;
                let closestDistance = Infinity;
                const refRect = referenceElement.getBoundingClientRect();
                const refMidX = refRect.left + refRect.width / 2;
                const refMidY = refRect.top + refRect.height / 2;

                allMatchingElements.forEach((element) => {
                  const rect = element.getBoundingClientRect();
                  const midX = rect.left + rect.width / 2;
                  const midY = rect.top + rect.height / 2;
                  const distance = Math.sqrt(
                    Math.pow(midX - refMidX, 2) + Math.pow(midY - refMidY, 2)
                  );

                  if (distance < closestDistance) {
                    closestDistance = distance;
                    closestElement = element;
                  }
                });

                targetElement = closestElement;
              }
            } else {
              targetElement = allMatchingElements[0];
            }
          } else {
            targetElement = allMatchingElements[0];
          }

          if (!targetElement) {
            messages.value.push({
              id: Date.now() + 1,
              text: `Error: Could not determine which element to interact with`,
              sender: "bot",
              timestamp: Date.now(),
            });
          } else {
            let actionDescription = `${actionData.action} on ${actionData.selector}`;
            if (typeof actionData.index === "number") {
              actionDescription += ` (element #${actionData.index + 1})`;
            }

            switch (actionData.action.toLowerCase()) {
              case "click":
                targetElement.click();
                break;

              case "select":
                if (targetElement instanceof HTMLSelectElement) {
                  let optionValue = null;

                  // If we have a specific option value from AI
                  if (actionData.optionValue) {
                    optionValue = actionData.optionValue;
                  }
                  // Otherwise, try to find the option by text
                  else if (actionData.value) {
                    const options = Array.from(targetElement.options);
                    const matchingOption = options.find((option) =>
                      option.textContent.trim().includes(actionData.value)
                    );
                    if (matchingOption) {
                      optionValue = matchingOption.value;
                    }
                  }

                  if (optionValue !== null) {
                    // Set the value directly (using force approach)
                    targetElement.value = optionValue;
                    actionDescription += ` with value "${optionValue}" (${
                      actionData.value || ""
                    })`;

                    // Trigger events to notify frameworks like Select2
                    // Use force approach by manually dispatching events
                    targetElement.dispatchEvent(
                      new Event("change", { bubbles: true })
                    );

                    // For Select2 specifically, we might need additional triggers
                    if (
                      actionData.isSelect2 ||
                      targetElement.classList.contains(
                        "select2-hidden-accessible"
                      )
                    ) {
                      // Try to update the Select2 display
                      if (
                        window.jQuery &&
                        window.jQuery(targetElement).data("select2")
                      ) {
                        window.jQuery(targetElement).trigger("change");
                      }

                      actionDescription += " (Select2 force approach)";
                    }
                  } else {
                    throw new Error(
                      `Option "${actionData.value}" not found in select element.`
                    );
                  }
                } else {
                  throw new Error(`'select' action requires a SELECT element.`);
                }
                break;

              // case "select":
              //   if (targetElement instanceof HTMLSelectElement) {
              //     let optionValue = actionData.optionValue || null;
              //     if (!optionValue && actionData.value) {
              //       const options = Array.from(targetElement.options);
              //       const matchingOption = options.find((option) =>
              //         option.textContent.trim().includes(actionData.value)
              //       );
              //       if (matchingOption) {
              //         optionValue = matchingOption.value;
              //       }
              //     }

              //     if (optionValue !== null) {
              //       targetElement.value = optionValue;
              //       actionDescription += ` with value "${optionValue}" (${actionData.value || ""})`;
              //       targetElement.dispatchEvent(new Event("change", { bubbles: true }));

              //       if (
              //         actionData.isSelect2 ||
              //         targetElement.classList.contains("select2-hidden-accessible")
              //       ) {
              //         if (window.jQuery && window.jQuery(targetElement).data("select2")) {
              //           window.jQuery(targetElement).trigger("change");
              //         }
              //         actionDescription += " (Select2 force approach)";
              //       }
              //     } else {
              //       throw new Error(`Option "${actionData.value}" not found in select element.`);
              //     }
              //   } else {
              //     throw new Error(`'select' action requires a SELECT element.`);
              //   }
              //   break;

              case "type":
                if (typeof actionData.value === "string") {
                  if (
                    targetElement instanceof HTMLInputElement ||
                    targetElement instanceof HTMLTextAreaElement
                  ) {
                    targetElement.value = actionData.value;
                    actionDescription += ` with value "${actionData.value}"`;
                    targetElement.dispatchEvent(
                      new Event("input", { bubbles: true })
                    );
                    targetElement.dispatchEvent(
                      new Event("change", { bubbles: true })
                    );
                  } else {
                    throw new Error(
                      `Element for 'type' is not an input or textarea.`
                    );
                  }
                } else {
                  throw new Error(`'type' action requires a 'value' string.`);
                }
                break;

              case "focus":
                targetElement.focus();
                break;

              case "submit":
                if (targetElement instanceof HTMLFormElement) {
                  targetElement.submit();
                } else if (targetElement.form) {
                  targetElement.form.submit();
                } else {
                  throw new Error(
                    `Cannot 'submit' element directly, and it's not part of a form.`
                  );
                }
                break;

              default:
                throw new Error(`Unsupported action: ${actionData.action}`);
            }

            messages.value.push({
              id: Date.now() + 1,
              text: `Executed: ${actionDescription}`,
              sender: "bot",
              timestamp: Date.now(),
            });
          }
        } else {
          throw new Error("Invalid JSON structure received from AI.");
        }
      } catch (parseOrExecError) {
        console.error("JSON parsing or DOM execution error:", parseOrExecError);
        messages.value.push({
          id: Date.now() + 1,
          text: `Execution Error: ${parseOrExecError.message}. AI Response: ${aiResponseText}`,
          sender: "bot",
          timestamp: Date.now(),
        });
      }
    } catch (apiError) {
      console.error("Gemini API error:", apiError);
      messages.value.push({
        id: Date.now() + 1,
        text: "Error communicating with AI. Please check API key and console.",
        sender: "bot",
        timestamp: Date.now(),
      });
    }
  }

  isLoading.value = false;
};

// select dropdown OK =====================

const sendMessage = async () => {

  const userText = newMessage.value.trim();
  if (
    userText === "" ||
    isLoading.value ||
    !isApiKeySet.value ||
    !modelInstance.value
  ) {
    if (!isApiKeySet.value) {
      alert("Please set your Gemini API Key first.");
    }
    return;
  }

  const commands = userText
    .split("\n")
    .map((cmd) => cmd.trim())
    .filter((cmd) => cmd !== "");
  if (commands.length === 0) {
    return;
  }

  messages.value.push({
    id: Date.now(),
    text: `Commands: ${userText}`,
    sender: "user",
    timestamp: Date.now(),
  });

  newMessage.value = "";
  isLoading.value = true;

  for (const commandText of commands) {
    try {
      const currentDOM = getMinimizedDOM(document.body);

      console.log("Current DOM:", currentDOM);
      const prompt = `
Your task is to act as a DOM interaction planner. Analyze the user command and the provided DOM structure. Identify the target element and the intended action.

Instructions:
1. Find the target element based on the Command and DOM.
2. Determine the best CSS selector using this priority: id > data-testid > class > tag+attributes.
3. Identify the action: "click", "type", "focus", "submit", "select".
4. For "select" action, determine if it's a regular select or Select2 dropdown (has class "select2-hidden-accessible").
5. For Select2, identify the option value from the DOM (not just the display text).
6. If action is "type" or "select", extract the value from the Command.
7. IMPORTANT: If the Command specifies a particular element among many similar ones (e.g., "the second button", "the last checkbox", "the button next to the user icon"), determine the correct index or relative position.

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
${currentDOM}
\`\`\`
---
JavaScript Code:`;

      const chat = modelInstance.value.startChat();
      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      let aiResponseText = (await response.text()).trim();

      console.log("Raw AI response:", aiResponseText);

      if (aiResponseText.startsWith("```json")) {
        aiResponseText = aiResponseText.substring(7);
        if (aiResponseText.endsWith("```")) {
          aiResponseText = aiResponseText.substring(
            0,
            aiResponseText.length - 3
          );
        }
        aiResponseText = aiResponseText.trim();
        console.log("Cleaned AI response:", aiResponseText);
      }

      try {
        const actionData = JSON.parse(aiResponseText);

        if (actionData.error) {
          messages.value.push({
            id: Date.now() + 1,
            text: `AI Error: ${actionData.error}`,
            sender: "bot",
            timestamp: Date.now(),
          });
        } else if (actionData.selector && actionData.action) {
          // Query all matching elements
          const allMatchingElements = document.querySelectorAll(
            actionData.selector
          );
          let targetElement = null;

          if (allMatchingElements.length === 0) {
            messages.value.push({
              id: Date.now() + 1,
              text: `Error: No elements found for selector: ${actionData.selector}`,
              sender: "bot",
              timestamp: Date.now(),
            });
            continue;
          }
          // Handle multiple matching elements with index
          else if (allMatchingElements.length > 1) {
            // If we have an index specified, use it
            if (
              typeof actionData.index === "number" &&
              actionData.index >= 0 &&
              actionData.index < allMatchingElements.length
            ) {
              targetElement = allMatchingElements[actionData.index];
            }
            // Handle position hints if provided
            else if (actionData.positionHint) {
              if (actionData.positionHint.startsWith("next-to:")) {
                const nearbySelector = actionData.positionHint.substring(8);
                const referenceElement = document.querySelector(nearbySelector);

                if (referenceElement) {
                  // Find the element closest to the reference element
                  let closestElement = null;
                  let closestDistance = Infinity;

                  const refRect = referenceElement.getBoundingClientRect();
                  const refMidX = refRect.left + refRect.width / 2;
                  const refMidY = refRect.top + refRect.height / 2;

                  allMatchingElements.forEach((element) => {
                    const rect = element.getBoundingClientRect();
                    const midX = rect.left + rect.width / 2;
                    const midY = rect.top + rect.height / 2;

                    // Calculate Euclidean distance
                    const distance = Math.sqrt(
                      Math.pow(midX - refMidX, 2) + Math.pow(midY - refMidY, 2)
                    );

                    if (distance < closestDistance) {
                      closestDistance = distance;
                      closestElement = element;
                    }
                  });

                  targetElement = closestElement;
                }
              }
            }
            // Default to the first element if no index or position hint
            else {
              targetElement = allMatchingElements[0];
            }
          }
          // Single element case
          else {
            targetElement = allMatchingElements[0];
          }

          if (!targetElement) {
            messages.value.push({
              id: Date.now() + 1,
              text: `Error: Could not determine which element to interact with`,
              sender: "bot",
              timestamp: Date.now(),
            });
          } else {
            let actionDescription = `${actionData.action} on ${actionData.selector}`;
            if (typeof actionData.index === "number") {
              actionDescription += ` (element #${actionData.index + 1})`;
            }

            switch (actionData.action.toLowerCase()) {
              case "click":
                // For click actions, we still use regular click
                targetElement.click();
                break;

              case "select":
                if (targetElement instanceof HTMLSelectElement) {
                  let optionValue = null;

                  // If we have a specific option value from AI
                  if (actionData.optionValue) {
                    optionValue = actionData.optionValue;
                  }
                  // Otherwise, try to find the option by text
                  else if (actionData.value) {
                    const options = Array.from(targetElement.options);
                    const matchingOption = options.find((option) =>
                      option.textContent.trim().includes(actionData.value)
                    );
                    if (matchingOption) {
                      optionValue = matchingOption.value;
                    }
                  }

                  if (optionValue !== null) {
                    // Set the value directly (using force approach)
                    targetElement.value = optionValue;
                    actionDescription += ` with value "${optionValue}" (${
                      actionData.value || ""
                    })`;

                    // Trigger events to notify frameworks like Select2
                    // Use force approach by manually dispatching events
                    targetElement.dispatchEvent(
                      new Event("change", { bubbles: true })
                    );

                    // For Select2 specifically, we might need additional triggers
                    if (
                      actionData.isSelect2 ||
                      targetElement.classList.contains(
                        "select2-hidden-accessible"
                      )
                    ) {
                      // Try to update the Select2 display
                      if (
                        window.jQuery &&
                        window.jQuery(targetElement).data("select2")
                      ) {
                        window.jQuery(targetElement).trigger("change");
                      }

                      actionDescription += " (Select2 force approach)";
                    }
                  } else {
                    throw new Error(
                      `Option "${actionData.value}" not found in select element.`
                    );
                  }
                } else {
                  throw new Error(`'select' action requires a SELECT element.`);
                }
                break;

              case "type":
                if (typeof actionData.value === "string") {
                  if (
                    targetElement instanceof HTMLInputElement ||
                    targetElement instanceof HTMLTextAreaElement
                  ) {
                    targetElement.value = actionData.value;
                    actionDescription += ` with value "${actionData.value}"`;
                    targetElement.dispatchEvent(
                      new Event("input", { bubbles: true })
                    );
                    targetElement.dispatchEvent(
                      new Event("change", { bubbles: true })
                    );
                  } else {
                    throw new Error(
                      `Element for 'type' is not an input or textarea.`
                    );
                  }
                } else {
                  throw new Error(`'type' action requires a 'value' string.`);
                }
                break;

              case "focus":
                targetElement.focus();
                break;

              case "submit":
                if (targetElement instanceof HTMLFormElement) {
                  targetElement.submit();
                } else if (targetElement.form) {
                  targetElement.form.submit();
                } else {
                  throw new Error(
                    `Cannot 'submit' element directly, and it's not part of a form.`
                  );
                }
                break;

              default:
                throw new Error(`Unsupported action: ${actionData.action}`);
            }

            messages.value.push({
              id: Date.now() + 1,
              text: `Executed: ${actionDescription}`,
              sender: "bot",
              timestamp: Date.now(),
            });
          }
        } else {
          throw new Error("Invalid JSON structure received from AI.");
        }
      } catch (parseOrExecError) {
        console.error("JSON parsing or DOM execution error:", parseOrExecError);
        messages.value.push({
          id: Date.now() + 1,
          text: `Execution Error: ${parseOrExecError.message}. AI Response: ${aiResponseText}`,
          sender: "bot",
          timestamp: Date.now(),
        });
      }
    } catch (apiError) {
      console.error("Gemini API error:", apiError);
      messages.value.push({
        id: Date.now() + 1,
        text: "Error communicating with AI. Please check API key and console.",
        sender: "bot",
        timestamp: Date.now(),
      });
    }
  }
  isLoading.value = false;
};

watch(isChatboxVisible, async (isVisible) => {
  if (isVisible) {
    await nextTick();
    scrollToBottom();
  }
});

// Watch for new messages to scroll down (only if visible)
watch(
  messages,
  () => {
    if (isChatboxVisible.value) {
      scrollToBottom();
    }
  },
  { deep: true }
);
</script>

<template lang="pug">
// Floating button to open the chatbox
button.open-chat-btn(v-if="!isChatboxVisible" @click="isChatboxVisible = true") 💬

// The actual chatbox container, shown only when isChatboxVisible is true
.chatbox-container(v-if="isChatboxVisible")
  .chatbox-header
    h1 Simple Chatboty
    button.close-btn(@click="isChatboxVisible = false") &times;

  // Conditionally render the main content (now always rendered if container is visible)
  .chatbox-content
    // Add ref to the messages area
    .messages-area(ref="messagesAreaRef")
      // Add loading indicator
      .loading-indicator(v-if="isLoading") Thinking...
      // Update class binding to use 'user' and 'bot'
      .message(v-for="msg in messages" :key="msg.id" :class="['message-' + msg.sender]")
        .message-content {{ msg.text }}
        .timestamp {{ formattedTimestamp(msg.timestamp) }}
    //- .input-area
    //-   // Disable input and button when loading or API key not set
    //-   //input(type="textarea" v-model="newMessage" @keyup.enter="sendMessage" :disabled="isLoading || !isApiKeySet" placeholder="Type your message...")
    //-   textarea(v-model="newMessage" @keydown.enter.exact.prevent="sendMessage" :disabled="isLoading || !isApiKeySet" placeholder="Type your message..." rows="4")
      
    //-   button(@click="sendMessage" :disabled="isLoading || !isApiKeySet") Send

    .input-area
      textarea(
        v-model="newMessage" 
        @keydown.enter.exact.prevent="sendMessage" 
        :disabled="isLoading || !isApiKeySet" 
        placeholder="Type your message..." 
        rows="4"
      )
      .button-container
        button(
          @click="sendMessage" 
          :disabled="isLoading || !isApiKeySet"
        ) Send
    
    //- .input-area
    //-   // Disable textarea and button when loading or API key not set
    //-   textarea(v-model="newMessage" @keydown.enter.exact.prevent="sendMessage" :disabled="isLoading || !isApiKeySet" placeholder="Type your message..." rows="4")
    //-   button(@click="sendMessage" :disabled="isLoading || !isApiKeySet") Send

    //- .input-area
    //-   .input-container
    //-     textarea.message-input(
    //-       v-model="newMessage"
    //-       placeholder="Type your message..."
    //-       rows="3"
    //-       :disabled="isLoading || !isApiKeySet"
    //-       @keydown.enter.exact.prevent="sendMessage"
    //-     )
    //-     button.send-btn(
    //-       @click="sendMessage"
    //-       :disabled="isLoading || !isApiKeySet"
    //-     ) Send


    // API Key Input Area - Conditionally rendered
    .api-key-area(v-if="showApiKeyInput")
      p(v-if="!isApiKeySet" class="api-key-warning") Please set your Gemini API Key below to enable chat.
      div.api-key-input-group
        input(type="password" v-model="apiKeyInput" placeholder="Enter Gemini API Key" @keyup.enter="saveApiKey")
        button(@click="saveApiKey") Save Key

</template>

<style scoped>
/* Styles for the floating chatbox */
.chatbox-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 350px; /* Fixed width */
  height: 500px; /* Fixed height */
  max-height: 80vh; /* Limit height based on viewport */
  display: flex; /* Keep flex for internal layout */
  flex-direction: column;
  border: 1px solid #ccc;
  border-radius: 8px;
  overflow: hidden; /* Keep overflow hidden */
  font-family: sans-serif;
  background-color: white; /* Add background */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); /* Add shadow */
  z-index: 9999; /* Ensure it's on top */
  transition: opacity 0.3s ease, transform 0.3s ease; /* Add transition for appearing/disappearing */
}

/* Styles for the floating open chat button */
.open-chat-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 60px;
  height: 60px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 1.5em; /* Adjust icon size */
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 9998; /* Below chatbox, but above page content */
  transition: background-color 0.3s ease;
}
.open-chat-btn:hover {
  background-color: #45a049;
}

.chatbox-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px; /* Adjust padding */
  background-color: #f1f1f1;
  border-bottom: 1px solid #ccc;
  min-height: 40px; /* Ensure header has some height */
}

h1 {
  /* text-align: center; */ /* No longer needed with flex */
  padding: 10px 0; /* Adjust padding */
  margin: 0;
  /* background-color: #f1f1f1; */ /* Moved to header */
  font-size: 1.1em; /* Slightly smaller */
  /* border-bottom: 1px solid #ccc; */ /* Moved to header */
  flex-grow: 1; /* Allow title to take space */
  text-align: center; /* Center title text */
}

.close-btn,
.open-btn {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  padding: 0 5px;
  color: #555;
  line-height: 1;
}
.close-btn:hover {
  color: #000;
}
/* Removed .open-btn styles as it's replaced by .open-chat-btn */

/* Container for messages and input */
.chatbox-content {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden; /* Important for flex layout */
}

.messages-area {
  flex-grow: 1; /* Takes available space within chatbox-content */
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-color: #f9f9f9;
}

.message {
  padding: 8px 12px;
  border-radius: 15px;
  max-width: 70%;
  word-wrap: break-word;
}

/* Renamed from .message-me */
.message-user {
  background-color: #dcf8c6;
  align-self: flex-end;
  text-align: right;
}

/* Rename message-other to message-bot and adjust style */
.message-bot {
  background-color: #e5e5ea; /* Different background for bot */
  color: #000;
  align-self: flex-start;
  /* border: 1px solid #eee; */ /* Optional: remove or adjust border */
}

.message-content {
  margin-bottom: 3px;
}

.timestamp {
  font-size: 0.7em;
  color: #888;
}

.input-area {
  padding: 10px;
  border-top: 1px solid #ccc;
  background-color: #f1f1f1;
  display: flex;
  flex-direction: column;
}

.input-area textarea {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 20px;
  width: 100%;
  margin-bottom: 10px;
  resize: vertical;
}

.button-container {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

.input-area button {
  padding: 10px 15px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
}

/* .input-area {

  padding: 10px;
  border-top: 1px solid #ccc;
  background-color: #f1f1f1;
}

.input-area textarea {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 20px;
  margin-right: 10px;
  width: 100%;
}

.input-area button {
  padding: 10px 15px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
} */

.input-area button:hover {
  background-color: #45a049;
}

/* Style for loading indicator */
.loading-indicator {
  text-align: center;
  padding: 10px;
  color: #888;
  font-style: italic;
}

/* Disable input/button when loading */
.input-area input:disabled,
.input-area button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Styles for API Key Input Area */
.api-key-area {
  padding: 10px;
  border-top: 1px dashed #ccc; /* Dashed border to separate */
  background-color: #f9f9f9;
}

.api-key-warning {
  color: #d9534f; /* Red warning color */
  font-size: 0.9em;
  margin-bottom: 5px;
  text-align: center;
}

.api-key-input-group {
  display: flex;
  gap: 10px;
}

.api-key-input-group input {
  flex-grow: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.api-key-input-group button {
  padding: 8px 12px;
  background-color: #5bc0de; /* Info blue */
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}
.api-key-input-group button:hover {
  background-color: #31b0d5;
}
</style>
