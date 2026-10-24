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
- `liquid_glass` saves the independent material preference (`true`/`false`). The root `data-glass` attribute enables translucent cards, capsule controls, lens-like edge highlights and static reflections while preserving the selected palette and background. The toggle lives at the top of the appearance panel, outside the theme radio group.
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

The window's dock button switches to a 320×72 capsule with the existing countdown, timer start/pause, Skip, music play/pause and expand actions. Timer uses an inline SVG stopwatch inside a rounded square; music keeps the circular play/pause control. CSS changes the layout without remounting the timer or YouTube player. Background, palette and glass preferences are retained. The capsule is a native drag region with `no-drag` controls and no application scrolling. On Windows/Linux the [Electron window shape API](https://www.electronjs.org/docs/latest/api/base-window#winsetshaperects-windows-linux-experimental) clips the window and its input region to the capsule; unsupported window managers keep a rectangular native region.

`electron/window-mode.js` owns native sizing and serialized transitions. Entering dock saves normal bounds, maximize state, size limits and the previous pin, then automatically pins the dock. Expanding restores those properties. Dock and normal window positions are saved independently and fitted to an available display work area; moving one never shifts the other's saved position. The dock scales from 80–160% through Settings or its drag handle. A fresh launch starts in the full interface with saved position and appearance preferences.

## Music search

Search uses a dedicated modal panel, not a popover over the timer. The opaque `--search-surface` stays readable even with the glass material enabled. Search header, input and result count do not scroll; only the result list and its load-more action scroll. Result rows use fixed thumbnail and play-icon columns with a flexible, two-line title and a separate ellipsized channel name. The shared panel handles focus trapping, initial input focus, Escape, backdrop dismissal and focus restoration.

The search service returns the full initial video page (up to 50 items per response) plus an opaque continuation cursor, with a user-initiated load-more action for subsequent pages. Cursors bind to the normalized query, expire after ten minutes and retain video IDs to omit duplicates. Requests share pending work and cache successful responses; failed pages can be retried without losing existing results. The UI keeps the submitted query separate from edits and ignores replies from older queries or a closed panel.

## Liquid Glass material

The optical approach follows [rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react), as requested: a separate backdrop layer with SVG displacement, RGB channel separation near the edge, static specular rims. This is a Vue/Electron adaptation, without installing React or importing the reference's bitmap maps or shader generator. The filter-channel technique is MIT-licensed by Max Rovensky; the full copyright and license notice ships in [public/licenses/liquid-glass-react.txt](../public/licenses/liquid-glass-react.txt). It is not Apple's native SwiftUI/AppKit material.

`src/services/glass-optics.js` generates rounded-rectangle lens maps locally. The center is neutral; only a narrow perimeter bends and separates the background's color channels. Each `.pofi-glass-warp` layer has the backdrop filter and SVG filter; text, icons, inputs and timer digits remain outside this layer and stay sharp. Masked rims provide fixed reflections. Panels retain stronger tint for readability, and the music-search panel stays opaque.

`src/services/liquid-glass.js` attaches the material to cards, toolbar, player dock, panels and controls. Filter definitions are shared by matching geometry; raster maps are capped at 384px on their longest side. ResizeObserver rebuilds them only when geometry changes. Hidden/display-contents containers relinquish their lenses when switching into dock mode. Toggling off or unmounting removes layers, SVG resources, observers, pending animation frames.

SVG primitives use numeric user-space dimensions, so displacement maps remain valid inside the shared zero-size definitions SVG. RGB recombination restores the source alpha and adds complementary edge/center masks, avoiding a dark beveled seam. `npm run test:glass` (with `POFI_DEV_URL` set to the active dev server, or after a Vue build) compares screenshots over a fixed grid: edge pixels must refract while center pixels remain unchanged. It also checks that hover/press do not change the material, theme/background combinations, clean toggling and dock restoration. Artifacts go to `.test-output/glass/`.

The material does not select artwork or set background mode. The optional **Kính tối** switch persists `liquid_glass_dark` independently: smoky surfaces and light foregrounds improve contrast over bright scenes on all themes. It is visible while glass is enabled and retains its selection when glass is turned off. The garden accent also becomes lighter within dark glass; the scene and outer palette remain selected.

Glass has no pointer listeners, attraction, stretch or moving highlights. Hover and press styling is disabled while glass is enabled; keyboard focus rings and selected states remain available. If canvas/filter setup is unavailable, frosted CSS glass remains usable. There is no continuous animation loop.


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

