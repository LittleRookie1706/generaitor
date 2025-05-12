//import html2pug from "html2pug";

export const getMinimizedDOM = (rootElement) => {
  alert("getMinimizedDOM");
  if (!rootElement || typeof rootElement.cloneNode !== "function") {
    console.error("Invalid rootElement", rootElement);
    return "";
  }
  const clone = rootElement.cloneNode(true);
  console.log("Cloned DOM:", clone);

  // 1. remove script
  clone.querySelectorAll("script").forEach((script) => script.remove());

  // 2. find all elements with hidden / disabled attributes
  
  const disabledOrHiddenElements = new Set();
  const allElements = Array.from(clone.querySelectorAll("*"));

  for (const el of allElements) {
    const isHidden =
      el.style.display === "none" ||
      el.style.visibility === "hidden" ||
      el.style.hidden === "true";

    const isDisabled = el.style.disabled === "true";

    if (isHidden || isDisabled) {
      disabledOrHiddenElements.add(el);
    }
  }
  // const disabledOrHiddenElements = new Set();
  // const allElements = Array.from(clone.querySelectorAll("*"));

  // for (const el of allElements) {
  //   const isHidden =
  //     el.hasAttribute("hidden") ||
  //     el.getAttribute("aria-hidden") === "true" ||
  //     el.style.display === "none" ||
  //     el.style.visibility === "hidden";

  //   const isDisabled =
  //     el.hasAttribute("disabled") ||
  //     el.getAttribute("aria-disabled") === "true";

  //   if (isHidden || isDisabled) {
  //     disabledOrHiddenElements.add(el);

  //     el.querySelectorAll("*").forEach((child) => {
  //       disabledOrHiddenElements.add(child);
  //     });
  //   }
  // }

  // 3. remove style tags
  const styleTags = Array.from(clone.querySelectorAll("style"));

  for (const styleTag of styleTags) {
    let shouldKeep = false;

    if (disabledOrHiddenElements.has(styleTag)) {
      shouldKeep = true;
    } else {
      // check content of style tag
      const styleContent = styleTag.textContent;

      for (const el of disabledOrHiddenElements) {
        if (
          styleContent.includes("[disabled]") ||
          styleContent.includes("[hidden]") ||
          styleContent.includes('[aria-hidden="true"]')
        ) {
          shouldKeep = true;
          break;
        }
      }
    }

    // remove style tag
    if (!shouldKeep) {
      styleTag.remove();
    }
  }

  // 4. remove style, event handlers
  for (const el of allElements) {

    if (!disabledOrHiddenElements.has(el)) {
      el.removeAttribute("style");
    }
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith("on")) {
        el.removeAttribute(attr.name);
      }
    });
  }

  const finalHTML = clone.outerHTML;
  //const finalDOM = html2pug(finalHTML, { tabs: true });

  const bytes = new TextEncoder().encode(finalHTML).length;
  const kb = bytes / 1024;
  const mb = kb / 1024;

  console.log(`DOM size: ${kb.toFixed(2)} KB (${mb.toFixed(2)} MB)`);

  return finalHTML;
};
