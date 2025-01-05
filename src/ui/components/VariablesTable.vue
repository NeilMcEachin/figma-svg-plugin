<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  nextTick,
  onBeforeMount,
  onBeforeUnmount,
  watch,
} from 'vue'
import { GCollapsible, GInput } from '@twentyfourg/grimoire'
import StyledButton from './StyledButton.vue'
import StyledInput from './StyledInput.vue'
import StyledModal from './StyledModal.vue'
import { postMessage } from '../utils'
import emitter from '../eventBus'
import VariableNavTree from './VariableNavTree.vue'
import VariableDropdown from './VariableDropdown.vue'
import { log } from 'scripts/utils'

interface VariableValue {
  r?: number
  g?: number
  b?: number
  [key: string]: any
}

interface Variable {
  id: string
  name: string
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING'
  valuesByMode: {
    [mode: string]: VariableValue | string | number
  }
}

interface TreeNode {
  name: string
  path: string
  variables: Variable[]
  children: { [key: string]: TreeNode }
}

interface Mode {
  name: string
  modeId: string
}

interface HistoryEntry {
  path: string
  variableId: string | null
  sourceVariableId: string | null
}

const props = defineProps({
  nestedCollectionId: {
    type: String,
    required: true,
  },
})

const variables = ref<Variable[]>([])
const modes = ref<Mode[]>([])
const searchQuery = ref('')
const selectedPath = ref('')
const pathHistory = ref<HistoryEntry[]>([])
const currentHistoryIndex = ref(-1)
const lastClickedVariableId = ref<string | null>(null)
const showModal = ref(false)
const modalType = ref<'alias' | 'raw' | null>(null)
const selectedVariable = ref<Variable | null>(null)
const selectedTargetVariableId = ref<string | null>(null)
const selectedVariableIds = ref<Set<string>>(new Set())

const filteredVariables = computed(() => {
  if (!searchQuery.value) return variables.value

  const query = searchQuery.value.toLowerCase()
  const terms = query.split(' ').filter(Boolean)

  return variables.value.filter((variable) => {
    const name = variable.name.toLowerCase()
    return terms.every((term) => name.includes(term))
  })
})

// Create a nested tree structure for the sidebar
const variableTree = computed(() => {
  const tree: TreeNode = {
    name: 'root',
    path: '',
    variables: [],
    children: {},
  }

  // Group variables by their parent paths
  const groupedVars: { [path: string]: Variable[] } = {}
  filteredVariables.value.forEach((variable) => {
    const parts = variable.name.split('/')
    const parentPath = parts.slice(0, -1).join('/')
    if (!groupedVars[parentPath]) {
      groupedVars[parentPath] = []
    }
    groupedVars[parentPath].push(variable)
  })

  // Build the tree structure
  Object.entries(groupedVars).forEach(([path, vars]) => {
    const parts = path.split('/')
    let currentNode = tree

    parts.forEach((part, index) => {
      const currentPath = parts.slice(0, index + 1).join('/')
      if (!currentNode.children[part]) {
        currentNode.children[part] = {
          name: part,
          path: currentPath,
          variables: groupedVars[currentPath] || [],
          children: {},
        }
      }
      currentNode = currentNode.children[part]
    })
  })

  return tree
})

const selectedVariables = computed(() => {
  // If no path is selected, group all variables by their parent paths
  if (!selectedPath.value) {
    const result: { [parentPath: string]: Variable[] } = {}

    filteredVariables.value.forEach((variable) => {
      const parts = variable.name.split('/')
      const parentPath = parts.slice(0, -1).join('/')
      if (!result[parentPath]) {
        result[parentPath] = []
      }
      result[parentPath].push(variable)
    })

    return result
  }

  // Otherwise, filter variables for the selected path
  const result: { [parentPath: string]: Variable[] } = {}

  filteredVariables.value.forEach((variable) => {
    const parts = variable.name.split('/')
    const parentPath = parts.slice(0, -1).join('/')

    if (
      parentPath === selectedPath.value ||
      parentPath.startsWith(selectedPath.value + '/')
    ) {
      if (!result[parentPath]) {
        result[parentPath] = []
      }
      result[parentPath].push(variable)
    }
  })

  return result
})

const getVariableIcon = (type: Variable['resolvedType']) => {
  switch (type) {
    case 'COLOR':
      return '🎨'
    case 'FLOAT':
      return '#'
    default:
      return '📝'
  }
}

