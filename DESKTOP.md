# Bugrush — Desktop Client (Tauri)

A Tauri 2 wrapper that loads `https://bugrush.lol` in a native window with a
custom themed title bar (drag region + minimize / maximize / close, pixel
font, indigo accents). The web app is unchanged for browser users — the
title bar only appears when the page detects it's running inside Tauri.

## One-time setup

1. **Install Rust.** https://www.rust-lang.org/tools/install (default toolchain is fine).
2. **Windows only:** install the [Visual Studio C++ build tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (select "Desktop development with C++"). macOS needs Xcode CLI tools (`xcode-select --install`); Linux needs `webkit2gtk` and friends — see [Tauri's prerequisites](https://v2.tauri.app/start/prerequisites/).
3. **Install JS dependencies:**
   ```
   npm install
   ```
4. **Generate the app icon set** from `src/app/icon.svg`:
   ```
   npm run tauri:icon
   ```
   This writes `src-tauri/icons/` (gitignored). Re-run any time the source icon changes.

## Develop

```
npm run tauri:dev
```

Opens a desktop window pointing at `https://bugrush.lol`. The title bar at the
top is rendered by [TauriTitleBar](src/components/TauriTitleBar.tsx) inside
the Next app — to iterate on it locally, temporarily change
`windows[0].url` in [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json) to
`http://localhost:3000` and run `npm run dev` in another terminal.

## Build a distributable

```
npm run tauri:build
```

Outputs platform-specific installers under `src-tauri/target/release/bundle/`
(`.msi`/`.exe` on Windows, `.dmg`/`.app` on macOS, `.deb`/`.AppImage` on Linux).

## How it works

- The window is borderless (`decorations: false`) — the OS draws no chrome.
- The Next app mounts [TauriTitleBar](src/components/TauriTitleBar.tsx) at the
  top of the body. It detects Tauri via `__TAURI_INTERNALS__` and returns
  `null` for browser visitors.
- Drag region: the `data-tauri-drag-region` attribute on the bar tells the
  Tauri webview to treat that area as a draggable handle.
- Min / maximize-toggle / close call
  [`@tauri-apps/api/window`](https://v2.tauri.app/reference/javascript/api/namespacewindow/)'s
  `getCurrentWindow()` methods, dynamically imported so the module is only
  pulled in when Tauri is detected.
- The window-control permissions are granted to the remote origin via
  [src-tauri/capabilities/default.json](src-tauri/capabilities/default.json)
  (`remote.urls` whitelists `bugrush.lol`).

## Files

- [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json) — window + bundle config
- [src-tauri/capabilities/default.json](src-tauri/capabilities/default.json) — IPC permissions for the remote URL
- [src-tauri/Cargo.toml](src-tauri/Cargo.toml), [src-tauri/src/](src-tauri/src/), [src-tauri/build.rs](src-tauri/build.rs) — Rust shell
- [src/components/TauriTitleBar.tsx](src/components/TauriTitleBar.tsx) — title bar component
- [src/app/layout.tsx](src/app/layout.tsx) — mounts the title bar at the top of body

## Notes

- The Tauri client always loads the **live** site — there's no static bundle.
  Auth, API, realtime polling, and DB-backed features work exactly as on the web.
- Cookies and session work the same as in a normal browser (Tauri uses a
  per-app webview profile).
- `src-tauri/icons/`, `src-tauri/target/`, and `src-tauri/gen/` are gitignored —
  regenerated locally.
