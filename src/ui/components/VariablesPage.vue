<template>
  <div>
    <StyledButton label="Get Variables" @click="getVariables" />
    <hr />
    <StyledInput
      v-model="searchQuery"
      placeholder="Search"
      variant="outlined"
    />
    <div class="row" v-for="variable in filteredVariables">
      {{ variable.name }}:
      <StyledButton label="Copy" @click="copyToClipboard(variable.name)" />
    </div>
  </div>
</template>

<script setup>
import { postMessage, copyToClipboard } from '../utils'
import { ref, computed } from 'vue'
import StyledButton from '@/components/StyledButton.vue'
import StyledInput from '@/components/StyledInput.vue'
import emitter from '../eventBus'

const props = defineProps({
  nestedCollectionId: {
    type: String,
    required: false,
    default: null,
  },
})
const localVariables = ref([])

const getVariables = () => {
  postMessage({
    type: 'getCollectionVariables',
    payload: props.nestedCollectionId,
  })
}

const searchQuery = ref('')
const filteredVariables = computed(() => {
  const queryParts = searchQuery.value.trim().split(/[ /-]+/)
  return localVariables.value
    .filter((option) => {
      return queryParts.every((part) =>
        option.name.toLowerCase().includes(part.toLowerCase())
      )
    })
    .sort((a, b) => {
      if (a.name === searchQuery.value.trim()) return -1
      else if (b.name === searchQuery.value.trim()) return -1
      if (a.name.includes(searchQuery.value.trim())) return -1
      else if (b.name.includes(searchQuery.value.trim())) return -1
      return 0
    })
})

emitter.on('msg', async (msg) => {
  if (msg.type === 'returnCollectionVariables') {
    localVariables.value = JSON.parse(msg.payload)
  }
})
</script>

<style lang="scss" scoped></style>
