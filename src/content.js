// Constants.
const
	cssClassNamespace = 'toggle-leetcode-syntax-highlighting',
	buttonHoverClass = cssClassNamespace + '_button-hover',
	highlightOffClass = cssClassNamespace + '_highlight-off',
	editorId = 'editor',
	tooltipSelector = 'div[role="tooltip"]',
	autoButtonText = 'Auto',
	highlightButtonText = 'Highlight',
	highlightButtonTooltipText = 'Syntax highlighting.',
	optionsStorageKey = 'options',
	highlightStorageKey = 'enableSyntaxHighlighting';

// Button state transitions.
const
	buttonClasses = [
		['text-text-secondary', 'text-brand-orange'],
		['dark:text-text-secondary', 'dark:text-dark-brand-orange'],
		['', 'hover:opacity-80']
	],
	buttonIndicatorClasses = [
		['bg-gray-6', 'bg-brand-orange'],
		['dark:bg-dark-gray-6', 'dark:bg-dark-brand-orange']
	];
function replaceClass(element, oldToken, newToken) {
	if (oldToken !== '' && newToken !== '') {
		element.classList.replace(oldToken, newToken);
		return;
	}
	if (oldToken !== '') {
		element.classList.remove(oldToken);
	}
	if (newToken !== '') {
		element.classList.add(newToken);
	}
}
function replaceButtonClasses(button, oldTokenIndex, newTokenIndex) {
	for (const pair of buttonClasses) {
		replaceClass(button, pair[oldTokenIndex], pair[newTokenIndex]);
	}
	const indicator = button.getElementsByClassName(buttonIndicatorClasses[0][oldTokenIndex])[0];
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
		`html[data-theme="dark"] body.${highlightOffClass} .monaco-editor .view-lines span { color: ${options.darkModeTextColor}; }`,
		// The !important declaration is necessary to override both the default element attribute and also our own element attribute assigned in the autocomplete button's mouseenter handler.
		`body.${buttonHoverClass} ${tooltipSelector} { font-size: 0; transform: translateX(${tooltipXOffset}px) !important; }`,
		`body.${buttonHoverClass} ${tooltipSelector}::after { font-size: var(--chakra-fontSizes-sm); content: "${highlightButtonTooltipText}" }`
	];
	// For some reason iterating adoptedStyleSheets doesn't work in Firefox.
	if (Symbol.iterator in document.adoptedStyleSheets) {
		const sheet = new CSSStyleSheet();
		insertCssRules(sheet, rules);
		document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
	} else {
		const styleElement = document.createElement('style');
		document.head.appendChild(styleElement);
		insertCssRules(styleElement.sheet, rules);
	}
}

// Listen for dynamically added elements.
function getDynamicElement(parent, query) {
	const match = query(parent);
	if (match) {
		return Promise.resolve(match);
	}
	return new Promise(resolve => {
		const observer = new MutationObserver(records => {
			for (const record of records) {
				for (const node of record.addedNodes) {
					const match = query(node);
					if (match) {
						observer.disconnect();
						resolve(match);
						return;
					}
				}
			}
		});
		observer.observe(parent, {
			subtree: true,
			childList: true
		});
	});
}

// The main initialization function.
async function initialize(editor) {
	// Find the autocomplete button that we'll clone for our highlight button.
	const autoButton = await getDynamicElement(editor, node => {
		const buttons = node.getElementsByTagName('button');
		for (const button of buttons) {
			if (button.textContent.trim() === autoButtonText) {
				return button;
			}
		}
	});
	let autoContainer = autoButton;
	while (autoContainer.parentElement.getElementsByTagName('button').length === 1) {
		autoContainer = autoContainer.parentElement;
	}

	// Clone the autocomplete button container and use it for our highlight button.
	const
		highlightContainer = autoContainer.cloneNode(true),
		highlightButton = highlightContainer.getElementsByTagName('button')[0];
	for (const child of highlightButton.childNodes) {
		if (child.nodeType === Node.TEXT_NODE && child.nodeValue.trim() === autoButtonText) {
			child.nodeValue = highlightButtonText;
			break;
		}
	}

	// Check for current preference and set the initial state.
	const storageItems = await chrome.storage.sync.get([optionsStorageKey, highlightStorageKey]);
	if (storageItems.enableSyntaxHighlighting) {
		turnButtonOn(highlightButton);
	} else {
		document.body.classList.add(highlightOffClass);
		turnButtonOff(highlightButton);
	}

	// Set up the button event handlers for tooltip highjacking and highlight toggling.
	let tooltipTimeout;
	function cancelTooltipTimeout() {
		clearTimeout(tooltipTimeout);
		tooltipTimeout = null;
	}
	highlightButton.addEventListener('mouseenter', () => {
		document.body.classList.add(buttonHoverClass);
		editor.dispatchEvent(
			new MouseEvent('mouseout', {
				bubbles: true,
				relatedTarget: autoButton,
				toElement: autoButton
			})
		);
		if (tooltipTimeout) {
			cancelTooltipTimeout();
		}
	});
	highlightButton.addEventListener('mouseleave', () => {
		autoButton.parentElement.dispatchEvent(new MouseEvent('mouseleave'));
		tooltipTimeout = setTimeout(() => {
			document.body.classList.remove(buttonHoverClass);
			tooltipTimeout = null;
		}, 150);
	});
	highlightButton.addEventListener('click', async () => {
		if (document.body.classList.contains(highlightOffClass)) {
			document.body.classList.remove(highlightOffClass);
			turnButtonOn(highlightButton);
			await chrome.storage.sync.set({
				[highlightStorageKey]: true
			});
		} else {
			document.body.classList.add(highlightOffClass);
			turnButtonOff(highlightButton);
			await chrome.storage.sync.set({
				[highlightStorageKey]: false
			});
		}
	});
	autoButton.addEventListener('mouseenter', () => {
		if (!tooltipTimeout) {
			return;
		}
		cancelTooltipTimeout();
		document.body.classList.remove(buttonHoverClass);
		const tooltip = document.querySelector(tooltipSelector);
		if (!tooltip) {
			return;
		}
		const
			tooltipRect = tooltip.getBoundingClientRect(),
			autoRect = autoButton.getBoundingClientRect(),
			tooltipX = autoRect.x - (tooltipRect.width - autoRect.width) / 2;
		tooltip.style.transform = `translateX(${tooltipRect.x - tooltipX}px)`;
	});

	// Append the highlight button container to the autocomplete button container's parent.
	let parent = autoContainer.parentElement
	while (parent.getElementsByTagName('button').length === 1) {
		parent = parent.parentElement;
	}
	parent.append(highlightContainer);

	// Measure the button offset to calculate the tooltip offset and insert the stylesheet.
	const
		autoRect = autoButton.getBoundingClientRect(),
		highlightRect = highlightButton.getBoundingClientRect(),
		tooltipXOffset = highlightRect.x - autoRect.x + (highlightRect.width - autoRect.width) / 2;
	insertStyleSheet(storageItems[optionsStorageKey], tooltipXOffset);
}

// Find and initialize the code editor.
getDynamicElement(document.body, _ => document.getElementById(editorId))
	.then(initialize);