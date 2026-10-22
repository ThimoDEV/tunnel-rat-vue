<script setup lang="ts">
import type { Mesh } from 'three'
import { useLoop } from '@tresjs/core'
import { shallowRef } from 'vue'

const props = defineProps<{ color: string; paused: boolean }>()
const mesh = shallowRef<Mesh>()

// This succeeds because the component is mounted below scene.Out in TresCanvas.
const { onBeforeRender } = useLoop()
onBeforeRender(({ delta }) => {
  if (mesh.value && !props.paused) {
    mesh.value.rotation.y += delta * 0.35
    mesh.value.rotation.z += delta * 0.12
  }
})
</script>

<template>
  <TresMesh ref="mesh" name="torus" :position="[-1.35, 0, 0]" :rotation="[0.35, 0.4, 0]">
    <TresTorusGeometry :args="[0.85, 0.28, 32, 64]" />
    <TresMeshStandardMaterial :color="color" :roughness="0.3" :metalness="0.15" />
  </TresMesh>
</template>
