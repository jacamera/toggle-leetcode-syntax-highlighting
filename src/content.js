// Constants.
const cssClassNamespace = "toggle-leetcode-syntax-highlighting",
  buttonHoverClass = cssClassNamespace + "_button-hover",
  highlightOffClass = cssClassNamespace + "_highlight-off",
  editorId = "editor",
  tooltipSelector = "div[data-radix-popper-content-wrapper]",
  autoButtonText = "Auto",
  highlightButtonText = "Highlight",
  highlightButtonTooltipText = "Syntax highlighting.",
  optionsStorageKey = "options",
  highlightStorageKey = "enableSyntaxHighlighting";

// Button state transitions.
const buttonClasses = [
    ["text-text-secondary", "text-brand-orange"],
    ["dark:text-text-secondary", "dark:text-dark-brand-orange"],
    ["", "hover:opacity-80"],
  ],
  buttonIndicatorClasses = [
    ["bg-gray-6", "bg-brand-orange"],
    ["dark:bg-dark-gray-6", "dark:bg-dark-brand-orange"],
  ];
function replaceClass(element, oldToken, newToken) {
  if (oldToken !== "" && newToken !== "") {
    element.classList.replace(oldToken, newToken);
    return;
  }
  if (oldToken !== "") {
    element.classList.remove(oldToken);
  }
  if (newToken !== "") {
    element.classList.add(newToken);
  }
}
function replaceButtonClasses(button, oldTokenIndex, newTokenIndex) {
  for (const pair of buttonClasses) {
    replaceClass(button, pair[oldTokenIndex], pair[newTokenIndex]);
  }
  const indicator = button.getElementsByClassName(
    buttonIndicatorClasses[0][oldTokenIndex],
  )[0];
  if (!indicator) {
    return;
  }
  for (const pair of buttonIndicatorClasses) {
    replaceClass(indicator, pair[oldTokenIndex], pair[newTokenIndex]);
  }
}
function turnButtonOn(button) {
  replaceButtonClasses(button, 0, 1);
}
function turnButtonOff(button) {
  replaceButtonClasses(button, 1, 0);
}

// Custom stylesheet.
function insertCssRules(styleSheet, rules) {
  for (const rule of rules) {
    styleSheet.insertRule(rule);
  }
}
function insertStyleSheet(options, tooltipXOffset) {
  const rules = [
    `body.${highlightOffClass} .monaco-editor .view-lines span { color: ${options.lightModeTextColor}; }`,
    `html.dark body.${highlightOffClass} .monaco-editor .view-lines span { color: ${options.darkModeTextColor}; }`,
    `body.${buttonHoverClass} ${tooltipSelector} > div { position: relative; left: ${tooltipXOffset}px; }`,
    `body.${buttonHoverClass} ${tooltipSelector} > div > div { font-size: 0; }`,
    `body.${buttonHoverClass} ${tooltipSelector} > div > div::after { font-size: 0.75rem; line-height: 0; vertical-align: middle; content: "${highlightButtonTooltipText}" }`,
  ];
  // For some reason iterating adoptedStyleSheets doesn't work in Firefox.
  if (Symbol.iterator in document.adoptedStyleSheets) {
    const sheet = new CSSStyleSheet();
    insertCssRules(sheet, rules);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  } else {
    const styleElement = document.createElement("style");
    document.head.appendChild(styleElement);
    insertCssRules(styleElement.sheet, rules);
  }
}

// Listen for dynamically added elements.
// Additional nested dynamic element queries may be required before knowing whether or not we have the correct element so disconnecting the observers must be deferred until we have all our elements.
// Check the array before firing the callback. If it has been cleared then the observers have all been disconnected and no more callbacks should be fired.
const mutationObservers = [];
function getDynamicElement(parent, query, callback) {
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        const match = query(node);
        if (match && mutationObservers.length) {
          callback(match);
        }
      }
    }
  });
  observer.observe(parent, {
    subtree: true,
    childList: true,
  });
  mutationObservers.push(observer);
  const match = query(parent);
  if (match && mutationObservers.length) {
    callback(match);
  }
}