const getVariableValue = (variable: Variable, modeId: string): string => {
  const value = variable.valuesByMode[modeId]

  if (value === null || value === undefined) return ''

  if (typeof value === 'object' && value !== null) {
    if ('type' in value && value.type === 'VARIABLE_ALIAS') {
      return value.id
    }
    if (
      'r' in value &&
      'g' in value &&
      'b' in value &&
      value.r != null &&
      value.g != null &&
      value.b != null
    ) {
      const r = Math.round(value.r * 255)
      const g = Math.round(value.g * 255)
      const b = Math.round(value.b * 255)

      if ('a' in value && value.a != null && value.a !== 1) {
        const alpha = (Math.round(value.a * 100) / 100).toFixed(2)
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
      }
      return `rgb(${r}, ${g}, ${b})`
    }
    return JSON.stringify(value)
  }

  return String(value)
}

const isVariableAlias = (variable: Variable, modeId: string): boolean => {
  const value = variable.valuesByMode[modeId]
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'VARIABLE_ALIAS'
  )
}

const scrollAndHighlightVariable = (variableId: string) => {
  nextTick(() => {
    const row = document.querySelector(`[data-variable-id="${variableId}"]`)
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' })
      row.classList.add('highlight')
      setTimeout(() => row.classList.remove('highlight'), 2000)
    }
  })
}

const navigateToPath = (
  path: string,
  options?: {
    addToHistory?: boolean
    historyEntry?: HistoryEntry
    highlightVariableId?: string
  }
) => {
  const {
    addToHistory = false,
    historyEntry,
    highlightVariableId,
  } = options || {}

  if (path !== selectedPath.value || highlightVariableId) {
    if (addToHistory) {
      // If we're not at the end of the history, truncate the forward history
      if (currentHistoryIndex.value < pathHistory.value.length - 1) {
        pathHistory.value = pathHistory.value.slice(
          0,
          currentHistoryIndex.value + 1
        )
      }

      pathHistory.value.push(
        historyEntry || {
          path,
          variableId: null,
          sourceVariableId: null,
        }
      )
      currentHistoryIndex.value++
    }

    selectedPath.value = path

    if (highlightVariableId) {
      scrollAndHighlightVariable(highlightVariableId)
    }
  }
}

const handleAliasClick = (aliasId: string, sourceVariableId: string) => {
  const targetVariable = variables.value.find((v) => v.id === aliasId)
  if (!targetVariable) return

  const parts = targetVariable.name.split('/')
  const parentPath = parts.slice(0, -1).join('/')

  // Clear search before navigating
  searchQuery.value = ''

  // Always store the current path and source variable before navigating
  const currentEntry = pathHistory.value[currentHistoryIndex.value]
  if (currentEntry && !currentEntry.sourceVariableId) {
    currentEntry.sourceVariableId = sourceVariableId
  }

  navigateToPath(parentPath, {
    addToHistory: true,
    historyEntry: {
      path: parentPath,
      variableId: targetVariable.id,
      sourceVariableId: sourceVariableId,
    },
    highlightVariableId: targetVariable.id,
  })
}

