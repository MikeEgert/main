# Abyssal / Goldeneye

A reusable 3D character and a browser ocean game based on the supplied fish sketch. The existing portfolio landing page links to `../../ocean.html` using **Play Abyssal**. All runtime assets are local; no CDN, account, or API key is needed.

## Run in the portfolio

Use the portfolio's existing `npm start`, then visit `/ocean.html` or choose **Play Abyssal** on `/`. The separate game does not change the portfolio's server or contact form. `dist/` can also be served by any static HTTP server. Browsers require HTTP(S) for ES modules; opening HTML directly with `file://` is unsupported.

For an isolated development preview, run `npm start` in this folder and open `http://127.0.0.1:8090/ocean.html`.

## Play

- Click Goldeneye or choose **Dive in**, then move the pointer, drag on a touchscreen, or use WASD / arrow keys. Touching eligible prey catches it automatically.
- Only creatures strictly smaller than your current size can be eaten. Larger creatures never award points. There are six prey types and five growth stages.
- Spend pearls on **Grow bigger**, or buy a beanie, sailor cap, or crown in **The hat shop**. Purchased hats can be equipped again at no cost.
- P, Escape, or the pause button pauses. Leaving the browser tab also pauses. No lives or real-money purchases.
- Progress is stored in this browser's localStorage. It is not synchronized between browsers/devices. If storage is unavailable, the page reports session-only progress.
- **Explore the model** lets you drag to rotate and scroll to zoom. The GLB download is always available.

## Illustrated graphics

The reef uses layered terrain, faceted rocks, coral, shells, swaying plants, a procedural water/light shader, and instanced drifting bubbles. Catch bursts use a fixed 96-particle pool and floating score labels are capped at eight. The main fish retains the original silhouette with a stronger ink outline, a coated charcoal body, and layered yellow eyes. The visual direction takes light inspiration from the outlined, playful world at https://bendersej.com/tibu/; all scene geometry, graphics, and code here are original. Reduced-motion preferences stop ambient reef animation and the fish catch/growth pulse.

## Model files

`dist/goldeneye.glb` is a self-contained glTF 2.0 binary (~260 KB) with named meshes, PBR/unlit materials, and a one-second looping **Swim** animation. It has no external textures. The charcoal body, yellow eyes, thin gray outlines, triangular dorsal/pectoral fins, and forked tail follow the reference. The unseen depth and opposite side are interpreted from the single image; exact 3D reconstruction cannot be established from one view.

Axes: nose points along -X, dorsal +Y, eyes ±Z. The body has radii 1.25 × 0.91 × 0.49 units. `Tail`, `Dorsal_fin`, `Pectoral_-1`, and `Pectoral_1` are individually animated transform nodes. `Accessory_socket` is the hat attachment point. This uses rigid mesh animation rather than a skinned bone rig. Hats are separate procedural attachments; the downloadable base GLB contains the original fish without a hat.

Load the GLB in any glTF-compatible website engine. For Three.js:

```js
const { scene: fish, animations } = await new GLTFLoader().loadAsync('/assets/goldeneye.glb');
scene.add(fish);
const mixer = new THREE.AnimationMixer(fish);
mixer.clipAction(animations.find(clip => clip.name === 'Swim')).play();
// In your existing render loop:
mixer.update(deltaSeconds);
```

Alternatively import `createFish` and `setHat` from `dist/fish-model.js`. `createFish()` returns `{ root, tail, fins, dorsal, accessory, clips }`; add `root` to your scene. Its import uses the bundled `dist/vendor/three.module.js` (Three.js 0.180.0). Keep that vendor folder with the module, or adapt the import to your application's Three.js dependency. Call `setHat(fish, 'beanie' | 'sailor' | 'crown' | 'none')` to attach accessories.

## Edit and verify

```sh
npm ci
npm run export        # regenerate the base GLB after model edits
npm run sync          # regenerate the portfolio ocean.html from dist/index.html
npm test              # rules, save validation, and GLB/animation round-trip
npm run test:browser  # running preview required; uses installed macOS Chrome
node scripts/graphics-check.mjs # mascot click, effects, and reduced-motion checks
```

The browser check exercises landing navigation, WebGL rendering, model rotation, GLB download, keyboard movement and pause, purchases, persistence, mobile layout, and actual collision rewards. It uses an isolated browser profile and synthetic save data. Adapt the Chrome executable path for other operating systems. These checks reduce regressions but do not guarantee identical GPU behavior on every device. WebGL 2 is required; an unavailable/context-lost renderer displays a fallback with the model download still accessible.

`dist/index.html` is the standalone hosted edition. `scripts/sync-page.mjs` adds a relative base URL and portfolio return links for the integrated `ocean.html`. Do not manually diverge the generated page. The source image is not redistributed. Three.js's license is included in `dist/vendor/THREE-LICENSE.txt`.