// The main initialization function.
async function initialize(editor) {
  // Find the autocomplete button that we'll clone for our highlight button.
  const autoButton = await new Promise((resolve) => {
    getDynamicElement(
      editor,
      (node) => {
        const buttons = node.getElementsByTagName("button");
        for (const button of buttons) {
          if (button.textContent.trim() === autoButtonText) {
            return button;
          }
        }
      },
      resolve,
    );
  });
  let autoContainer = autoButton;
  while (
    autoContainer.parentElement.getElementsByTagName("button").length === 1
  ) {
    autoContainer = autoContainer.parentElement;
  }

  // Guard against duplicate invocations. This shouldn't happen, but if we get here and the mutation observers have already been cleared then an observer may have fired its callback for multiple matching elements.
  if (!mutationObservers.length) {
    return;
  }

  // Disconnect our mutation observers now that we found all our dynamic elements.
  while (mutationObservers.length) {
    mutationObservers.pop().disconnect();
  }

  // Clone the autocomplete button container and use it for our highlight button.
  const highlightContainer = autoContainer.cloneNode(true),
    highlightButton = highlightContainer.getElementsByTagName("button")[0];
  for (const child of highlightButton.childNodes) {
    if (
      child.nodeType === Node.TEXT_NODE &&
      child.nodeValue.trim() === autoButtonText
    ) {
      child.nodeValue = highlightButtonText;
      break;
    }
  }

  // Check for current preference and set the initial state.
  const storageItems = await chrome.storage.sync.get([
    optionsStorageKey,
    highlightStorageKey,
  ]);
  if (storageItems.enableSyntaxHighlighting) {
    turnButtonOn(highlightButton);
  } else {
    document.body.classList.add(highlightOffClass);
    turnButtonOff(highlightButton);
  }

  // Set up the button event handlers for tooltip highjacking and highlight toggling.
  let tooltipTimeout, closeEvent;
  function startTooltipTimeout(delayClose) {
    if (!delayClose) {
      closeTooltip();
    }
    tooltipTimeout = setTimeout(
      () => {
        tooltipTimeout = null;
        if (delayClose) {
          startTooltipTimeout(false);
        } else {
          removeTooltipHijackStyle();
        }
      },
      delayClose ? 250 : 150,
    );
  }
  function cancelTooltipTimeout() {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = null;
  }
  function closeTooltip() {
    closeEvent = new PointerEvent("pointerout", { bubbles: true });
    autoButton.dispatchEvent(closeEvent);
  }
  function removeTooltipHijackStyle() {
    document.body.classList.remove(buttonHoverClass);
  }
  highlightButton.addEventListener("pointerenter", () => {
    // Set the hijacked tooltip styling.
    document.body.classList.add(buttonHoverClass);
    // Keep the tooltip open if it's closing or trigger it to open.
    if (tooltipTimeout) {
      cancelTooltipTimeout();
    } else {
      autoButton.dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true }),
      );
    }
  });
  highlightButton.addEventListener("pointerleave", (event) => {
    // Handle closing the tooltip from this event.
    if (tooltipTimeout) {
      cancelTooltipTimeout();
    }
    // Delay closing the tooltip if we're moving left towards the auto button.
    startTooltipTimeout(event.offsetX < 0);
  });
  highlightButton.addEventListener("click", async () => {
    if (document.body.classList.contains(highlightOffClass)) {
      document.body.classList.remove(highlightOffClass);
      turnButtonOn(highlightButton);
      await chrome.storage.sync.set({
        [highlightStorageKey]: true,
      });
    } else {
      document.body.classList.add(highlightOffClass);
      turnButtonOff(highlightButton);
      await chrome.storage.sync.set({
        [highlightStorageKey]: false,
      });
    }
  });
  autoButton.addEventListener("pointerenter", () => {
    // Revert the hijacked tooltip styling.
    document.body.classList.remove(buttonHoverClass);
    // Keep the tooltip open.
    if (tooltipTimeout) {
      cancelTooltipTimeout();
    }
  });
  autoButton.addEventListener("pointerout", (event) => {
    // Only allow our synthetic event to bubble up and close the tooltip.
    if (event !== closeEvent) {
      event.stopPropagation();
    }
  });
  autoButton.addEventListener("pointerleave", (event) => {
    // Handle closing the tooltip from this event.
    if (tooltipTimeout) {
      cancelTooltipTimeout();
    }
    // Delay closing the tooltip if we're moving right towards the highlight button.
    startTooltipTimeout(event.offsetX > autoButton.offsetWidth);
  });

  // Append the highlight button container to the autocomplete button container's parent.
  let parent = autoContainer.parentElement;
  while (parent.getElementsByTagName("button").length === 1) {
    parent = parent.parentElement;
  }
  parent.append(highlightContainer);

  // Measure the button offset to calculate the tooltip offset and insert the stylesheet.
  const autoRect = autoButton.getBoundingClientRect(),
    highlightRect = highlightButton.getBoundingClientRect(),
    tooltipXOffset =
      highlightRect.x - autoRect.x + (highlightRect.width - autoRect.width) / 2;
  insertStyleSheet(storageItems[optionsStorageKey], tooltipXOffset);
}

// Find and initialize the code editor.
getDynamicElement(
  document.body,
  (node) => node.querySelector("#" + editorId),
  initialize,
);