const navigateHistory = (direction: 'back' | 'forward') => {
  const newIndex =
    direction === 'back'
      ? currentHistoryIndex.value - 1
      : currentHistoryIndex.value + 1

  if (newIndex >= 0 && newIndex < pathHistory.value.length) {
    const historyEntry = pathHistory.value[newIndex]
    const previousEntry = pathHistory.value[currentHistoryIndex.value]
    currentHistoryIndex.value = newIndex

    // When going back, use the source from the previous entry if available
    const highlightId =
      direction === 'back'
        ? previousEntry.sourceVariableId || historyEntry.sourceVariableId
        : historyEntry.variableId

    navigateToPath(historyEntry.path, {
      highlightVariableId: highlightId || undefined,
    })
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  // Only handle if not in an input
  if (e.target instanceof HTMLInputElement) return

  // Only handle arrow keys for navigation, let everything else pass through
  e.preventDefault()
  if (e.key === 'ArrowLeft' && canGoBack.value) {
    navigateHistory('back')
  } else if (e.key === 'ArrowRight' && canGoForward.value) {
    e.preventDefault()
    navigateHistory('forward')
  }
}

const refreshVariables = () => {
  postMessage({
    type: 'getCollectionVariables',
  })
  postMessage({
    type: 'getCollectionModes',
    payload: { collectionId: props.nestedCollectionId },
  })
}

emitter.on('msg', (async (msg: { type: string; payload: string }) => {
  if (msg.type === 'returnCollectionVariables') {
    variables.value = JSON.parse(msg.payload)
  }
  if (msg.type === 'returnCollectionModes') {
    modes.value = JSON.parse(msg.payload)
  }
}) as any)

const canGoBack = computed(() => currentHistoryIndex.value > 0)
const canGoForward = computed(
  () => currentHistoryIndex.value < pathHistory.value.length - 1
)

const handlePathSelect = (path: string) => {
  // When manually selecting a path, preserve the current source variable ID
  const currentEntry = pathHistory.value[currentHistoryIndex.value]
  const sourceVariableId = currentEntry?.sourceVariableId || null

  navigateToPath(path, {
    addToHistory: true,
    historyEntry: {
      path,
      variableId: null,
      sourceVariableId,
    },
  })
}

const handleAllVariablesClick = () => {
  // Similarly preserve source variable ID when clicking "All Variables"
  const currentEntry = pathHistory.value[currentHistoryIndex.value]
  const sourceVariableId = currentEntry?.sourceVariableId || null

  navigateToPath('', {
    addToHistory: true,
    historyEntry: {
      path: '',
      variableId: null,
      sourceVariableId,
    },
  })
}

const handleVariableAction = (action: string, variable: Variable) => {
  if (selectedVariableIds.value.size > 0) {
    // If we have selections, use those instead of the clicked variable
    selectedVariable.value = null // We'll handle multiple variables in handleModalConfirm
  } else {
    // Single variable case
    selectedVariable.value = variable
  }
  selectedTargetVariableId.value = null

  switch (action) {
    case 'createAlias':
      modalType.value = 'alias'
      showModal.value = true
      break
    case 'assignRawValues':
      modalType.value = 'raw'
      showModal.value = true
      break
  }
}

const handleModalConfirm = () => {
  if (!selectedTargetVariableId.value) return

  // Get all visible variables from the current view
  const visibleVariables = Object.values(selectedVariables.value).flat()

  const variablesToProcess = selectedVariable.value
    ? [selectedVariable.value] // Single variable case
    : visibleVariables.filter((v) => selectedVariableIds.value.has(v.id)) // Multi-select case

  if (modalType.value === 'alias') {
    postMessage({
      type: 'assignAliasToVariable',
      payload: JSON.stringify({
        variableIds: variablesToProcess.map((v) => v.id),
        aliasVariableId: selectedTargetVariableId.value,
      }),
    })
  } else if (modalType.value === 'raw') {
    postMessage({
      type: 'assignRawValuesToVariable',
      payload: JSON.stringify({
        variableIds: variablesToProcess.map((v) => v.id),
        replacementVariableId: selectedTargetVariableId.value,
      }),
    })
  }

  showModal.value = false
  modalType.value = null
  selectedVariable.value = null
  selectedTargetVariableId.value = null
  selectedVariableIds.value.clear() // Clear selections after processing

  // Refresh variables after action
  setTimeout(() => {
    refreshVariables()
  }, 100)
}

const clearSelectedVariables = () => {
  selectedVariableIds.value.clear()
}

// Update toggle selection handler to require Ctrl click for multiple selections
const toggleVariableSelection = (variableId: string, event: MouseEvent) => {
  // If not holding Ctrl/Cmd, clear other selections and select only this one
  if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
    selectedVariableIds.value.clear()
    selectedVariableIds.value.add(variableId)
    return
  }

  // Multi-select with Ctrl/Cmd
  if (event.shiftKey && selectedVariableIds.value.size > 0) {
    // Shift+click for range selection
    const variables = filteredVariables.value
    const lastSelectedIndex = variables.findIndex(
      (v) => v.id === Array.from(selectedVariableIds.value).pop()
    )
    const currentIndex = variables.findIndex((v) => v.id === variableId)
    const [start, end] = [lastSelectedIndex, currentIndex].sort((a, b) => a - b)

    for (let i = start; i <= end; i++) {
      selectedVariableIds.value.add(variables[i].id)
    }
  } else {
    // Toggle single selection with Ctrl/Cmd
    if (selectedVariableIds.value.has(variableId)) {
      selectedVariableIds.value.delete(variableId)
    } else {
      selectedVariableIds.value.add(variableId)
    }
  }
}

