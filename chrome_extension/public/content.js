function isElement(node) {
  return node.nodeType === 1;
}

function isTextNode(node) {
  return node.nodeType === 3;
}

function isDocument(node) {
  return node.nodeType === 9;
}

function isInputElement(element) {
  return element.tagName === 'INPUT';
}

function isVisible(elem) {
  let defaultView = elem.ownerDocument.defaultView;
  if(!defaultView) {
    throw new Error('cannot check visibility of non attached element');
  }
  let window = defaultView; // retype as non-null for use in closures
  let isJSDOM = window.navigator.userAgent.match(/jsdom/i);

  function getOpacity(elem) {
    // By default the element is opaque.
    let elemOpacity = 1;

    let opacityStyle = window.getComputedStyle(elem).opacity;
    if (opacityStyle) {
      elemOpacity = Number(opacityStyle);
    }

    // Let's apply the parent opacity to the element.
    let parentElement = elem.parentElement;
    if (parentElement) {
      elemOpacity = elemOpacity * getOpacity(parentElement);
    }
    return elemOpacity;
  }

  function getOverflowState(elem) {
    let region = elem.getBoundingClientRect();
    let ownerDoc = elem.ownerDocument;
    let htmlElem = ownerDoc.documentElement;
    let bodyElem = ownerDoc.body;
    let htmlOverflowStyle = window.getComputedStyle(htmlElem).overflow;
    let treatAsFixedPosition;

    // Return the closest ancestor that the given element may overflow.
    function getOverflowParent(e) {
      let position = window.getComputedStyle(e).position;
      if (position == 'fixed') {
        treatAsFixedPosition = true;
        // Fixed-position element may only overflow the viewport.
        return e == htmlElem ? null : htmlElem;
      } else {
        let parent = e.parentElement;
        while (parent && !canBeOverflowed(parent)) {
          parent = parent.parentElement
        }
        return parent;
      }

      function canBeOverflowed(container) {
        // The HTML element can always be overflowed.
        if (container == htmlElem) {
          return true;
        }
        // An element cannot overflow an element with an inline display style.
        let containerDisplay = window.getComputedStyle(container).display;
        if (containerDisplay.match(/^inline/)) {
          return false;
        }
        // An absolute-positioned element cannot overflow a static-positioned one.
        if (position == 'absolute' &&
            window.getComputedStyle(container).position == 'static') {
          return false;
        }
        return true;
      }
    }

    // Return the x and y overflow styles for the given element.
    function getOverflowStyles(e) {
      // When the <html> element has an overflow style of 'visible', it assumes
      // the overflow style of the body, and the body is really overflow:visible.
      let overflowElem = e;
      if (htmlOverflowStyle == 'visible') {
        // Note: bodyElem will be null/undefined in SVG documents.
        if (e == htmlElem && bodyElem) {
          overflowElem = bodyElem;
        } else if (e == bodyElem) {
          return {x: 'visible', y: 'visible'};
        }
      }
      let overflow = {
        x: window.getComputedStyle(overflowElem).overflowX,
        y: window.getComputedStyle(overflowElem).overflowY,
      };
      // The <html> element cannot have a genuine 'visible' overflow style,
      // because the viewport can't expand; 'visible' is really 'auto'.
      if (e == htmlElem) {
        overflow.x = overflow.x == 'visible' ? 'auto' : overflow.x;
        overflow.y = overflow.y == 'visible' ? 'auto' : overflow.y;
      }
      return overflow;
    }

    // Returns the scroll offset of the given element.
    function getScroll(e) {
      if (isDocument(e)) {
        return { x: e.defaultView?.pageXOffset || 0, y: e.defaultView?.pageYOffset || 0 };
      } else {
        return { x: e.scrollLeft, y: e.scrollTop };
      }
    }

    // Check if the element overflows any ancestor element.
    for (let container = getOverflowParent(elem);
         !!container;
         container = getOverflowParent(container)) {
      let containerOverflow = getOverflowStyles(container);

      // If the container has overflow:visible, the element cannot overflow it.
      if (containerOverflow.x == 'visible' && containerOverflow.y == 'visible') {
        continue;
      }

      let containerRect = container.getBoundingClientRect();

      // Zero-sized containers without overflow:visible hide all descendants.
      if (containerRect.width == 0 || containerRect.height == 0) {
        return 'hidden';
      }

      // Check "underflow": if an element is to the left or above the container
      let underflowsX = region.right < containerRect.left;
      let underflowsY = region.bottom < containerRect.top;
      if ((underflowsX && containerOverflow.x == 'hidden') ||
          (underflowsY && containerOverflow.y == 'hidden')) {
        return 'hidden';
      } else if ((underflowsX && containerOverflow.x != 'visible') ||
                 (underflowsY && containerOverflow.y != 'visible')) {
        // When the element is positioned to the left or above a container, we
        // have to distinguish between the element being completely outside the
        // container and merely scrolled out of view within the container.
        let containerScroll = getScroll(container);
        let unscrollableX = region.right < containerRect.left - containerScroll.x;
        let unscrollableY = region.bottom < containerRect.top - containerScroll.y;
        if ((unscrollableX && containerOverflow.x != 'visible') ||
            (unscrollableY && containerOverflow.x != 'visible')) {
          return 'hidden';
        }
        let containerState = getOverflowState(container);
        return containerState == 'hidden' ?
            'hidden' : 'scroll';
      }

      // Check "overflow": if an element is to the right or below a container
      let overflowsX = region.left >= containerRect.left + containerRect.width;
      let overflowsY = region.top >= containerRect.top + containerRect.height;
      if ((overflowsX && containerOverflow.x == 'hidden') ||
          (overflowsY && containerOverflow.y == 'hidden')) {
        return 'hidden';
      } else if ((overflowsX && containerOverflow.x != 'visible') ||
                 (overflowsY && containerOverflow.y != 'visible')) {
        // If the element has fixed position and falls outside the scrollable area
        // of the document, then it is hidden.
        if (treatAsFixedPosition) {
          let docScroll = getScroll(container);
          if ((region.left >= htmlElem.scrollWidth - docScroll.x) ||
              (region.right >= htmlElem.scrollHeight - docScroll.y)) {
            return 'hidden';
          }
        }
        // If the element can be scrolled into view of the parent, it has a scroll
        // state; unless the parent itself is entirely hidden by overflow, in
        // which it is also hidden by overflow.
        let containerState = getOverflowState(container);
        return containerState == 'hidden' ?
            'hidden' : 'scroll';
      }
    }

    // Does not overflow any ancestor.
    return 'none';
  }

  function isDisplayed(e) {
    if (window.getComputedStyle(e).display == 'none') {
      return false;
    }
    let parent = e.parentElement;
    return !parent || isDisplayed(parent);
  }

  function isVisibleInner(elem, ignoreOpacity = false) {
    // By convention, BODY element is always shown: BODY represents the document
    // and even if there's nothing rendered in there, user can always see there's
    // the document.
    if (elem.tagName === 'BODY') {
      return true;
    }

    // Option or optgroup is shown iff enclosing select is shown (ignoring the
    // select's opacity).
    if (elem.tagName === 'OPTION' ||
        elem.tagName === 'OPTGROUP') {
      let select = elem.closest('select');
      return !!select && isVisibleInner(select, true);
    }

    // Any hidden input is not shown.
    if(isInputElement(elem) && elem.type.toLowerCase() == 'hidden') {
      return false;
    }

    // Any NOSCRIPT element is not shown.
    if (elem.tagName === 'NOSCRIPT') {
      return false;
    }

    // Any element with hidden/collapsed visibility is not shown.
    let visibility = window.getComputedStyle(elem).visibility;
    if (visibility == 'collapse' || visibility == 'hidden') {
      return false;
    }

    if (!isDisplayed(elem)) {
      return false;
    }

    // Any transparent element is not shown.
    if (!ignoreOpacity && getOpacity(elem) == 0) {
      return false;
    }

    // Any element without positive size dimensions is not shown.
    function positiveSize(e) {
      let rect = e.getBoundingClientRect();
      if (rect.height > 0 && rect.width > 0) {
        return true;
      }
      // Zero-sized elements should still be considered to have positive size
      // if they have a child element or text node with positive size, unless
      // the element has an 'overflow' style of 'hidden'.
      return window.getComputedStyle(e).overflow != 'hidden' &&
          Array.from(e.childNodes).some((n) => {
            return isTextNode(n) || (isElement(n) && positiveSize(n));
          });
    }
    if (!isJSDOM && !positiveSize(elem)) {
      return false;
    }

    // Elements that are hidden by overflow are not shown.
    function hiddenByOverflow(e) {
      return getOverflowState(e) == 'hidden' &&
          Array.from(e.childNodes).every(function(n) {
            return !isElement(n) || hiddenByOverflow(n) ||
                   !positiveSize(n);
          });
    }
    if (!isJSDOM && hiddenByOverflow(elem)) {
      return false;
    }

    return true;
  }

  return isVisibleInner(elem);
}

