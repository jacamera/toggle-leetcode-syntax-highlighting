# Toggle LeetCode Syntax Highlighting

## Description

This browser extension adds a toggle button to the LeetCode code editor that turns the syntax highlighting feature on and off.

### Background

It may be desirable to practice writing code without syntax highlighting in order to prepare for an interview or other situation where that feature may not be available. The LeetCode code editor provides many features and customization via user preferences but there is currently no option to disable the syntax highlighting feature.

## How to Use the Extension

Just install the extension from the [Chrome](https://chrome.google.com/webstore/detail/) or [Firefox](https://addons.mozilla.org/en-US/firefox/addon/) stores. Once installed, the extension works automatically. When you view a problem on the LeetCode website the extension will add a "Highlight" button to the right of the "Auto" button in the code editor's upper toolbar. The "Highlight" button works similarly to the "Auto" button in that clicking the button will toggle the state of the syntax highlighting feature of the editor in the current tab and will also store the current state as a preference that will be applied to the editor on the next page load.

By default the "Highlight" button will not be added to LeetCode contest web pages. You can override this behavior and also set your own custom monochromatic font colors by visiting the extension's options page.

## How it Works

The extension injects a content script into LeetCode web pages that match the specified URL patterns. The script clones the "Auto" button in order to create the "Highlight" button and adds an adopted stylesheet that contains CSS rules to enable button tooltip behavior and force a monochromatic font color on the editor text. Clicking the "Highlight" button toggles a global CSS class that activates the rules in the adopted stylesheet and saves the current preference to the extension's storage.