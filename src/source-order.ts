import type { ComponentInternalInstance, VNode } from 'vue'
import { isVNode, onBeforeUnmount, onUpdated } from 'vue'

// One hook per ancestor, shared by all tunnels; unmounted inputs unsubscribe.
const observers = new WeakMap<ComponentInternalInstance, Set<() => void>>()

export function observeSourceOrder(instance: ComponentInternalInstance, refresh: () => void) {
  const subscriptions: Set<() => void>[] = []
  for (let parent = instance.parent; parent; parent = parent.parent) {
    let listeners = observers.get(parent)
    if (!listeners) {
      listeners = new Set()
      observers.set(parent, listeners)
      const callbacks = listeners
      onUpdated(() => callbacks.forEach((callback) => callback()), parent)
    }
    listeners.add(refresh)
    subscriptions.push(listeners)
  }
  onBeforeUnmount(() => subscriptions.forEach((listeners) => listeners.delete(refresh)))
}

function findPath(node: VNode, target: VNode): number[] | undefined {
  if (node === target) return []
  const children = node.suspense
    ? [node.suspense.activeBranch]
    : Array.isArray(node.children)
      ? node.children
      : []
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (!isVNode(child)) continue
    const path = findPath(child, target)
    if (path) return [i, ...path]
  }
}

export function sourceOrder(instance: ComponentInternalInstance): number[] {
  if (!instance.parent) return [instance.uid]
  const parent = instance.parent
  const path = findPath(parent.subTree, instance.vnode)
  return [...sourceOrder(parent), ...(path ?? [instance.uid])]
}

export function compareOrder(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return a.length - b.length
}
