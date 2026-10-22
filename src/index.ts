import type { DefineComponent, VNode } from 'vue'
import {
  defineComponent,
  Fragment,
  getCurrentInstance,
  h,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  onUpdated,
  shallowReactive,
} from 'vue'
import { cloneContent } from './clone-content'
import { compareOrder, observeSourceOrder, sourceOrder } from './source-order'

interface Entry {
  nodes: VNode[]
  order: number
  position: number[]
}

export interface Tunnel {
  // Explicit Vue defaults keep declarations compatible with Vue 3.5.0.
  In: DefineComponent<{ order?: number }, () => null, {}, {}, {}>
  // Avoid emitting Vue's newer internal generic parameters.
  Out: DefineComponent<{}, () => VNode[], {}, {}, {}>
}

/** Create an independent tunnel with one or more outputs. */
export function tunnel(): Tunnel {
  const entries = shallowReactive(new Map<number, Entry>())
  let nextId = 0

  const In = defineComponent({
    name: 'TunnelIn',
    inheritAttrs: false,
    props: {
      /** Lower values render first; ties follow source tree order. */
      order: Number,
    },
    setup(props, { slots }) {
      const id = nextId++
      const instance = getCurrentInstance()!
      let nodes: VNode[] = []
      let active = false

      const publish = () => {
        if (active)
          entries.set(id, { nodes, order: props.order ?? 0, position: sourceOrder(instance) })
      }
      const activate = () => {
        active = true
        publish()
      }
      const remove = () => {
        active = false
        entries.delete(id)
      }

      // Register only on the client: SSR must not retain nodes between requests.
      onMounted(activate)
      onActivated(activate)
      onUpdated(publish)
      onDeactivated(remove)
      onBeforeUnmount(remove)
      observeSourceOrder(instance, () => {
        const entry = entries.get(id)
        if (!entry) return
        const position = sourceOrder(instance)
        if (compareOrder(entry.position, position) !== 0) entries.set(id, { ...entry, position })
      })

      return () => {
        // Calling the slot during render tracks its reactive dependencies.
        nodes = slots.default?.() ?? []
        return null
      }
    },
  })

  const Out = defineComponent({
    name: 'TunnelOut',
    inheritAttrs: false,
    setup() {
      return () =>
        [...entries]
          .sort(
            ([aId, a], [bId, b]) =>
              a.order - b.order || compareOrder(a.position, b.position) || aId - bId,
          )
          .map(([id, entry]) => h(Fragment, { key: id }, cloneContent(entry.nodes)))
    },
  })

  return { In, Out }
}

export default tunnel
