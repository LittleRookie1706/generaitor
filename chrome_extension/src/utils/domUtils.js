import { isVisible } from "element-is-visible";

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
  // const bytes = new TextEncoder().encode(finalHTML).length;
  // const kb = bytes / 1024;
  // const mb = kb / 1024;
  // console.log(`Minimized DOM size: ${kb.toFixed(2)} KB (${mb.toFixed(2)} MB)`);

  console.log("Minimized DOM:", finalHTML);

  return clone;
}
