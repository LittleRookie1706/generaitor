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

function getElementPath(el, root) {
  const path = [];
  while (el && el !== root) {
    let index = 0;
    let sibling = el;
    while (sibling.previousElementSibling) {
      sibling = sibling.previousElementSibling;
      index++;
    }
    path.unshift(index); // thêm vào đầu mảng
    el = el.parentElement;
  }
  return path;
}

// ✅ Hàm tìm element trong clone theo path đã lấy
function getElementByPath(cloneRoot, path) {
  let el = cloneRoot;
  for (const idx of path) {
    if (!el || !el.children || el.children.length <= idx) return null;
    el = el.children[idx];
  }
  return el;
}

function isVisibleCheck(element) {
  return !!(
    element.offsetWidth ||
    element.offsetHeight ||
    element.getClientRects().length
  );
}

// function isVisibleCheck2(element) {
//   if (!element) return false;

//   const style = window.getComputedStyle(element);
//   if (style.display === "none") return false;
//   if (style.visibility !== "visible") return false;
//   if (style.opacity === "0") return false;

//   // Check if element is within viewport
//   const rect = element.getBoundingClientRect();
//   if (rect.width === 0 && rect.height === 0) return false;

//   return true;
// }

// function isVisibleCheck2(element) {
  
//   return element.checkVisibility({
//     checkOpacity: true,
//     checkVisibilityCSS: true,
//     contentVisibilityAuto: true,
//     opacityProperty: true,
//     visibilityProperty: true,
//   });
// }

// function isVisibleCheck2(elem) {
//   if (!(elem instanceof Element))
//     throw Error("DomUtil: elem is not an element.");
//   const style = getComputedStyle(elem);
//   if (style.display === "none") return false;
//   if (style.visibility !== "visible") return false;
//   if (style.opacity < 0.1) return false;
//   if (
//     elem.offsetWidth +
//       elem.offsetHeight +
//       elem.getBoundingClientRect().height +
//       elem.getBoundingClientRect().width ===
//     0
//   ) {
//     return false;
//   }
//   const elemCenter = {
//     x: elem.getBoundingClientRect().left + elem.offsetWidth / 2,
//     y: elem.getBoundingClientRect().top + elem.offsetHeight / 2,
//   };
//   if (elemCenter.x < 0) return false;
//   if (
//     elemCenter.x > (document.documentElement.clientWidth || window.innerWidth)
//   )
//     return false;
//   if (elemCenter.y < 0) return false;
//   if (
//     elemCenter.y > (document.documentElement.clientHeight || window.innerHeight)
//   )
//     return false;
//   let pointContainer = document.elementFromPoint(elemCenter.x, elemCenter.y);
//   do {
//     if (pointContainer === elem) return true;
//   } while ((pointContainer = pointContainer.parentNode));
//   return false;
// }



function isElementVisible(element) {
  // If element doesn't exist, it's not visible
  if (!element) return false;

  // Check HTML attributes that can hide elements
  if (
    element.hidden ||
    element.getAttribute("aria-hidden") === "true" ||
    element.getAttribute("type") === "hidden"
  ) {
    return false;
  }

  // Get computed styles
  const computedStyle = window.getComputedStyle(element);

  // Check CSS properties that can hide elements
  if (
    computedStyle.display === "none" ||
    computedStyle.visibility === "hidden" ||
    computedStyle.visibility === "collapse" ||
    computedStyle.opacity === "0" ||
    parseInt(computedStyle.width) === 0 ||
    parseInt(computedStyle.height) === 0
  ) {
    return false;
  }

  // Check for elements positioned outside the viewport
  if (
    computedStyle.position === "absolute" ||
    computedStyle.position === "fixed"
  ) {
    const rect = element.getBoundingClientRect();

    // If positioned completely off-screen, consider invisible
    if (
      rect.right < 0 ||
      rect.bottom < 0 ||
      rect.left > window.innerWidth ||
      rect.top > window.innerHeight
    ) {
      return false;
    }
  }

  // Element passes all visibility checks
  return true;
}


