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

  const hiddenIndexes = new Set();

  allElementsInRoot.forEach((el) => {
    const visible = isVisible(el);
    if (!visible) {

      hiddenIndexes.add(el.dataset._index);
    }
  });

  allElementsInClone.forEach((el) => {
    if (hiddenIndexes.has(el.dataset._index)) {
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

  return clone;
}