const targetDropdownRef = ref<{ $el: HTMLElement } | null>(null)
watch(showModal, async (newValue) => {
  if (newValue) {
    await nextTick()
    targetDropdownRef.value?.$el.querySelector('input')?.focus()
  }
})

// Add event listener for keyboard navigation
onMounted(() => {
  refreshVariables()
  window.addEventListener('keydown', handleKeyDown)
})

onBeforeMount(() => {
  // Initialize with current path instead of empty string
  pathHistory.value = [
    {
      path: selectedPath.value,
      variableId: null,
      sourceVariableId: null,
    },
  ]
  currentHistoryIndex.value = 0
})

// Clean up event listener
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

// Compute the deepest common parent path for a set of paths
const findDeepestCommonParent = (paths: string[]) => {
  if (paths.length === 0) return ''
  if (paths.length === 1) return paths[0]

  const pathParts = paths.map((p) => p.split('/'))
  const minLength = Math.min(...pathParts.map((p) => p.length))
  let commonParts = []

  for (let i = 0; i < minLength; i++) {
    const part = pathParts[0][i]
    if (pathParts.every((p) => p[i] === part)) {
      commonParts.push(part)
    } else {
      break
    }
  }

  return commonParts.join('/')
}

// Watch filtered variables and selected path to handle empty results and auto-focus
watch([filteredVariables, searchQuery], () => {
  if (!searchQuery.value) return

  // Get paths from filtered variables directly rather than selectedVariables
  const paths = filteredVariables.value.map((v) => {
    const parts = v.name.split('/')
    return parts.slice(0, -1).join('/')
  })

  // Get unique paths
  const uniquePaths = [...new Set(paths)]

  if (uniquePaths.length === 0) {
    navigateToPath('', {
      addToHistory: true,
      historyEntry: {
        path: '',
        variableId: null,
        sourceVariableId: null,
      },
    })
    return
  }

  // Always find and navigate to the deepest common parent

  const commonParent = findDeepestCommonParent(paths)
  if (commonParent !== selectedPath.value) {
    navigateToPath(commonParent, {
      addToHistory: true,
      historyEntry: {
        path: commonParent,
        variableId: null,
        sourceVariableId: null,
      },
    })
  }
})

const currentOpenPath = computed(() => {
  if (!searchQuery.value) return selectedPath.value
  return findDeepestCommonParent(Object.keys(selectedVariables.value))
})
</script>