function isElementTrulyVisible(el) {
  // Hàm này chạy trực tiếp trên DOM của trang, nên window là của trang
  if (!el) {
      return false;
  }

  const nonVisualOrCriticalTags = ['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'NOSCRIPT', 'TEMPLATE'];
  if (nonVisualOrCriticalTags.includes(el.tagName)) {
      const styleForCritical = window.getComputedStyle(el);
      if (styleForCritical.display === 'none') return false;
      return true;
  }

  if (el.tagName === 'INPUT' && el.type === 'hidden') {
      return false;
  }

  const style = window.getComputedStyle(el);

  if (style.display === 'none') {
      return false;
  }
  if (style.visibility === 'hidden') {
      return false;
  }
  if (parseFloat(style.opacity) < 0.1) {
      return false;
  }

  if (el.offsetWidth <= 0 && el.offsetHeight <= 0) {
      if (el.getClientRects().length === 0) {
           return false;
      }
  }
  return true;
}

function removeNonVisibleElementsOnPage(cloneDom) {
  // Lấy tất cả các element trong body của trang hiện tại
  const allElements = Array.from(cloneDom);
  let removedCount = 0;

  console.log(`Total elements in body: ${allElements.length}`);

  // Duyệt ngược để tránh vấn đề khi xóa
  for (let i = allElements.length - 1; i >= 0; i--) {
      const el = allElements[i];
      if (el && !isElementTrulyVisible(el)) { // Kiểm tra el tồn tại phòng trường hợp nó đã bị xóa bởi script khác
        console.log(
          "index removed:",
          el.dataset._index,
          "Removing hidden element in clone:",
          {
            tag: el.tagName,
            id: el.id || null,
            class: el.className || null,
            outerHTML: el.outerHTML.slice(0, 200) + "...",
          }
        );
          try {
              el.remove(); // Xóa trực tiếp khỏi DOM của trang
              removedCount++;
          } catch (e) {
              console.warn("Could not remove element:", el, e);
          }
      }
  }
  console.log(`Removed ${removedCount} non-visible elements from the current page.`);
  alert(`Đã xóa ${removedCount} phần tử không hiển thị khỏi trang này.`);
}

export function getMinimizedDOMv(rootElement) {
  console.log("domparser");
  const originalHtml = rootElement.documentElement.outerHTML;

  const parser = new DOMParser();
  const clonedDoc = parser.parseFromString(originalHtml, "text/html");

  if (!rootElement || typeof rootElement.cloneNode !== "function") {
    console.error("Invalid rootElement", rootElement);
    return null;
  }

  const allElementsInRoot = rootElement.documentElement.querySelectorAll("*");
  const allElementsInClone = clonedDoc.documentElement.querySelectorAll("*");


  allElementsInRoot.forEach((el, index) => {
    console.log("root-element:", el);
    el.dataset._index = index;
  });

  allElementsInClone.forEach((el, index) => {
    el.dataset._index = index;
  });

  // const clone = rootElement.cloneNode(true);

  const hiddenIndexes = new Set();

  allElementsInRoot.forEach((el) => {
    const visible = isVisible(el);
    console.log(
      "Check visible (from root):",
      el,
      "Visible:",
      visible,
      "index:",
      el.dataset._index
    );
    if (!visible) {
      // console.log("Remove ele:", el);
      // el.remove();

      hiddenIndexes.add(el.dataset._index);
    }
  });

  // allElementsInRoot.forEach((element) => {
  //   if (!isElementVisible(element)) {
  //     console.log("Check invisible (from root):", element);
  //     hiddenIndexes.add(element.dataset._index);
  //   }
  // });

  allElementsInClone.forEach((el) => {
    if (hiddenIndexes.has(el.dataset._index)) {
      console.log(
        "index removed:",
        el.dataset._index,
        "Removing hidden element in clone:",
        {
          tag: el.tagName,
          id: el.id || null,
          class: el.className || null,
          outerHTML: el.outerHTML.slice(0, 200) + "...",
        }
      );
      // el.remove();
    }
  });

  // clone.querySelectorAll("*").forEach((el) => {
  //   el.removeAttribute("style");
  //   Array.from(el.attributes).forEach((attr) => {
  //     if (attr.name.startsWith("on")) {
  //       el.removeAttribute(attr.name);
  //     }
  //   });
  // });

  // const finalHTML = clone.outerHTML;
  // const bytes = new TextEncoder().encode(finalHTML).length;
  // const kb = bytes / 1024;
  // const mb = kb / 1024;
  // console.log(`Minimized DOM size: ${kb.toFixed(2)} KB (${mb.toFixed(2)} MB)`);

  return clonedDoc.documentElement.outerHTML;
}

export function getMinimizedDOM(rootElement) {
  if (!rootElement || typeof rootElement.cloneNode !== "function") {
    console.error("Invalid rootElement", rootElement);
    return null;
  }

  const clone = rootElement.cloneNode(true);

  const allElementsInRoot = rootElement.querySelectorAll("*");
  const allElementsInClone = clone.querySelectorAll("*");

  allElementsInRoot.forEach((el, index) => {
    el.dataset._index = index;
  });

  allElementsInClone.forEach((el, index) => {
    el.dataset._index = index;
  });

  console.log("firstElementsInRoot:", allElementsInRoot[0]);
  console.log("firstElementsInClone:", allElementsInClone[0]);

  const hiddenIndexes = new Set();

  allElementsInRoot.forEach((el) => {
    const visible = isVisible(el);
    console.log("Check visible (from root):", el, "Visible:", visible, "index:", el.dataset._index);
    if (!visible) {
      // console.log("Remove ele:", el);
      // el.remove();

      hiddenIndexes.add(el.dataset._index);
    }
  });

  

  allElementsInClone.forEach((el) => {
    if (hiddenIndexes.has(el.dataset._index)) {
      console.log("index removed:", el.dataset._index,  "Removing hidden element in clone:", {
        tag: el.tagName,
        id: el.id || null,
        class: el.className || null,
        outerHTML: el.outerHTML.slice(0, 200) + "...",
      });
      el.remove();
    }
  });

  clone
    .querySelectorAll("#oteiting-floating-chat-container")
    .forEach((el) => el.remove());
  clone.querySelectorAll("script").forEach((script) => script.remove());

  clone.querySelectorAll("*").forEach((el) => {
    el.removeAttribute("style");
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith("on")) {
        el.removeAttribute(attr.name);
      }
    });
  });

  

  const finalHTML = clone.outerHTML;
  const bytes = new TextEncoder().encode(finalHTML).length;
  const kb = bytes / 1024;
  const mb = kb / 1024;
  console.log(`Minimized DOM size: ${kb.toFixed(2)} KB (${mb.toFixed(2)} MB)`);

  const remainElementsInClone = clone.querySelectorAll("*");
  if(remainElementsInClone.length > 0) {
  console.log("Remaining elements in clone:", remainElementsInClone.length);
  } else {
    console.log("No remaining elements in clone.");
  }

  console.log("Minimized DOM:", finalHTML);

  return clone;
}


