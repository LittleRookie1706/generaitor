//import html2pug from "html2pug";

// export const getMinimizedDOM = (rootElement) => {
//   alert("getMinimizedDOM");
//   if (!rootElement || typeof rootElement.cloneNode !== "function") {
//     console.error("Invalid rootElement", rootElement);
//     return "";
//   }
//   const clone = rootElement.cloneNode(true);
//   console.log("Cloned DOM:", clone);

//   // 1. remove script
//   clone.querySelectorAll("script").forEach((script) => script.remove());

//   // 2. find all elements with hidden / disabled attributes
  
//   const disabledOrHiddenElements = new Set();
//   const allElements = Array.from(clone.querySelectorAll("*"));

//   for (const el of allElements) {
//     const isHidden =
//       el.style.display === "none" ||
//       el.style.visibility === "hidden" ||
//       el.style.hidden === "true";

//     const isDisabled = el.style.disabled === "true";

//     if (isHidden || isDisabled) {
//       disabledOrHiddenElements.add(el);
//     }
//   }
//   // const disabledOrHiddenElements = new Set();
//   // const allElements = Array.from(clone.querySelectorAll("*"));

//   // for (const el of allElements) {
//   //   const isHidden =
//   //     el.hasAttribute("hidden") ||
//   //     el.getAttribute("aria-hidden") === "true" ||
//   //     el.style.display === "none" ||
//   //     el.style.visibility === "hidden";

//   //   const isDisabled =
//   //     el.hasAttribute("disabled") ||
//   //     el.getAttribute("aria-disabled") === "true";

//   //   if (isHidden || isDisabled) {
//   //     disabledOrHiddenElements.add(el);

//   //     el.querySelectorAll("*").forEach((child) => {
//   //       disabledOrHiddenElements.add(child);
//   //     });
//   //   }
//   // }

//   // 3. remove style tags
//   const styleTags = Array.from(clone.querySelectorAll("style"));

//   for (const styleTag of styleTags) {
//     let shouldKeep = false;

//     if (disabledOrHiddenElements.has(styleTag)) {
//       shouldKeep = true;
//     } else {
//       // check content of style tag
//       const styleContent = styleTag.textContent;

//       for (const el of disabledOrHiddenElements) {
//         if (
//           styleContent.includes("[disabled]") ||
//           styleContent.includes("[hidden]") ||
//           styleContent.includes('[aria-hidden="true"]')
//         ) {
//           shouldKeep = true;
//           break;
//         }
//       }
//     }

//     // remove style tag
//     if (!shouldKeep) {
//       styleTag.remove();
//     }
//   }

//   // 4. remove style, event handlers
//   for (const el of allElements) {

//     if (!disabledOrHiddenElements.has(el)) {
//       el.removeAttribute("style");
//     }
//     Array.from(el.attributes).forEach((attr) => {
//       if (attr.name.startsWith("on")) {
//         el.removeAttribute(attr.name);
//       }
//     });
//   }

//   const finalHTML = clone.outerHTML;
//   //const finalDOM = html2pug(finalHTML, { tabs: true });

//   const bytes = new TextEncoder().encode(finalHTML).length;
//   const kb = bytes / 1024;
//   const mb = kb / 1024;

//   console.log(`DOM size: ${kb.toFixed(2)} KB (${mb.toFixed(2)} MB)`);

//   return finalHTML;
// };


// export function getMinimizedDOM(rootElement) {
//   if (!rootElement || typeof rootElement.cloneNode !== "function") {
//     console.error("Invalid rootElement", rootElement);
//     return "";
//   }
  
//   const clone = rootElement.cloneNode(true);
  
//   // remove script
//   clone.querySelectorAll("script").forEach((script) => script.remove());
  
//   // remove hidden elements
//   const elementsToRemove = new Set();
//   const allElements = Array.from(clone.querySelectorAll("*"));
  
