import type { VNode } from 'vue'
import { cloneVNode, isVNode } from 'vue'

// Vue omits these compiler fields from its public VNode declarations.
interface CompiledVNode extends VNode {
  dynamicChildren?: (VNode[] & { hasOnce?: boolean }) | null
  ssContent?: VNode | null
  ssFallback?: VNode | null
}

/** Every output owns its VNodes, including compiled block references. */
export function cloneContent(nodes: VNode[]): VNode[] {
  const copies = new Map<VNode, VNode>()
  const clone = (node: CompiledVNode): VNode => {
    const existing = copies.get(node)
    if (existing) return existing
    const copy: CompiledVNode = cloneVNode(node)
    copies.set(node, copy)
    if (node.dirs) copy.dirs = node.dirs.map((binding) => ({ ...binding }))
    if (Array.isArray(node.children))
      copy.children = node.children.map((child) => (isVNode(child) ? clone(child) : child))
    if (node.dynamicChildren) {
      copy.dynamicChildren = node.dynamicChildren.map(clone)
      copy.dynamicChildren.hasOnce = node.dynamicChildren.hasOnce
    }
    if (node.ssContent) copy.ssContent = clone(node.ssContent)
    if (node.ssFallback) copy.ssFallback = clone(node.ssFallback)
    return copy
  }
  return nodes.map(clone)
}
