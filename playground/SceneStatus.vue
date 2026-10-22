<script setup lang="ts">
import type { Tunnel } from 'tunnel-rat-vue'
import { useLoop, useTres } from '@tresjs/core'
import { Mesh, MeshStandardMaterial } from 'three'
import { shallowRef } from 'vue'

defineProps<{ html: Tunnel; paused: boolean }>()
const emit = defineEmits<{ togglePause: [] }>()
const { scene } = useTres()
const { onBeforeRender } = useLoop()
interface SceneMesh {
  id: string
  label: string
}
const meshes = shallowRef<SceneMesh[]>([])

onBeforeRender(() => {
  const current: SceneMesh[] = []
  scene.value.traverse((object) => {
    if (object instanceof Mesh && object.material instanceof MeshStandardMaterial)
      current.push({
        id: object.uuid,
        label: `${object.name} #${object.material.color.getHexString()}`,
      })
  })
  current.sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
  if (JSON.stringify(current) !== JSON.stringify(meshes.value)) meshes.value = current
})
</script>

<template>
  <html.In>
    <div class="scene-status" role="status" aria-live="polite">
      <strong>{{ meshes.length }} meshes connected</strong>
      <button type="button" @click="emit('togglePause')">
        {{ paused ? 'Resume rotation' : 'Pause rotation' }}
      </button>
      <ul aria-label="Connected meshes">
        <li v-for="mesh in meshes" :key="mesh.id">
          {{ mesh.label }}
        </li>
      </ul>
    </div>
  </html.In>
</template>
