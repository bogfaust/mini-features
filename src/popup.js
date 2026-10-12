fetch(chrome.runtime.getURL('src/locales.json'))
    .then(r => r.json())
    .then(data => {
        chrome.storage.sync.get(['language'], result => {
            const lang = result.language || 'en';
            const t = data[lang] || data['en'];
            const version = chrome.runtime.getManifest().version;

            document.title = t.popupTitle;
            document.getElementById('txt-title').textContent        = t.popupTitle;
            document.getElementById('txt-openSettings').textContent = t.openSettings;
            document.getElementById('txt-github').textContent       = t.github;
            // Версия берётся из manifest.json, чтобы не править её в нескольких местах
            document.getElementById('txt-version').textContent      = t.version.replace('{version}', version);
        });
    });

document.getElementById('openSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});