//   for (const el of allElements) {
//     const style = el.getAttribute('style') || '';
//     const isHiddenByStyle = style.includes('display: none') || style.includes('visibility: hidden') || style.includes('opacity: 0');
    
//     const isHiddenByAttr = el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true';
    
//     if (isHiddenByStyle || isHiddenByAttr) {
//       elementsToRemove.add(el);
//       el.querySelectorAll("*").forEach(child => {
//         elementsToRemove.add(child);
//       });
//     }
//   }

//   const elementsToRemoveArray = Array.from(elementsToRemove);
//   for (let i = elementsToRemoveArray.length - 1; i >= 0; i--) {
//     const element = elementsToRemoveArray[i];
//     if (element.parentNode) {
//       element.parentNode.removeChild(element);
//     }
//   }
  
//   // const styleElements = clone.querySelectorAll("style");
//   // styleElements.forEach(style => style.remove());

//   const cssHidingSelectors = [];

//   clone.querySelectorAll("style").forEach((styleTag) => {
//     const styleSheet = new CSSStyleSheet();
//     styleSheet.replaceSync(styleTag.textContent);

//     for (const rule of styleSheet.cssRules) {
//       if (rule.type === CSSRule.STYLE_RULE) {
//         const cssText = rule.style.cssText;
//         const isHiddenByCSS =
//           cssText.includes("display: none") ||
//           cssText.includes("visibility: hidden") ||
//           cssText.includes("opacity: 0");

//         if (isHiddenByCSS) {
//           cssHidingSelectors.push(rule.selectorText);
//         }
//       }
//     }
    
//   });

//   cssHidingSelectors.forEach((selector) => {
//     clone.querySelectorAll(selector).forEach((el) => el.remove());
//   });

//   clone.querySelectorAll("*").forEach((el) => {
//     el.removeAttribute("style");

//     Array.from(el.attributes).forEach((attr) => {
//       if (attr.name.startsWith("on")) {
//         el.removeAttribute(attr.name);
//       }
//     });
//   });
  
  
//   // const remainingElements = Array.from(clone.querySelectorAll("*"));
  
//   // for (const el of remainingElements) {
//   //   el.removeAttribute("style");
    
//   //   Array.from(el.attributes).forEach((attr) => {
//   //     if (attr.name.startsWith("on")) {
//   //       el.removeAttribute(attr.name);
//   //     }
//   //   });
    

//   // }
  
//   // Convert to HTML string
//   const finalHTML = clone.outerHTML;
  
//   const bytes = new TextEncoder().encode(finalHTML).length;
//   const kb = bytes / 1024;
//   const mb = kb / 1024;
//   console.log(`Minimized DOM size: ${kb.toFixed(2)} KB (${mb.toFixed(2)} MB)`);
  
import { isVisible } from "element-is-visible";

export function getMinimizedDOM(rootElement) {
  if (!rootElement || typeof rootElement.cloneNode !== "function") {
    console.error("Invalid rootElement", rootElement);
    return "";
  }

  const clone = rootElement.cloneNode(true);

  rootElement.querySelectorAll("script").forEach((script) => script.remove());

  rootElement.querySelectorAll("#oteiting-floating-chat-container").forEach((el) => el.remove());
  const allElements = rootElement.querySelectorAll("*");

  allElements.forEach((el) => {
    const visible = isVisible(el);
    console.log("ElementCheck:", el, "Visible:", visible);

    if (!visible) {
      
      el.remove();
    }
  });

  rootElement.querySelectorAll("*").forEach((el) => {
    el.removeAttribute("style");
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith("on")) {
        el.removeAttribute(attr.name);
      }
    });
  });

  const finalHTML = rootElement.outerHTML;
  const bytes = new TextEncoder().encode(finalHTML).length;
  const kb = bytes / 1024;
  const mb = kb / 1024;
  console.log(`Minimized DOM size: ${kb.toFixed(2)} KB (${mb.toFixed(2)} MB)`);

  return finalHTML;
}