const getMinimizedDOM = (rootElement) => {
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

  clone.querySelectorAll("script").forEach((script) => script.remove());

  clone.querySelectorAll("*").forEach((el) => {
    el.removeAttribute("style");
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith("on")) {
        el.removeAttribute(attr.name);
      }
    });
  });

  

  const originalHTML = rootElement.outerHTML;
  const oldBytes = new TextEncoder().encode(originalHTML).length;
  const oldKb = oldBytes / 1024;
  const oldMb = oldKb / 1024;
  console.log(`Original DOM size: ${oldKb.toFixed(2)} KB (${oldMb.toFixed(2)} MB)`);
  const finalHTML = clone.outerHTML;
  const newBytes = new TextEncoder().encode(finalHTML).length;
  const newKb = newBytes / 1024;
  const newMb = newKb / 1024;
  console.log(`Minimized DOM size: ${newKb.toFixed(2)} KB (${newMb.toFixed(2)} MB)`);

  return clone;
}

// Lắng nghe message từ sidepanel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== "getDOM") return true
  const dom = getMinimizedDOM(document.body)
  sendResponse({dom, outerHTML: dom.outerHTML});
  return true
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== "DOMAction") return true
  request = request.response
  if (request.action === "assert" && request.success)
    {
    sendResponse({status: 1})
    return true
    }
  try {
  if (request.action === "assert" && !request.success)
              throw new Error(
                "Assertion error"
              );

    if (!request.selector || !request.action) throw Error(`Error: Unexpected error`)
    // Query all matching elements
    const allMatchingElements = document.querySelectorAll(
      request.selector
    );
    let targetElement = null;

    if (allMatchingElements.length === 0) throw Error(`Error: No elements found for selector: ${request.selector}`)
    // Handle multiple matching elements with index
    else if (allMatchingElements.length > 1) {
      if (
        typeof request.index === "number" &&
        request.index >= 0 &&
        request.index < allMatchingElements.length
      ) {
        targetElement = allMatchingElements[request.index];
      } else {
        targetElement = allMatchingElements[0];
      }
    }
    // Single element case
    else {
      targetElement = allMatchingElements[0];
    }

    if (!targetElement) {
      throw Error(`Error: Could not determine which element to interact with`)
    } else {
      let actionDescription = `${request.action} on ${request.selector}`;
      if (typeof request.index === "number") {
        actionDescription += ` (element #${request.index + 1})`;
      }

      switch (request.action.toLowerCase()) {
        case "click":
          targetElement.click();
          break;

        case "select":
          if (targetElement instanceof HTMLSelectElement) {
            let optionValue = null;

            if (request.optionValue) {
              optionValue = request.optionValue;
            }
            else if (request.value) {
              const options = Array.from(targetElement.options);
              const matchingOption = options.find((option) =>
                option.textContent.trim().includes(request.value)
              );
              if (matchingOption) {
                optionValue = matchingOption.value;
              }
            }

            if (optionValue !== null) {
              targetElement.value = optionValue;
              actionDescription += ` with value "${optionValue}" (${
                request.value || ""
              })`;

              targetElement.dispatchEvent(
                new Event("change", { bubbles: true })
              );

              if (
                request.isSelect2 ||
                targetElement.classList.contains(
                  "select2-hidden-accessible"
                )
              ) {
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
                `Option "${request.value}" not found in select element.`
              );
            }
          } else {
            throw new Error(`'select' action requires a SELECT element.`);
          }
          break;

        case "type":
          if (typeof request.value === "string") {
            if (
              targetElement instanceof HTMLInputElement ||
              targetElement instanceof HTMLTextAreaElement
            ) {
              targetElement.value = request.value;
              actionDescription += ` with value "${request.value}"`;
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
          throw new Error(`Unsupported action: ${request.action}`);
      }
    }
  } catch (parseOrExecError) {
    console.log(`Execution Error: ${parseOrExecError.message}`)
    sendResponse({status: 0, error: `Execution Error: ${parseOrExecError.message}`})
  }
  sendResponse({status: 1})
  return true
})