<template>
  <div>
    <StyledDropdown
      v-model="selectedCollection"
      :options="collections"
      placeholder="Select Collection"
      valueProp="id"
      trackBy="name"
      label="name"
      @select="postMessage({ type: 'getCollectionModes', payload: { collectionId: selectedCollection } })"
    />
    <StyledDropdown
      v-model="selectedMode"
      :options="modes"
      placeholder="Select Mode"
      valueProp="modeId"
      trackBy="name"
      label="name"
    />
    <StyledButton label="Export Mode" @click="postMessage({ type: 'exportCollectionModeVariables', payload: { collectionId: selectedCollection, modeId: selectedMode } })" :disabled="!selectedMode"/>
    <StyledButton label="Overwrite Mode" @click="overwriteMode" :disabled="!selectedMode"/>
  </div>
</template>

<script setup>
import { postMessage, copyToClipboard } from '../utils'
import { ref, computed, nextTick, reactive } from 'vue'
import StyledButton from '@/components/StyledButton.vue'
import StyledDropdown from '@/components/StyledDropdown.vue'
import emitter from '../eventBus'
import { onMounted } from 'vue'

const selectedCollection = ref(null)
const collections = ref([])
const selectedMode = ref(null)
const modes = ref([])

const exportMode = () => {
  console.log('exportMode')
}

const overwriteMode = () => {
  console.log('overwriteMode')
}

emitter.on('msg', async (msg) => {
  if (msg.type === 'returnCollections') {
    collections.value = JSON.parse(msg.payload)
  }
  if (msg.type === 'returnCollectionModes') {
    modes.value = JSON.parse(msg.payload)
  }
})
</script>

<style lang="scss" scoped></style>
