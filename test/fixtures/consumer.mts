import type { Tunnel } from 'tunnel-rat-vue'
import tunnel from 'tunnel-rat-vue'
import { h } from 'vue'

const t: Tunnel = tunnel()
h(t.In, { order: 1 }, () => h('p', 'ESM'))
h(t.Out)
