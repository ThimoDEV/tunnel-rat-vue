# tunnel-rat-vue

Send Vue content into an `In` component and render it somewhere else with `Out`, even across separate renderers. Render HTML from inside a TresJS scene, or declare Three.js components alongside your page and render them inside a `TresCanvas`.

A Vue implementation of the idea and `In` / `Out` API from [Poimandres' tunnel-rat](https://github.com/pmndrs/tunnel-rat). The usage guide and examples below adapt the original package's README for Vue and TresJS.

## Examples and playground

- [Vue and TresJS playground](./playground/App.vue): send meshes into a canvas, send HTML controls back out, and mirror content into multiple outputs. Run it locally with the [development commands](#development).
- [Original React examples](https://github.com/pmndrs/tunnel-rat#examples--sandboxes): the upstream package's demos using React Three Fiber.

## Installation

Prepared for an initial npm release. Until publication, use the playground or create a local tarball with `pnpm pack` and install it in another project. Once published:

```sh
pnpm add tunnel-rat-vue vue
```

Vue 3.5+ is the only runtime peer dependency. For the 3D examples, also install `@tresjs/core` and `three`. They are not bundled into this library.

## Usage

Create a tunnel in your component's setup:

```ts
import tunnel from 'tunnel-rat-vue'

const t = tunnel()
```

Use its `In` component to send one or more elements into the tunnel:

```html
<t.In>
  <h1>Hello from the tunnel!</h1>
  <p>This content will render at the output.</p>
</t.In>
```

Somewhere else in the template, render its `Out` component:

```html
<t.Out />
```

`In` renders no visible content. `Out` renders every active input for that tunnel. Each call to `tunnel()` creates an independent pair. Share a pair through props or Vue's `provide` / `inject` when the two ends live in different files.

Reactive values and event handlers keep working. Here is a complete component:

```vue
<script setup lang="ts">
import tunnel from 'tunnel-rat-vue'
import { ref } from 'vue'

const content = tunnel()
const count = ref(0)
</script>

<template>
  <aside>
    <content.In>
      <button @click="count++">Clicked {{ count }} times</button>
    </content.In>
  </aside>

  <main>
    <content.Out />
  </main>
</template>
```

The button mounts inside `main`, and clicking it updates `count`. A named `tunnel` export and the `Tunnel` TypeScript type are also available. Both ESM and CommonJS are supported:

```js
const { tunnel } = require('tunnel-rat-vue')
```

## Examples

### HTML from inside a TresJS canvas

Vue's DOM renderer and TresJS's Three.js renderer create different kinds of objects. A tunnel lets you declare HTML alongside your meshes and render it outside the canvas. First, configure Vue's compiler with the options provided by TresJS:

```ts
// vite.config.ts
import templateCompilerOptions from '@tresjs/core/template-compiler-options'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(templateCompilerOptions)],
})
```

```vue
<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import tunnel from 'tunnel-rat-vue'

const ui = tunnel()
</script>

<template>
  <div id="ui">
    <!-- HTML sent from inside the canvas appears here. -->
    <ui.Out />
  </div>

  <div style="height: 400px">
    <TresCanvas>
      <TresPerspectiveCamera :position="[0, 0, 5]" />

      <ui.In>
        <p>Hi, I'm a cube!</p>
      </ui.In>
      <TresMesh :position="[-1, 0, 0]">
        <TresBoxGeometry />
        <TresMeshNormalMaterial />
      </TresMesh>

      <!-- Multiple inputs appear in their source order. -->
      <ui.In>
        <p>And I'm a sphere!</p>
      </ui.In>
      <TresMesh :position="[1, 0, 0]">
        <TresSphereGeometry :args="[0.6, 32, 16]" />
        <TresMeshNormalMaterial />
      </TresMesh>
    </TresCanvas>
  </div>
</template>
```

### Three.js content from outside the canvas

The same approach works in the other direction. Declare a mesh in the page's component tree and render it inside `TresCanvas`:

```vue
<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import tunnel from 'tunnel-rat-vue'

const scene = tunnel()
</script>

<template>
  <div id="ui">
    <h1>A sphere declared alongside the page</h1>
    <scene.In>
      <TresMesh>
        <TresSphereGeometry :args="[1, 32, 16]" />
        <TresMeshNormalMaterial />
      </TresMesh>
    </scene.In>
  </div>

  <div style="height: 400px">
    <TresCanvas>
      <TresPerspectiveCamera :position="[0, 0, 5]" />
      <scene.Out />
    </TresCanvas>
  </div>
</template>
```

Components passed through `scene.In` mount under `scene.Out`, so they can call `useTres()` and `useLoop()`. The playground demonstrates this with a rotating torus, inline cube nodes, and a scene inspector sent back through `html.In`.

### Multiple outputs

Mount several outputs to render the same inputs in different destinations:

```html
<aside>
  <content.Out />
</aside>

<main>
  <content.Out />
</main>
```

Each output owns separate component instances and local state. Removing one output leaves the others intact. Props and event handlers still refer to the input's shared data; passing an existing Three.js object does not clone that object.

## Gotchas

### Keys and input order

Use stable keys for dynamic lists, as you would elsewhere in Vue:

```html
<content.In v-for="item in items" :key="item.id">
  <p>{{ item.label }}</p>
</content.In>
```

Inputs render in their source component-tree order. A removed input returns to its original position when remounted, and keyed reorders update the output. Set `order` to override this sequence:

```html
<content.In :order="2">
  <p>Second</p>
</content.In>

<content.In :order="1">
  <p>First</p>
</content.In>

<content.Out />
```

Lower numbers come first, with source order breaking ties. Inputs in separate Vue roots use root creation order as a fallback; use `order` to arrange content across those roots.

### State, refs, and context

Reactive slot content updates at the output. Removing or deactivating an input removes its content. Unmounting the output unmounts its children; mounting it again renders the latest input content with fresh child state. Updates and changes to `order` preserve existing child state.

Keep refs inside the rendered child components when each output needs its own ref. A single ref declared at the input cannot represent every rendered copy.

Children inherit `provide` / `inject` context from the output. Pass values as props when they belong to the input's context. This is a Vue implementation of the same core API; React elements and React Three Fiber components cannot be used with it.

### Rendering boundaries and SSR

- Each output renders all active inputs. Use separate tunnels to send different content to different destinations.
- Both ends are empty during SSR. Content appears after inputs mount on the client, allowing hydration without markup mismatches. Create tunnels in component setup or an application-scoped provider in SSR apps such as Nuxt, rather than shared server module singletons.
- Attributes on `In` and `Out` do not create DOM wrappers. Put attributes and event handlers on the slot content.
- A tunnel changes where content mounts. It does not move a WebGL canvas between DOM elements or implement multiple camera viewports. Viewport and scissor management are separate Three.js concerns.

Vue's Teleport is appropriate when moving content between DOM targets. A tunnel also lets the destination renderer create the content, such as Three.js objects inside TresCanvas.

## Development

Use Node.js 24 and the pnpm version pinned in `package.json`.

Oxlint checks JavaScript and TypeScript, including Vue script blocks. Oxfmt formats the source, Vue components, styles, and documentation. Vue template checking is covered by `vue-tsc` and the playground's browser test.

```sh
pnpm install
pnpm dev:prepare
pnpm dev
```

Open the URL printed by Vite. The playground uses library source for hot reload and the built package for its production build. Toggle both inputs, change the torus color, disconnect and reconnect the output, and pause rotation from the HTML panel. Enable **Mirror scene** to render a second output in the same canvas. The panel reads the real Three.js scene so stale or missing meshes are visible.

The repository follows the `src/`, `playground/`, and `test/` layout used by the [Nuxt module starter](https://nuxt.com/docs/4.x/guide/modules/getting-started). Build and peer-dependency boundaries also follow the [TresJS core package](https://github.com/Tresjs/tres/tree/main/packages/core). This is a Vue library, so its scripts use unbuild and Vite rather than Nuxt's module builder.

| Command                             | Purpose                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `pnpm dev:prepare`                  | Build the library and declarations                                        |
| `pnpm dev`                          | Run the TresJS playground with source hot reload                          |
| `pnpm dev:build`                    | Build the library and production playground                               |
| `pnpm dev:preview`                  | Serve the built playground                                                |
| `pnpm lint` / `pnpm lint:fix`       | Check or fix lint findings with Oxlint                                    |
| `pnpm format` / `pnpm format:check` | Format files or check formatting with Oxfmt                               |
| `pnpm test` / `pnpm test:watch`     | Run or watch API and lifecycle tests                                      |
| `pnpm test:types`                   | Typecheck the package, tests, and playground                              |
| `pnpm test:package`                 | Build and exercise ESM/CommonJS exports and their TypeScript declarations |
| `pnpm test:e2e`                     | Exercise the production playground in Chromium                            |
| `pnpm prepack`                      | Build npm distribution files                                              |
| `pnpm check`                        | Lint, check formatting, typecheck, test, and build                        |
| `pnpm release:check`                | Run all checks and an npm pack dry run                                    |

Install the browser once with `pnpm exec playwright install chromium`, or `pnpm exec playwright install --with-deps chromium` on Linux. Run `pnpm dev:build` before `pnpm test:e2e`. The browser test starts its own preview server on port 4177 and uses software WebGL for CI.

GitHub Actions runs on pushes to `master` and on pull requests. It checks the code, exercises the built playground in Chromium, and inspects the npm tarball.

See [RELEASING.md](./RELEASING.md) for the npm release procedure.

## Credits

The original [tunnel-rat](https://github.com/pmndrs/tunnel-rat) by [Poimandres](https://github.com/pmndrs) established the tunnel concept and `In` / `Out` API used here. This README follows its usage guide and adapts its two renderer examples to Vue and TresJS. The original package is [MIT licensed](https://github.com/pmndrs/tunnel-rat/blob/main/LICENSE), copyright (c) 2022 Poimandres.

Thanks also to the contributors to [TresJS issue #312](https://github.com/Tresjs/tres/issues/312) and [Neosoulink's Vue prototype](https://stackblitz.com/edit/vitejs-vite-zqau7f?file=src%2Fcore%2Ftunnel.ts) for exploring this approach in Vue.

## License

[MIT](./LICENSE).