<template>
  <div class="variables-table">
    <div class="sidebar">
      <div class="search-container">
        <StyledInput
          v-model="searchQuery"
          placeholder="Search variables..."
          class="search-input"
        />
      </div>
      <div class="nav-controls">
        <button
          class="nav-button"
          :disabled="!canGoBack"
          @click="navigateHistory('back')"
        >
          ←
        </button>
        <button
          class="nav-button"
          :disabled="!canGoForward"
          @click="navigateHistory('forward')"
        >
          →
        </button>
        <button
          class="nav-button refresh-button"
          title="Refresh Variables"
          @click="refreshVariables"
        >
          ⟳
        </button>
      </div>
      <div class="nav-tree">
        <div
          class="nav-item all-variables"
          :class="{ active: selectedPath === '' }"
          @click="handleAllVariablesClick"
        >
          All Variables
        </div>
        <template v-for="(node, key) in variableTree.children" :key="key">
          <VariableNavTree
            :node="node"
            @select="handlePathSelect"
            :selectedPath="selectedPath"
            :openUpToPath="currentOpenPath"
          />
        </template>
      </div>
    </div>

    <div class="main-content" @click="clearSelectedVariables">
      <template v-if="Object.keys(selectedVariables).length">
        <div
          v-for="(groupVariables, path) in selectedVariables"
          :key="path"
          class="variable-group"
        >
          <table>
            <thead>
              <tr>
                <th class="group-header" colspan="100%">
                  {{ path }}
                </th>
              </tr>
              <tr>
                <th class="name-column">Name</th>
                <th
                  v-for="mode in modes"
                  :key="mode.modeId"
                  class="mode-column"
                >
                  {{ mode.name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="variable in (groupVariables as Variable[])"
                :key="variable.id"
                :data-variable-id="variable.id"
                class="variable-row"
                :class="{ selected: selectedVariableIds.has(variable.id), 'disable-text-selection': selectedVariableIds.size > 1 }"
                @click.stop="toggleVariableSelection(variable.id, $event)"
              >
                <td class="name-cell">
                  <div class="name-content">
                    <span class="variable-icon">{{
                      getVariableIcon(variable.resolvedType)
                    }}</span>
                    <span class="variable-name">{{
                      variable.name.split('/').pop()
                    }}</span>
                    <div class="actions">
                      <button
                        class="action-button"
                        title="Create alias"
                        @click.stop="
                          handleVariableAction('createAlias', variable)
                        "
                      >
                        <span class="icon">⇢</span>
                      </button>
                      <button
                        class="action-button"
                        title="Copy raw values"
                        @click.stop="
                          handleVariableAction('assignRawValues', variable)
                        "
                      >
                        <span class="icon">⎘</span>
                      </button>
                    </div>
                  </div>
                </td>
                <td v-for="mode in modes" :key="mode.modeId" class="value-cell">
                  <div class="value-container">
                    <div
                      class="value-preview"
                      :class="{
                        'is-alias': isVariableAlias(variable, mode.modeId),
                      }"
                      :style="{
                        backgroundColor:
                          variable.resolvedType === 'COLOR' &&
                          !isVariableAlias(variable, mode.modeId)
                            ? getVariableValue(variable, mode.modeId)
                            : undefined,
                      }"
                      @click="
                        isVariableAlias(variable, mode.modeId)
                          ? handleAliasClick(
                              getVariableValue(variable, mode.modeId),
                              variable.id
                            )
                          : null
                      "
                    >
                      <span
                        v-if="
                          !isVariableAlias(variable, mode.modeId) &&
                          variable.resolvedType !== 'COLOR'
                        "
                      >
                        {{ getVariableValue(variable, mode.modeId) }}
                      </span>
                      <span
                        v-if="isVariableAlias(variable, mode.modeId)"
                        class="alias-indicator"
                        >↗️</span
                      >
                    </div>
                    <span
                      v-if="
                        variable.resolvedType === 'COLOR' &&
                        !isVariableAlias(variable, mode.modeId)
                      "
                      class="color-value"
                    >
                      {{ getVariableValue(variable, mode.modeId) }}
                    </span>
                    <span
                      v-if="isVariableAlias(variable, mode.modeId)"
                      class="alias-value"
                      @click="
                        handleAliasClick(
                          getVariableValue(variable, mode.modeId),
                          variable.id
                        )
                      "
                    >
                      {{
                        variables.find(
                          (v) =>
                            v.id === getVariableValue(variable, mode.modeId)
                        )?.name || getVariableValue(variable, mode.modeId)
                      }}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <div v-else class="empty-state">
        Select a variable group from the sidebar to view variables
      </div>
    </div>

    <!-- Variable Action Modal -->
    <StyledModal
      v-model:show="showModal"
      overflowScroll="overlay"
      @close="showModal = false"
      @confirm="handleModalConfirm"
      :disabled="!selectedTargetVariableId"
    >
      <template #title>
        {{
          modalType === 'alias' ? 'Create Alias From' : 'Copy Raw Values From'
        }}
      </template>

      <div class="source-variable">
        <strong
          >Source Variable{{ selectedVariableIds.size > 0 ? 's' : '' }}:</strong
        >
        <template v-if="selectedVariable">
          <div class="selected-variable">
            {{ selectedVariable.name }}
          </div>
        </template>
        <template v-else-if="selectedVariableIds.size > 0">
          <div class="selected-variables">
            <div
              v-for="id in selectedVariableIds"
              :key="id"
              class="selected-variable"
            >
              {{ variables.find((v) => v.id === id)?.name }}
              <StyledButton
                label="x"
                variant="text"
                @click="selectedVariableIds.delete(id)"
              />
            </div>
          </div>
        </template>
      </div>
      <div class="target-selection">
        <strong>Select Target Variable:</strong>
        <VariableDropdown
          class="target-dropdown"
          v-model="selectedTargetVariableId"
          :variableOptions="
            variables.filter((v) => !selectedVariableIds.has(v.id))
          "
          :placeholder="
            modalType === 'alias'
              ? 'Select variable to alias from'
              : 'Select variable with raw values you want'
          "
          @refMounted="targetDropdownRef = $event"
        />
      </div>
    </StyledModal>
  </div>
</template>

