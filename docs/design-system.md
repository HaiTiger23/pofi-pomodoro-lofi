# Pofi · Lofi design system

Pofi uses one compact desktop layout and three complete visual themes. Theme changes affect backgrounds, surfaces, text, controls, input fields, panels and focus states without resetting playback or the active timer. Liquid Glass is a separate material switch, available on every theme and background source.

| Theme | ID | Palette |
|---|---|---|
| Góc ấm | warm | Walnut, cream, amber, sage |
| Đêm mơ | night | Midnight navy, dusty lavender, soft blue |
| Vườn sớm | garden | Warm ivory, natural green, light oak |

## Source of truth

- Theme names, preview images, icons and captions: `shared/themes.js`.
- Semantic color tokens and shared component styles: `src/assets/css/design-system.css`.
- Shared panel with focus trapping, Escape and backdrop close: `src/components/DrawerPanel.vue`.
- Persistent theme selection, radio semantics and arrow-key support: `src/components/ThemePicker.vue`.
- Desktop persistence key: `ui_theme`, validated against the available themes. Invalid values recover to `warm`.
- Background artwork: `public/themes/{warm,night,garden}.webp`; original PNGs are retained in `design/artwork/`.
- `liquid_glass` saves the independent material preference (`true`/`false`). The root `data-glass` attribute enables translucent cards, capsule controls, lens-like edge highlights and pointer lighting while preserving the selected palette and background. The toggle lives at the top of the appearance panel, outside the theme radio group.
- The retired `glass` theme migrates to `night` with the material enabled; explicit saved off preferences are preserved.
- Background source is independent of theme: `background_mode` saves `scene` (static lofi artwork), `youtube` (blurred current video thumbnail) or `video` (playing YouTube video).

## Visual rules

Use semantic variables instead of fixed colors: `--ink`, `--muted`, `--accent`, `--accent-ink`, `--surface`, `--panel`, `--field`, `--line`, `--danger`. The garden theme uses light surfaces and dark text; the two evening themes use dark surfaces and light text.

Segoe UI/system fonts are used consistently for all text, including Vietnamese panel headings, with tabular numerals for the timer. Avoid mixing serif fonts whose Vietnamese glyphs fall back to a different typeface. Fonts and all background artwork work without an external font service. Remix Icon is the single icon family. Icon mappings in `src/assets/css/icons.css` must include icons added to components.

Spacing follows a 4px base; compact actions scale between 28–37px in short windows; corner radii are 8–14px for controls and 17–24px for surfaces. Actions retain keyboard focus indicators. Informational state uses both text and color.

The native window opens at 460×620, with a minimum size of 320×340. The app fills a fixed viewport with a toolbar, centered timer and bottom music dock. Neither axis of the app can scroll. Container queries reduce timer details as height shrinks. Panels and search results fit inside the viewport and scroll independently. Reduced-motion preferences disable transitions.

Electron uses a frameless window with in-app minimize, maximize/restore and close controls. The header's empty space is a native drag region; interactive controls are explicitly `no-drag`. The header remains one row: below 520px, utilities collapse into a right-side toggle with a horizontally sliding, absolutely positioned toolbar. Opening it never changes header height; the glass material must not override its positioning. Selecting an action, clicking outside or pressing Escape dismisses it. Hidden navigation is inert and restores keyboard focus to the toggle. Modal backdrops begin below the window controls so those actions remain accessible. Maximize state follows both the buttons and native window events through a narrow preload subscription; it is never inferred from viewport size. Browser previews omit native controls and drag behavior.

The coffee-and-headphones logo uses `public/pofi-logo.png` in the header and `pofi_logo.png` for the native window. Platform icon files and favicon derive from the same generated original. See [exact logo prompt and paths](../design/logo-prompt.md).

## Compact dock

The window's dock button switches to a 320×72 capsule with the existing countdown, music play/pause button and an expand action. CSS changes the layout without remounting the timer or YouTube player. Background, palette and glass preferences are retained. The capsule is a native drag region with `no-drag` controls and no application scrolling. On Windows/Linux the [Electron window shape API](https://www.electronjs.org/docs/latest/api/base-window#winsetshaperects-windows-linux-experimental) clips the window and its input region to the capsule; unsupported window managers keep a rectangular native region.

