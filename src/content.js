let settings = {
    blockF11: true,
    blockMiddleClick: true,
    language: 'en'
};

function loadSettings() {
    chrome.storage.sync.get(['blockF11', 'blockMiddleClick', 'language'], result => {
        settings.blockF11        = result.blockF11        !== undefined ? result.blockF11        : true;
        settings.blockMiddleClick = result.blockMiddleClick !== undefined ? result.blockMiddleClick : true;
        settings.language        = result.language        || 'en';
    });
}

// Просим background проиграть звук (включён ли звук и громкость он проверяет сам)
let lastSoundAt = 0;
function notifyBlocked() {
    const now = Date.now();
    if (now - lastSoundAt < 250) return; // защита от «очереди» кряков при частых нажатиях
    lastSoundAt = now;
    try {
        chrome.runtime.sendMessage({ action: 'playBlockSound' }).catch(() => {});
    } catch (e) {
        // Расширение перезагружено, контекст устарел: молча игнорируем
    }
}

// Элемент, который реально можно прокручивать (есть что прокручивать и overflow это позволяет)
function isScrollable(el) {
    if (!(el instanceof Element)) return false;
    const st = getComputedStyle(el);
    const scrollY = /(auto|scroll|overlay)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 1;
    const scrollX = /(auto|scroll|overlay)/.test(st.overflowX) && el.scrollWidth > el.clientWidth + 1;
    return scrollY || scrollX;
}

// Запустил бы браузер автопрокрутку от этого нажатия средней кнопки?
// Нет, если кликнули по ссылке (это «открыть в новой вкладке») или прокручивать нечего.
function wouldAutoscroll(e) {
    // composedPath() видит и элементы внутри shadow DOM (например, ссылки на YouTube)
    const path = e.composedPath();

    if (path.some(n => n instanceof Element && n.matches('a[href], area[href]'))) return false;
    if (path.some(isScrollable)) return true;

    // Прокручивается ли сама страница
    const root = document.scrollingElement;
    return !!root && (root.scrollHeight > root.clientHeight + 1 || root.scrollWidth > root.clientWidth + 1);
}

// Block middle mouse button
document.addEventListener('mousedown', e => {
    if (e.button === 1 && settings.blockMiddleClick) {
        e.preventDefault();
        e.stopPropagation();
        // Звук только если блокировка реально что-то остановила
        if (wouldAutoscroll(e)) notifyBlocked();
    }
}, true);

// Block F11
document.addEventListener('keydown', e => {
    if (e.key === 'F11' && settings.blockF11) {
        e.preventDefault();
        if (!e.repeat) notifyBlocked(); // при удержании клавиши звук не повторяем
    }
});

chrome.runtime.onMessage.addListener(request => {
    if (request.action === 'settingsUpdated') loadSettings();
});

loadSettings();
