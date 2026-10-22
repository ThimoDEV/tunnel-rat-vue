import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { it } from 'node:test'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<body></body>')
for (const key of ['window', 'document', 'Element', 'HTMLElement', 'SVGElement', 'Node'])
  globalThis[key] = dom.window[key]

const { createApp, h, nextTick, ref } = await import('vue')
const { default: esmTunnel } = await import('tunnel-rat-vue')
const { tunnel: cjsTunnel } = createRequire(import.meta.url)('tunnel-rat-vue')

for (const [format, tunnel] of [
  ['ESM', esmTunnel],
  ['CommonJS', cjsTunnel],
]) {
  it(`${format} package export mounts, updates and removes content`, async () => {
    const t = tunnel()
    const label = ref('initial')
    const visible = ref(true)
    const container = document.createElement('div')
    document.body.append(container)
    const app = createApp({
      render: () =>
        h('main', [h(t.Out), visible.value ? h(t.In, null, () => h('p', label.value)) : null]),
    })
    try {
      app.mount(container)
      await nextTick()
      assert.equal(container.querySelector('p').textContent, 'initial')
      label.value = 'updated'
      await nextTick()
      assert.equal(container.querySelector('p').textContent, 'updated')
      visible.value = false
      await nextTick()
      assert.equal(container.querySelector('p'), null)
    } finally {
      app.unmount()
      container.remove()
    }
  })
}
