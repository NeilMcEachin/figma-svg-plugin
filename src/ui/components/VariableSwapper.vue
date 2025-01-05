<template>
  <div class="label">{{ type }}:</div>
  <!-- <div v-for="pn in prediction.map((p) => p.name)">{{ pn }}</div> -->
  <!-- {{ prediction.map.join(', ') }} -->
  <div class="variable-swapper">
    <div class="pill">{{ currentVariable?.name }}</div>
    <StyledButton
      label="Swap With"
      @click="$emit('swapRequested', replacementVariableId)"
      :disabled="!replacementVariableId"
    />
    <StyledDropdown
      v-model="replacementVariableId"
      :options="filteredVariableOptions"
      valueProp="id"
      trackBy="name"
      label="name"
      placeholder="Select a variable to swap with"
      searchable
      variant="outlined"
      :filterResults="false"
      @search-change="searchFilter"
    />
  </div>
</template>

<script setup>
import StyledButton from '@/components/StyledButton.vue'
import StyledDropdown from '@/components/StyledDropdown.vue'
import { ref, watch, computed } from 'vue'
const props = defineProps({
  type: {
    type: String,
    default: 'fill',
  },
  currentVariable: Object,
  variableOptions: Array,
  prediction: Object,
})
defineEmits(['swapRequested'])
const replacementVariableId = ref(null)
const searchQuery = ref('')

const searchFilter = (query, select$) => {
  searchQuery.value = query
}

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

watch(
  () => props.prediction,
  (prediction) => {
    if (prediction && prediction.length) {
      // console.log(prediction);

      replacementVariableId.value = prediction[0].variable.id
    }
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.label {
  margin-bottom: 5px;
}
.variable-swapper {
  display: flex;
  align-items: center;
  gap: 5px;

  .pill {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    color: #fff;
    background-color: #383838;
    border-radius: 4px;
    border: 1px solid #444;
    padding: 0 5px;
    font-size: 11px;
    height: 30px;
    width: 200px;
  }

  .styled-button {
    padding: 5px;
    flex-shrink: 0;
    height: auto;
    font-size: 11px;
    height: 30px;
    border-radius: 4px;
  }
  .styled-dropdown {
    --ms-font-size: 11px;
    --dropdown-bg: #383838;
    --dropdown-placeholder-fg: #fff;
    --dropdown-border-fg: #444;
    --dropdown-fg: #fff;
    --dropdown-option-fg: #000;
    --dropdown-radius: 4px;
    min-height: auto;
    height: 30px;
  }
}
</style>