export function performElementAction(targetElement, actionData) {
  const action = actionData.action.toLowerCase();
  let actionDescription = action;

  switch (action) {
    case "click":
      targetElement.click();
      break;

    case "doubleclick":
      const dblClickEvent = new MouseEvent("dblclick", { bubbles: true });
      targetElement.dispatchEvent(dblClickEvent);
      break;

    case "check":
      if (
        targetElement instanceof HTMLInputElement &&
        targetElement.type === "checkbox"
      ) {
        if (!targetElement.checked) {
          targetElement.checked = true;
          targetElement.dispatchEvent(new Event("change", { bubbles: true }));
        }
      } else {
        throw new Error(`'check' action requires a checkbox input element.`);
      }
      break;

    case "uncheck":
      if (
        targetElement instanceof HTMLInputElement &&
        targetElement.type === "checkbox"
      ) {
        if (targetElement.checked) {
          targetElement.checked = false;
          targetElement.dispatchEvent(new Event("change", { bubbles: true }));
        }
      } else {
        throw new Error(`'uncheck' action requires a checkbox input element.`);
      }
      break;

    case "select":
      if (targetElement instanceof HTMLSelectElement) {
        let optionValue = null;

        if (actionData.optionValue) {
          optionValue = actionData.optionValue;
        } else if (actionData.value) {
          const options = Array.from(targetElement.options);
          const matchingOption = options.find((option) =>
            option.textContent.trim().includes(actionData.value)
          );
          if (matchingOption) {
            optionValue = matchingOption.value;
          }
        }

        if (optionValue !== null) {
          targetElement.value = optionValue;
          actionDescription += ` with value "${optionValue}" (${
            actionData.value || ""
          })`;

          targetElement.dispatchEvent(new Event("change", { bubbles: true }));

          if (
            actionData.isSelect2 ||
            targetElement.classList.contains("select2-hidden-accessible")
          ) {
            if (window.jQuery && window.jQuery(targetElement).data("select2")) {
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

          targetElement.dispatchEvent(new Event("input", { bubbles: true }));
          targetElement.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          throw new Error(`Element for 'type' is not an input or textarea.`);
        }
      } else {
        throw new Error(`'type' action requires a 'value' string.`);
      }
      break;

    default:
      throw new Error(`Unsupported action type: ${action}`);
  }

}






// export function getMinimizedDOM(rootElement) {
//   if (!rootElement || typeof rootElement.cloneNode !== "function") {
//     console.error("Invalid rootElement", rootElement);
//     return "";
//   }

//   const clone = rootElement.cloneNode(true);

//   rootElement.querySelectorAll("script").forEach((script) => script.remove());

//   // rootElement.querySelectorAll("#oteiting-floating-chat-container").forEach((el) => el.remove());
//   const allElements = rootElement.querySelectorAll("*");

//   allElements.forEach((el) => {
//     const visible = isVisible(el);
//     console.log("ElementCheck:", el, "Visible:", visible);

//     if (!visible) {
      
//       el.remove();
//     }
//   });

//   rootElement.querySelectorAll("*").forEach((el) => {
//     el.removeAttribute("style");
//     Array.from(el.attributes).forEach((attr) => {
//       if (attr.name.startsWith("on")) {
//         el.removeAttribute(attr.name);
//       }
//     });
//   });

//   const finalHTML = rootElement.outerHTML;
//   const bytes = new TextEncoder().encode(finalHTML).length;
//   const kb = bytes / 1024;
//   const mb = kb / 1024;
//   console.log(`Minimized DOM size: ${kb.toFixed(2)} KB (${mb.toFixed(2)} MB)`);

//   return finalHTML;
// }
