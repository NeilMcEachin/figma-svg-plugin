<template>
  <div class="variable-swapper">
    <div class="pill" @click="copyToClipboard(currentVariable?.name)">
      <slot name="name" v-bind="{name: currentVariable?.name}" >
        {{ currentVariable?.name }}
      </slot>
    </div>
    <StyledButton
      :label="actionText"
      @click="$emit('changeRequested', replacementVariableId)"
      :disabled="!replacementVariableId || disabled"
    />
    <StyledDropdown
      v-model="replacementVariableId"
      :options="filteredVariableOptions"
      valueProp="id"
      trackBy="name"
      label="name"
      placeholder="Select a variable to change with"
      searchable
      variant="outlined"
      :filterResults="false"
      @search-change="searchFilter"
    />
  </div>
</template>

<script setup>
import { copyToClipboard } from '../utils'
import StyledButton from '@/components/StyledButton.vue'
import StyledDropdown from '@/components/StyledDropdown.vue'
import { ref, watch, computed } from 'vue'
const props = defineProps({
  currentVariable: Object,
  variableOptions: {
    type: Array,
    default: () => [],
  },
  suggestion: String,
  actionText: {
    type: String,
    default: 'Change To',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})
defineEmits(['changeRequested'])
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
  () => props.suggestion,
  (suggestion) => {
    const foundVariable = props.variableOptions.find(
      (variable) => variable.name === suggestion
    )
    if (foundVariable) {
      replacementVariableId.value = foundVariable.id
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

  @media (max-width: 600px) {
    flex-direction: column;

  }

  .pill {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    color: #fff;
    background-color: #383838;
    border-radius: 4px;
    box-sizing: border-box;
    border: 1px solid #444;
    padding: 0 5px;
    font-size: 11px;
    height: 30px;
    width: 200px;
    @media (max-width: 600px) {
      width: 100%;
    }
  }

  .styled-button {
    padding: 5px;
    flex-shrink: 0;
    height: auto;
    font-size: 11px;
    height: 30px;
    border-radius: 4px;
    @media (max-width: 600px) {
      width: 100%;
    }
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
    @media (max-width: 600px) {
      width: 100%;
    }
  }
}
</style>
