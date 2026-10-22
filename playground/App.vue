<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import tunnel from 'tunnel-rat-vue'
import { ref } from 'vue'
import SceneStatus from './SceneStatus.vue'
import SpinningTorus from './SpinningTorus.vue'

const scene = tunnel()
const html = tunnel()
const showTorus = ref(true)
const showCube = ref(true)
const showOutlet = ref(true)
const mirrorScene = ref(false)
const color = ref('#f4b860')
const paused = ref(false)
</script>

<template>
  <main>
    <header>
      <h1>tunnel-rat<span>-vue</span></h1>
      <nav aria-label="Resources">
        <a href="https://github.com/ThimoDEV/tunnel-rat-vue#usage">Docs</a>
        <a href="https://github.com/ThimoDEV/tunnel-rat-vue">GitHub ↗</a>
      </nav>
    </header>

    <p class="intro">Declare content anywhere. Render it somewhere else.</p>

    <div class="workspace">
      <section class="inputs" aria-labelledby="input-title">
        <div class="panel-heading">
          <h2 id="input-title">Page</h2>
          <code>scene.In →</code>
        </div>
        <div class="input-controls">
          <div class="object-row">
            <label class="switch-row"
              ><span><span class="dot amber" />Torus</span
              ><input v-model="showTorus" type="checkbox" aria-label="Include torus"
            /></label>
            <label class="color-row"
              ><span>Color</span><input v-model="color" type="color" aria-label="Torus color"
            /></label>
          </div>
          <scene.In v-if="showTorus">
            <SpinningTorus :color="color" :paused="paused" />
          </scene.In>

          <div class="object-row">
            <label class="switch-row"
              ><span><span class="dot mint" />Cube</span
              ><input v-model="showCube" type="checkbox" aria-label="Include cube"
            /></label>
          </div>
          <scene.In v-if="showCube">
            <TresMesh name="cube" :position="[1.35, 0, 0]" :rotation="[0.35, 0.4, 0]">
              <TresBoxGeometry :args="[1.35, 1.35, 1.35]" />
              <TresMeshStandardMaterial color="#91d9bb" :roughness="0.3" :metalness="0.15" />
            </TresMesh>
          </scene.In>
        </div>
        <div class="source-preview" aria-label="Input example">
          <pre><code>&lt;scene.In&gt;
  &lt;SpinningTorus /&gt;
&lt;/scene.In&gt;</code></pre>
        </div>
      </section>

      <section class="stage-panel" aria-labelledby="output-title">
        <div class="panel-heading">
          <h2 id="output-title">Canvas</h2>
          <code>→ scene.Out</code>
        </div>
        <div class="stage">
          <TresCanvas clear-color="#141817" :alpha="false" :antialias="true">
            <TresPerspectiveCamera :position="[0, 0.5, 7]" :look-at="[0, 0, 0]" />
            <TresAmbientLight :intensity="1.5" />
            <TresDirectionalLight :position="[3, 5, 4]" :intensity="3" />
            <scene.Out v-if="showOutlet" />
            <TresGroup v-if="mirrorScene" :position="[0, 1.9, 0]" :scale="0.4">
              <scene.Out />
            </TresGroup>
            <SceneStatus :html="html" :paused="paused" @toggle-pause="paused = !paused" />
          </TresCanvas>
          <p v-if="!showOutlet && !mirrorScene" class="empty-state">Output disconnected</p>
          <p v-else-if="!showTorus && !showCube" class="empty-state">
            Enable a shape to send it here
          </p>
        </div>
        <div class="stage-toolbar">
          <label class="switch-row"
            ><span>Connect output</span><input v-model="showOutlet" type="checkbox"
          /></label>
          <label class="switch-row"
            ><span>Mirror scene</span><input v-model="mirrorScene" type="checkbox"
          /></label>
        </div>
      </section>
    </div>

    <section class="return-panel" aria-labelledby="return-title">
      <div class="return-heading">
        <h2 id="return-title">Canvas → page</h2>
        <code>html.In → html.Out</code>
        <p>This control is declared inside the canvas.</p>
      </div>
      <html.Out />
    </section>

    <details class="how-it-works">
      <summary>How it works</summary>
      <div class="code-examples">
        <div>
          <h2>Page → canvas</h2>
          <pre><code>const scene = tunnel()

&lt;scene.In&gt;
  &lt;SpinningTorus /&gt;
&lt;/scene.In&gt;

&lt;TresCanvas&gt;
  &lt;scene.Out /&gt;
&lt;/TresCanvas&gt;</code></pre>
        </div>
        <div>
          <h2>Canvas → page</h2>
          <pre><code>const html = tunnel()

&lt;TresCanvas&gt;
  &lt;html.In&gt;
    &lt;button&gt;Pause rotation&lt;/button&gt;
  &lt;/html.In&gt;
&lt;/TresCanvas&gt;

&lt;html.Out /&gt;</code></pre>
        </div>
      </div>
    </details>

    <footer>
      <span>Vue + TresJS</span>
      <a href="https://github.com/pmndrs/tunnel-rat#examples">Based on pmndrs/tunnel-rat ↗</a>
    </footer>
  </main>
</template>
