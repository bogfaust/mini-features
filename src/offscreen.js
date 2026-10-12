// Offscreen-документ: единственное место, где в MV3 можно надёжно проигрывать звук
// (service worker звук играть не умеет, а CSP страниц может блокировать media из content script)
const audio = new Audio(chrome.runtime.getURL('assets/sounds/quack.mp3'));

chrome.runtime.onMessage.addListener(msg => {
    if (msg.action !== 'offscreenPlay') return;

    // Громкость приходит в процентах (0-100)
    audio.volume = Math.min(1, Math.max(0, (Number(msg.volume) || 0) / 100));
    audio.currentTime = 0; // повторное срабатывание начинает звук заново
    audio.play().catch(e => console.warn('Sound playback failed:', e));
});
