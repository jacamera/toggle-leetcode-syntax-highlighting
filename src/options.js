// Constants.
const
    optionsKey = 'options',
    defaultOptionsKey = 'defaultOptions';

// Show the greeting on install.
if (window.location.hash === '#installed') {
    document.getElementById('install-greeting').style.display = '';
}

// Get the form elements and set up event listeners.
const optionElements = {
    lightModeTextColor: document.getElementById('light-mode-color-picker'),
    darkModeTextColor: document.getElementById('dark-mode-color-picker')
};
for (const option in optionElements) {
    const element = optionElements[option];
    element.addEventListener('change', async () => {
        const
            items = await chrome.storage.sync.get(optionsKey),
            options = items[optionsKey];
        options[option] = element.value;
        await chrome.storage.sync.set({
            [optionsKey]: options
        });
    });
}

// Load the current settings from storage.
chrome.storage.sync
    .get(optionsKey)
    .then(items => {
        const options = items[optionsKey];
        for (var option in optionElements) {
            optionElements[option].value = options[option];
        }
    });

// Restore defaults.
document
    .getElementById('restore-defaults-link')
    .addEventListener('click', async event => {
        event.preventDefault();
        const
            items = await chrome.storage.sync.get(defaultOptionsKey),
            defaults = items[defaultOptionsKey];
        for (const option in optionElements) {
            optionElements[option].value = defaults[option];
        }
        await chrome.storage.sync.set({
            [optionsKey]: defaults
        });
    });