`electron/window-mode.js` owns native sizing and serialized transitions. Entering dock saves normal bounds, maximize state, size limits and the previous pin, then automatically pins the dock. Expanding restores those properties. A moved dock shifts the restored window by the same amount and clamps it to the display work area. The mode is session state, separate from persisted appearance preferences; a fresh launch starts in the full interface.

## Music search

Search uses a dedicated modal panel, not a popover over the timer. The opaque `--search-surface` stays readable even with the glass material enabled. Search header, input and result count do not scroll; only the result list and its load-more action scroll. Result rows use fixed thumbnail and play-icon columns with a flexible, two-line title and a separate ellipsized channel name. The shared panel handles focus trapping, initial input focus, Escape, backdrop dismissal and focus restoration.

The search service returns the full initial video page (up to 50 items per response) plus an opaque continuation cursor, with a user-initiated load-more action for subsequent pages. Cursors bind to the normalized query, expire after ten minutes and retain video IDs to omit duplicates. Requests share pending work and cache successful responses; failed pages can be retried without losing existing results. The UI keeps the submitted query separate from edits and ignores replies from older queries or a closed panel.

## Liquid Glass material

The implementation takes visual direction from [Apple's Liquid Glass design](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/): translucent functional layers, rounded controls and specular highlights. This Electron/CSS interpretation uses backdrop blur and saturation, masked gradient rims, inset highlights and local pointer reflections; it does not use Apple's native SwiftUI/AppKit material or claim identical optical rendering.

The material changes cards, the toolbar, player dock, panels, buttons, switches and fields. It does not select artwork, set background mode or change the palette. Garden retains light glass with dark text; evening themes retain dark glass with light text. Local highlights update at most once per animation frame and stop on pointer leave, window blur, reduced motion or touch input. There is no continuous animation loop.

## Artwork provenance and exact generation prompts

Mode: built-in image_gen tool, using the imagegen skill. Generated PNGs were copied into this repository without editing. WebP copies preserve the same size and content; only the encoding is changed. Regenerate them with `node scripts/run-electron.js --hidden scripts/encode-themes.js`. Each image is a project asset, not a UI mockup.

### warm.png

```text
Use case: stylized-concept. Asset type: original wide 16:9 illustrated background for the Pofi desktop focus app. Warm cozy evening study room with a wooden desk beside a large rainy window, amber desk lamp, cream ceramics and a few sage green plants. Soft distant city lights, intimate quiet atmosphere. Rich walnut, warm amber, soft sage and cream, deep brown shadows. Hand painted lofi anime environment illustration, cinematic composition with desk and window on the RIGHT two thirds, LEFT third simple softly shaded wall with quiet negative space for a focus timer UI. Beautiful restrained detailed environment, gentle grain, soft painterly edges, calm lived-in room, sophisticated muted colors, no character. The image fills the entire frame edge to edge. No text, no letters, no logos, no interface, no borders, no watermark.
```

### night.png

```text
Use case: stylized-concept. Asset type: original wide 16:9 illustrated background for the Pofi desktop focus app. Dreamy midnight study room with a wooden desk beside a large window, moonlit indigo sky and a quiet distant city, soft lavender desk lamp, navy and muted violet foliage. Rich midnight navy, dusty lavender and cool blue, subtle warm small highlights. Hand painted lofi anime environment illustration, cinematic composition with desk and window on the RIGHT two thirds, LEFT third simple softly shaded wall with quiet negative space for a focus timer UI. Beautiful restrained detailed environment, gentle grain, soft painterly edges, calm lived-in room, sophisticated muted colors, no character. The image fills the entire frame edge to edge. No text, no letters, no logos, no interface, no borders, no watermark.
```

### garden.png

```text
Use case: stylized-concept. Asset type: original wide 16:9 illustrated background for the Pofi desktop focus app. Airy peaceful morning study room with a wooden desk beside a large open window overlooking a lush green garden, dappled early sunlight, cream ceramic cup and sage green plants. Soft ivory, light oak, pale sage, warm cream, natural green. Hand painted lofi anime environment illustration, cinematic composition with desk and window on the RIGHT two thirds, LEFT third simple softly shaded wall with quiet negative space for a focus timer UI. Beautiful restrained detailed environment, gentle grain, soft painterly edges, calm lived-in room, sophisticated muted colors, no character. The image fills the entire frame edge to edge. No text, no letters, no logos, no interface, no borders, no watermark.
```