<style lang="scss" scoped>
.variables-table {
  display: flex;
  color: var(--body-fg);

  .sidebar {
    width: 300px;

    border-right: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    background: var(--body-bg);

    .search-container {
      flex-shrink: 0;
      padding: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: var(--body-bg);
    }

    .nav-controls {
      display: flex;
      gap: 4px;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: var(--body-bg);

      .nav-button {
        flex: 1;
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        color: var(--body-fg);
        cursor: pointer;
        transition: all 0.2s;

        &:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        &.refresh-button {
          font-size: 16px;
          line-height: 1;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }
    }

    .nav-tree {
      flex: 1;
      overflow-y: auto;
      padding: 8px;

      .all-variables {
        margin-bottom: 16px;
        font-weight: 500;
        padding: 6px 8px;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
        font-size: 13px;

        &:hover:not(.active) {
          background: rgba(255, 255, 255, 0.1);
        }

        &.active {
          background: rgba(255, 255, 255, 0.15);
        }
      }
    }
  }

  .main-content {
    flex: 1;
    padding: 16px;
    min-width: 0;

    .variable-group {
      margin-bottom: 32px;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      opacity: 0.5;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid rgb(89, 89, 89);

      .group-header {
        position: sticky;
        top: -17px;
        z-index: 1;
        background-color: var(--body-bg);
      }

      th,
      td {
        padding: 8px;
        text-align: left;
        border-right: 1px solid rgb(89, 89, 89);
        height: 40px; // Fixed height for all cells

        &:last-child {
          border-right: none;
        }
      }
      th,
      tr {
        border-bottom: 1px solid rgb(89, 89, 89);
      }

      th {
        background: var(--body-bg);
        top: 0;
        z-index: 1;

        &.group-header {
          font-size: 1.1em;
          padding: 16px 8px;
          background: rgb(52, 52, 52);
        }
      }

      .name-column {
        width: 250px;
      }

      .mode-column {
        min-width: 120px;
      }

      .variable-row {
        &:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .name-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 100%;

          .variable-icon {
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .variable-name {
            font-family: monospace;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }

        .value-cell {
          height: 100%;
          padding: 4px 8px;

          .value-container {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .value-preview {
            height: 20px;
            width: 20px;
            flex-shrink: 0;
            padding: 2px;
            border-radius: 4px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-family: monospace;

            &.is-alias {
              cursor: pointer;
              background: rgba(255, 255, 255, 0.1);

              &:hover {
                background: rgba(255, 255, 255, 0.2);
              }
            }

            span {
              word-break: break-all;
            }

            .alias-indicator {
              opacity: 0.8;
            }
          }

          .alias-value {
            font-size: 12px;
            font-family: monospace;
            opacity: 0.8;
            cursor: pointer;
            text-decoration: underline;
            text-decoration-style: dotted;

            &:hover {
              opacity: 1;
            }
          }

          .color-value {
            font-size: 12px;
            font-family: monospace;
            opacity: 0.8;
          }
        }

        &.highlight {
          animation: highlight 2s ease-out;
        }

        &.disable-text-selection {
          user-select: none;
        }

        &.selected {
          background: rgba(0, 102, 255, 0.2);

          &:hover {
            background: rgba(0, 102, 255, 0.25);
          }
        }
      }

      @keyframes highlight {
        0% {
          background: rgba(255, 255, 255, 0.2);
        }
        100% {
          background: transparent;
        }
      }
    }
  }
}

.name-content {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;

  .actions {
    margin-left: auto;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .action-button {
    background: none;
    border: none;
    padding: 4px 8px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 16px;
    line-height: 1;
    color: var(--body-fg);
    opacity: 0.8;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      opacity: 1;
    }

    .icon {
      display: inline-block;
    }
  }
}

.variable-row:hover {
  .actions {
    opacity: 1;
  }
}

.selected-variables {
  margin-top: 8px;
  max-height: 200px;
  overflow-y: auto;
}
.g-modal {
  :deep(.content) {
    width: 450px;
    text-align: left;

    .content-body {
      align-items: flex-start;
    }
  }
}
.selected-variable {
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: monospace;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  margin-bottom: 4px;

  &:last-child {
    margin-bottom: 0;
  }
  .remove-button {
    margin-left: 10px;
  }
}

.source-variable {
  margin-bottom: 16px;
  width: 100%;
}

.target-selection {
  margin-top: 16px;
  width: 100%;

  .target-dropdown {
    margin-top: 16px;
    width: 100%;
  }
}
</style>
