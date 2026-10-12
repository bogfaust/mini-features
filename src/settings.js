let translations = {};
let currentLang = 'en';
let hotkey = ''; // актуальное сочетание клавиш для восстановления вкладки

const DEFAULTS = {
    blockF11: true,
    blockMiddleClick: true,
    tabRestoreEnabled: true,
    soundEnabled: true,
    soundVolume: 30
};

// Читаем текущую горячую клавишу из настроек браузера (пользователь мог её изменить)
async function loadHotkey() {
    try {
        const commands = await chrome.commands.getAll();
        const cmd = commands.find(c => c.name === 'restore');
        hotkey = cmd && cmd.shortcut ? cmd.shortcut : '';
    } catch (e) {
        console.warn('Failed to read hotkey:', e);
        hotkey = '';
    }
}

async function init() {
    const [data, result] = await Promise.all([
        fetch(chrome.runtime.getURL('src/locales.json')).then(r => r.json()),
        chrome.storage.sync.get(['language', ...Object.keys(DEFAULTS)]),
        loadHotkey()
    ]);

    translations = data;
    currentLang = result.language || 'en';

    const val = key => (result[key] !== undefined ? result[key] : DEFAULTS[key]);
    document.getElementById('blockF11').checked          = val('blockF11');
    document.getElementById('blockMiddleClick').checked  = val('blockMiddleClick');
    document.getElementById('tabRestoreEnabled').checked = val('tabRestoreEnabled');
    document.getElementById('soundEnabled').checked      = val('soundEnabled');
    document.getElementById('soundVolume').value         = val('soundVolume');
    updateVolumeLabel();

    applyLang();
    updateLangButtons();
}

function applyLang() {
    const t = translations[currentLang] || translations['en'];
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const hk = hotkey || t.hotkeyNotSet;
    const version = chrome.runtime.getManifest().version;

    document.documentElement.lang = currentLang;
    document.title = `${t.settingsTitle} — ${t.popupTitle}`;

    set('txt-pageTitle',              t.settingsTitle);
    set('txt-pageSubtitle',           t.settingsSubtitle);
    set('txt-langHeader',             t.langHeader);
    set('txt-langDescription',        t.langDescription);
    set('txt-f11Header',              t.f11Header);
    set('txt-f11Description',         t.f11Description);
    set('txt-f11Label',               t.f11Label);
    set('txt-middleClickHeader',      t.middleClickHeader);
    set('txt-middleClickDescription', t.middleClickDescription);
    set('txt-middleClickLabel',       t.middleClickLabel);
    set('txt-tabRestoreHeader',       t.tabRestoreHeader);
    set('txt-tabRestoreDescription',  t.tabRestoreDescription.replace('{hotkey}', hk));
    set('txt-tabRestoreLabel',        t.tabRestoreLabel.replace('{hotkey}', hk));
    set('txt-soundHeader',            t.soundHeader);
    set('txt-soundDescription',       t.soundDescription);
    set('txt-soundLabel',             t.soundLabel);
    set('txt-volumeLabel',            t.volumeLabel);
    set('txt-testButton',             t.testButton);
    set('txt-version',                t.version.replace('{version}', version));
    set('toast',                      t.savedText);
}

function updateLangButtons() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
}

function updateVolumeLabel() {
    document.getElementById('volumeValue').textContent =
        document.getElementById('soundVolume').value + '%';
}

document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentLang = btn.dataset.lang;
        updateLangButtons();
        applyLang();
        save();
    });
});

document.getElementById('blockF11').addEventListener('change', save);
document.getElementById('blockMiddleClick').addEventListener('change', save);
document.getElementById('tabRestoreEnabled').addEventListener('change', save);
document.getElementById('soundEnabled').addEventListener('change', save);

// Ползунок: подпись обновляется во время перетаскивания, сохранение - когда отпустили
document.getElementById('soundVolume').addEventListener('input', updateVolumeLabel);
document.getElementById('soundVolume').addEventListener('change', save);

// Кнопка проверки звука (играет независимо от того, включён ли чекбокс)
document.getElementById('testSound').addEventListener('click', () => {
    const audio = new Audio(chrome.runtime.getURL('assets/sounds/quack.mp3'));
    audio.volume = Number(document.getElementById('soundVolume').value) / 100;
    audio.play().catch(e => console.warn('Test sound failed:', e));
});

// Пользователь мог сменить хоткей на chrome://extensions/shortcuts и вернуться сюда
window.addEventListener('focus', async () => {
    await loadHotkey();
    applyLang();
});

function save() {
    chrome.storage.sync.set({
        language:          currentLang,
        blockF11:          document.getElementById('blockF11').checked,
        blockMiddleClick:  document.getElementById('blockMiddleClick').checked,
        tabRestoreEnabled: document.getElementById('tabRestoreEnabled').checked,
        soundEnabled:      document.getElementById('soundEnabled').checked,
        soundVolume:       Number(document.getElementById('soundVolume').value),
    }, () => {
        showToast();
        chrome.tabs.query({}, tabs => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { action: 'settingsUpdated' }).catch(() => {});
            });
        });
    });
}

function showToast() {
    const el = document.getElementById('toast');
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2000);
}

init();
