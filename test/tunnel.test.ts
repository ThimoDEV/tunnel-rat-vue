import type { Directive } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createSSRApp,
  defineComponent,
  h,
  inject,
  KeepAlive,
  nextTick,
  onUnmounted,
  provide,
  ref,
} from 'vue'
import tunnel from '../src'

enableAutoUnmount(afterEach)

describe('tunnel', () => {
  it('combines inputs, updates reactive slots and removes only the unmounted input', async () => {
    const t = tunnel()
    const text = ref('first')
    const visible = ref(true)
    const wrapper = mount(() =>
      h('main', [
        h('aside', [visible.value ? h(t.In, null, () => h('p', text.value)) : null]),
        h(t.In, null, () => h('p', 'second')),
        h('section', [h(t.Out)]),
      ]),
    )
    await nextTick()
    expect(wrapper.find('aside').text()).toBe('')
    expect(wrapper.findAll('section p').map((p) => p.text())).toEqual(['first', 'second'])
    text.value = 'updated'
    await nextTick()
    expect(wrapper.findAll('section p').map((p) => p.text())).toEqual(['updated', 'second'])
    visible.value = false
    await nextTick()
    expect(wrapper.findAll('section p').map((p) => p.text())).toEqual(['second'])
    visible.value = true
    await nextTick()
    expect(wrapper.findAll('section p').map((p) => p.text())).toEqual(['updated', 'second'])
  })

  it('preserves child state and handlers while ordering and updating inputs', async () => {
    const t = tunnel()
    const label = ref('A')
    const order = ref(2)
    const Counter = defineComponent({
      props: { label: String },
      setup(props) {
        const count = ref(0)
        return () => h('button', { onClick: () => count.value++ }, `${props.label}:${count.value}`)
      },
    })
    const wrapper = mount(() =>
      h('main', [
        h(t.In, { order: order.value }, () => h(Counter, { label: label.value })),
        h(t.In, { order: 1 }, () => h('p', 'B')),
        h('section', [h(t.Out)]),
      ]),
    )
    await nextTick()
    expect(wrapper.find('section').text()).toBe('BA:0')
    await wrapper.find('button').trigger('click')
    label.value = 'changed'
    order.value = 0
    await nextTick()
    expect(wrapper.find('section').text()).toBe('changed:1B')
  })

  it('restores a remounted nested input to its source position and follows keyed reorders', async () => {
    const t = tunnel()
    const visible = ref(true)
    const names = ref(['One', 'Two', 'Three'])
    const Rat = defineComponent({
      props: { name: String },
      setup: (props) => () =>
        h('div', [
          props.name !== 'Two' || visible.value ? h(t.In, null, () => h('li', props.name)) : null,
        ]),
    })
    const wrapper = mount(() =>
      h('main', [h('ul', [h(t.Out)]), ...names.value.map((name) => h(Rat, { key: name, name }))]),
    )
    await nextTick()
    expect(wrapper.findAll('li').map((node) => node.text())).toEqual(['One', 'Two', 'Three'])
    visible.value = false
    await nextTick()
    visible.value = true
    await nextTick()
    expect(wrapper.findAll('li').map((node) => node.text())).toEqual(['One', 'Two', 'Three'])
    names.value = ['Three', 'Two', 'One']
    await nextTick()
    expect(wrapper.findAll('li').map((node) => node.text())).toEqual(['Three', 'Two', 'One'])
  })

  it.each(['element', 'slot'])(
    'keeps nested content and child state independent across outputs (%s)',
    async (boundary) => {
      const t = tunnel()
      const disposed = vi.fn()
      const Counter = defineComponent({
        setup() {
          const count = ref(0)
          onUnmounted(disposed)
          return () => h('button', { onClick: () => count.value++ }, String(count.value))
        },
      })
      const wrapper = mount(
        defineComponent({
          components: {
            Input: t.In,
            Output: t.Out,
            Counter,
            Wrapper: defineComponent({ template: '<slot />' }),
          },
          setup: () => ({ label: ref('first'), left: ref(true), input: ref(true) }),
          template: `<main><Input v-if="input">${boundary === 'slot' ? '<Wrapper>' : ''}<div><span>{{ label }}</span><Counter v-once /></div>${boundary === 'slot' ? '</Wrapper>' : ''}</Input><section v-if="left"><Output /></section><aside><Output /></aside></main>`,
        }),
      )
      await nextTick()
      expect(wrapper.find('section').text()).toBe('first0')
      expect(wrapper.find('aside').text()).toBe('first0')
      await wrapper.find('section button').trigger('click')
      expect(wrapper.find('section').text()).toBe('first1')
      expect(wrapper.find('aside').text()).toBe('first0')
      wrapper.vm.label = 'updated'
      await nextTick()
      expect(wrapper.find('section').text()).toBe('updated1')
      expect(wrapper.find('aside').text()).toBe('updated0')
      wrapper.vm.left = false
      await nextTick()
      await wrapper.find('aside button').trigger('click')
      expect(wrapper.find('aside').text()).toBe('updated1')
      wrapper.vm.left = true
      await nextTick()
      expect(wrapper.find('section').text()).toBe('updated0')
      expect(wrapper.find('aside').text()).toBe('updated1')
      wrapper.vm.input = false
      await nextTick()
      expect(wrapper.find('section').text()).toBe('')
      expect(wrapper.find('aside').text()).toBe('')
      expect(disposed).toHaveBeenCalledTimes(3)
    },
  )

  it('renders the latest content in a late or remounted outlet and disposes its children', async () => {
    const t = tunnel()
    const output = ref(false)
    const text = ref('before')
    const disposed = vi.fn()
    const Child = defineComponent({
      props: { text: String },
      setup(props) {
        onUnmounted(disposed)
        return () => h('p', props.text)
      },
    })
    const wrapper = mount(() =>
      h('main', [
        h(t.In, null, () => h(Child, { text: text.value })),
        output.value ? h(t.Out) : null,
      ]),
    )
    await nextTick()
    text.value = 'latest'
    output.value = true
    await nextTick()
    expect(wrapper.text()).toBe('latest')
    output.value = false
    await nextTick()
    expect(wrapper.text()).toBe('')
    expect(disposed).toHaveBeenCalledTimes(1)
    output.value = true
    await nextTick()
    expect(wrapper.text()).toBe('latest')
  })

  it('gives a late output fresh directive bindings after an existing output updates', async () => {
    const t = tunnel()
    const mounted: { value: string; oldValue: string | null | undefined }[] = []
    const updated: { value: string; oldValue: string | null | undefined }[] = []
    const record: Directive<HTMLElement, string> = {
      mounted: (_, binding) => mounted.push({ value: binding.value, oldValue: binding.oldValue }),
      updated: (_, binding) => updated.push({ value: binding.value, oldValue: binding.oldValue }),
    }
    const wrapper = mount(
      defineComponent({
        components: { Input: t.In, Output: t.Out },
        directives: { record },
        setup: () => ({ label: ref('one'), extra: ref(false) }),
        template:
          '<main><Input><p v-record="label">{{ label }}</p></Input><Output /><Output v-if="extra" /></main>',
      }),
    )
    await nextTick()
    wrapper.vm.label = 'two'
    await nextTick()
    expect(updated).toEqual([{ value: 'two', oldValue: 'one' }])
    wrapper.vm.extra = true
    await nextTick()
    expect(mounted).toEqual([
      { value: 'one', oldValue: undefined },
      { value: 'two', oldValue: undefined },
    ])
  })

  it('keeps separate tunnels isolated even with an empty input', async () => {
    const a = tunnel()
    const b = tunnel()
    const wrapper = mount(() =>
      h('main', [
        h(a.In),
        h(a.In, null, () => 'alpha'),
        h(b.In, null, () => 'beta'),
        h('section', [h(a.Out)]),
        h('aside', [h(b.Out)]),
      ]),
    )
    await nextTick()
    expect(wrapper.find('section').text()).toBe('alpha')
    expect(wrapper.find('aside').text()).toBe('beta')
  })

  it('mounts children in the output injection context', async () => {
    const t = tunnel()
    const Child = defineComponent({
      setup: () => {
        const value = inject('location')
        return () => h('p', String(value))
      },
    })
    const Input = defineComponent({
      setup: () => {
        provide('location', 'input')
        return () => h(t.In, null, () => h(Child))
      },
    })
    const Output = defineComponent({
      setup: () => {
        provide('location', 'output')
        return () => h(t.Out)
      },
    })
    const wrapper = mount(() => [h(Input), h(Output)])
    await nextTick()
    expect(wrapper.text()).toBe('output')
  })

  it('removes and restores a cached input through KeepAlive', async () => {
    const t = tunnel()
    const active = ref(true)
    const Cached = defineComponent({ setup: () => () => h(t.In, null, () => h('p', 'cached')) })
    const wrapper = mount(() =>
      h('main', [h(KeepAlive, null, () => (active.value ? h(Cached) : null)), h(t.Out)]),
    )
    await nextTick()
    expect(wrapper.text()).toBe('cached')
    active.value = false
    await nextTick()
    expect(wrapper.text()).toBe('')
    active.value = true
    await nextTick()
    expect(wrapper.text()).toBe('cached')
  })

  it('tracks compiled slot expressions without out-of-render warnings', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const t = tunnel()
      const wrapper = mount(
        defineComponent({
          components: { Input: t.In, Output: t.Out },
          setup: () => ({ count: ref(0) }),
          template:
            '<main><button @click="count++">Add</button><Input><p>{{ count }}</p></Input><Output /></main>',
        }),
      )
      await nextTick()
      await wrapper.find('button').trigger('click')
      expect(wrapper.find('p').text()).toBe('1')
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('keeps SSR output empty across requests and hydrates on the client', async () => {
    const t = tunnel()
    const App = defineComponent({
      props: { text: String },
      setup: (props) => () => h('main', [h(t.In, null, () => h('p', props.text)), h(t.Out)]),
    })
    const first = await renderToString(createSSRApp(App, { text: 'private first' }))
    const second = await renderToString(createSSRApp(App, { text: 'private second' }))
    expect(first).not.toContain('private first')
    expect(second).not.toContain('private')
    const container = document.createElement('div')
    container.innerHTML = second
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = createSSRApp(App, { text: 'client' })
    try {
      client.mount(container)
      await nextTick()
      expect(container.textContent).toBe('client')
      expect(warn).not.toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
    } finally {
      client.unmount()
      warn.mockRestore()
      error.mockRestore()
    }
  })
})
