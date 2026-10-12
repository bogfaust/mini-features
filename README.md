# Mini Features 🧩

A small collection of mini features for your browser.

![Version](https://img.shields.io/badge/version-0.0.1-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-green)
![Platform](https://img.shields.io/badge/platform-Chrome-yellow)

---

## Features

- **Block F11** — prevents accidental switching to fullscreen mode
- **Block middle-click autoscroll** — the middle mouse button no longer starts the scroll cursor (links still open in a new tab)
- **Restore closed tabs** — bring back the last closed tab with a hotkey (`Alt+Shift+T` by default)
- **Custom hotkey** — change the shortcut in browser settings, the extension always shows the current one
- **Sound on blocked actions** — plays a sound when a blocked key or button is pressed (enabled by default)
- **Volume control** — adjust the sound volume and test it right in settings
- **Multilingual** — English and Russian interfaces (English by default)

---

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the folder that contains `manifest.json`

> Requires Chrome 116 or newer (or another Chromium-based browser of the same version).

---

## Usage

### Block F11
Enable **Block F11 key** in settings. Pressing `F11` on a page will no longer toggle fullscreen mode.

### Block middle mouse button
Enable **Block middle mouse button scroll** in settings. Clicking the wheel on a page will not start autoscroll.
Middle-clicking a link still opens it in a new tab, and no sound is played in that case.

### Restore closed tabs
Press `Alt+Shift+T` to reopen the last closed tab.
To change the shortcut, go to `chrome://extensions/shortcuts` and set a new one for **Mini Features** — the settings page picks it up automatically.

### Sound
When a blocked action is attempted, the extension plays a short sound.
Enable or disable it and adjust the volume in settings. Use the **Test** button to preview the sound.

### Settings
Click the extension icon → **Settings** to open the options page:
- Switch interface language (English / Russian)
- Enable or disable each feature
- Turn sound on or off, adjust volume, test the sound

Changes are saved automatically.

---

## Known limitations

- Blocking works only on regular web pages. Browser pages (`chrome://…`), the Chrome Web Store and the PDF viewer do not allow extensions to inject scripts, so `F11` and the middle button are not blocked there.

---

### Localization

Supported languages: **English** (`en`), **Russian** (`ru`).
Translations live in `src/locales.json` — to add a language, copy the `en` block and translate the values.