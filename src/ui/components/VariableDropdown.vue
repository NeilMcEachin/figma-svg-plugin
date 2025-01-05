<template>
  <StyledDropdown
    v-model="localModelValue"
    v-bind="$attrs"
    :options="filteredVariableOptions"
    valueProp="id"
    trackBy="name"
    label="name"
    searchable
    variant="outlined"
    :filterResults="false"
    @search-change="searchQuery = $event"
  />
</template>

<script setup>
import StyledDropdown from './StyledDropdown.vue'
import { ref, computed } from 'vue'
const localModelValue = defineModel()
const searchQuery = ref('')
const props = defineProps({
  variableOptions: {
    type: Array,
    default: () => [],
  },
})

const filteredVariableOptions = computed(() => {
  const queryParts = searchQuery.value.trim().split(/[ /-]+/)
  return props.variableOptions
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
</script>

<style lang="scss" scoped>
.g-dropdown{
    color: black;
}
</style>
