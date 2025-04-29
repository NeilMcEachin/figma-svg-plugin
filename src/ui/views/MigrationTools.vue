<template>
  <div class="tools">
    <div class="center">
      <div class="toolset">
        <div class="title">Tools for file you're exporting from</div>
        <GSwitch
          v-model="includeExportInstanceNodes"
          label="Include Instance Nodes"
        />
        <StyledButton
          label="Export Bound Nodes"
          @click="postMessage({ type: 'getNodesBoundToCollection', payload: { includeInstanceNodes: includeExportInstanceNodes } })"
        />
        <StyledButton
          label="Export Collection Variables"
          @click="postMessage({ type: 'exportCollectionVariables' })"
        />
      </div>
      <hr />
      <div class="toolset">
        <div class="title">Tools for file you're importing to</div>
        <input
          type="file"
          ref="importBoundNodesFileUpload"
          style="display: none"
          @change="importBoundNodes"
        />
        <StyledButton
          label="Import Bound Nodes"
          @click="$refs.importBoundNodesFileUpload.click()"
        />
        <input
          type="file"
          ref="importCollectionVariablesFileUpload"
          style="display: none"
          @change="importCollectionVariables"
        />
        <StyledButton
          label="Import Collection Variables"
          @click="$refs.importCollectionVariablesFileUpload.click()"
        />
      </div>
      <hr />
      <div class="toolset">
        <StyledButton
          label="Refresh Variables"
          @click="postMessage({ type: 'getCollectionVariables' })"
        />
        <StyledButton
          label="Get Variables to Remap"
          :loading="isLoading"
          @click="getVariablesToRemap"
        />
        <GSwitch v-model="includeImages" label="Include Images (Much slower)" />
        <GSwitch
          v-model="includeInstanceNodes"
          label="Include Instance Nodes (Much slower)"
        />

        <!-- Variable Groups -->
        <div
          v-for="variable in variablesToRemap"
          :key="variable.id"
          class="variable-group"
        >
          <div
            class="variable-header"
            @click="toggleVariableExpanded(variable.id)"
          >
            <StyledCheckbox
              hideLabel
              :checked="selectedNodes.length === variable.nodes.length"
              @change="
                ($event) =>
                  $event
                    ? (selectedNodes = [...variable.nodes])
                    : (selectedNodes = [])
              "
              @click.stop
            />
            <StyledButton
              class="focus-node-button"
              icon="g:eye"
              variant="text"
              @click.stop="focusNodes(variable.nodes)"
              />
            <div class="variable-name-container">
              <VariableAssigner
                :currentVariable="variable"
                :variableOptions="localVariables"
                :suggestion="variableRemaps[variable.name]"
                actionText="Change Selected To"
                :disabled="selectedNodes.length <= 0"
                @changeRequested="assignVariableToNode($event, selectedNodes)"
                @click.stop
                @keyup.stop
                @keydown.stop
                @keypress.stop
              >
                <template v-slot:name="{ name }">
                  {{ name }} ({{ selectedNodes.length }})
                </template>
              </VariableAssigner>
            </div>
            <StyledButton
              :icon="
                expandedVariables[variable.id]
                  ? 'g:chevron-up'
                  : 'g:chevron-down'
              "
              variant="text"
              @click.stop="toggleVariableExpanded(variable.id)"
            />
            ( {{ variable.nodes.length }} )
          </div>

          <div
            v-if="expandedVariables[variable.id]"
            class="nodes-table-wrapper"
          >
            <div v-for="node in variable.nodes" :key="node.id" class="node">
              <StyledCheckbox
                v-model="selectedNodes"
                :value="node"
                hideLabel
                @click.stop
              />
              <!-- {{ selectedNodes }} -->
              <StyledButton
                class="focus-node-button"
                icon="g:eye"
                variant="text"
                @click="focusNode(node.id)"
              />
              {{ getLastPartOfName(node.name) }}
              <div v-if="includeImages && node.imageData" class="preview">
                <img :src="`data:image/png;base64,${node.imageData}`" alt="" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <hr />
      <div class="toolset">
        <div class="flex">
          <VariableDropdown
            v-model="originalVariableId"
            :variableOptions="localVariables"
            placeholder="Original Variable"
          />
          <StyledButton
            label="Assign Alias From"
            style="flex-shrink: 0"
            :disabled="!originalVariableId || !aliasVariableId"
            @click="assignAlias"
          />
          <VariableDropdown
            v-model="aliasVariableId"
            :variableOptions="
              localVariables.filter((v) => v.id !== originalVariableId)
            "
            :disabled="!originalVariableId"
            placeholder="Select variable to alias from"
          />
        </div>
        <div class="flex">
          <VariableDropdown
            v-model="originalVariableId"
            :variableOptions="localVariables"
            placeholder="Original Variable"
          />
          <StyledButton
            label="Assign Raw From"
            style="flex-shrink: 0"
            :disabled="!originalVariableId || !rawReplacementVariableId"
            @click="assignRawValues"
          />
          <VariableDropdown
            v-model="rawReplacementVariableId"
            :variableOptions="
              localVariables.filter((v) => v.id !== originalVariableId)
            "
            :disabled="!originalVariableId"
            placeholder="Select variable with raw values you want"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { postMessage, copyToClipboard } from '../utils'
import { ref, computed, nextTick, reactive } from 'vue'
import StyledButton from '@/components/StyledButton.vue'
import StyledCheckbox from '@/components/StyledCheckbox.vue'
import VariableDropdown from '@/components/VariableDropdown.vue'
import { GSwitch } from '@twentyfourg/grimoire'
import VariableAssigner from '@/components/VariableAssigner.vue'
import variableRemaps from '@/data/variableRemaps'
import emitter from '../eventBus'
import { onMounted } from 'vue'

const importBoundNodesFileUpload = ref(null)
const importCollectionVariablesFileUpload = ref(null)
const variablesToRemap = ref([])
const localVariables = ref([])
const includeInstanceNodes = ref(false)
const includeImages = ref(false)
const isLoading = ref(false)
const aliasVariableId = ref(null)
const originalVariableId = ref(null)
const replacementVariableId = ref(null)
const rawReplacementVariableId = ref(null)
const selectedNodes = ref([])
const expandedVariables = reactive({})
const includeExportInstanceNodes = ref(false)
const props = defineProps({
  nestedCollectionId: String,
})

const getLastPartOfName = (name) => {
  const parts = name.split('/')
  return parts[parts.length - 1]
}

const toggleVariableExpanded = (variableId) => {
  expandedVariables[variableId] = !expandedVariables[variableId]
}

const assignVariableToNode = (newVariableId, nodes) => {
  if (nodes.length === 0) return
  console.log('assignVariableToNode', nodes)

  const data = {
    variableId: newVariableId,
    nodes,
  }
  postMessage({ type: 'assignVariableToNodes', payload: JSON.stringify(data) })

  // Create a Map of node IDs for faster lookup
  const nodeIdsToRemove = new Set(nodes.map((node) => node.id))

  // Filter approach instead of modifying while iterating
  variablesToRemap.value = variablesToRemap.value
    .map((variable) => {
      if (!variable.nodes) return variable

      // Filter out nodes that should be removed
      const filteredNodes = variable.nodes.filter(
        (vNode) => !nodeIdsToRemove.has(vNode.id)
      )

      return {
        ...variable,
        nodes: filteredNodes,
      }
    })
    .filter((variable) => !variable.nodes || variable.nodes.length > 0)

  selectedNodes.value = []
}

const importBoundNodes = () => {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        postMessage({ type: 'importBoundNodes', payload: e.target.result })
      } catch (error) {
        console.error('Error parsing JSON:', error)
      }
    }
    reader.readAsText(file)
  }
}

const importCollectionVariables = (event) => {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        postMessage({
          type: 'importCollectionVariables',
          payload: e.target.result,
        })
      } catch (error) {
        console.error('Error parsing JSON:', error)
      }
    }
    reader.readAsText(file)
  }
}

const focusNode = (nodeId) => {
  postMessage({ type: 'focusNode', payload: JSON.stringify({ nodeId }) })
}

const focusNodes = (nodes) => {
  // const nodeIds = nodes.map((node) => node.id)
  postMessage({ type: 'focusNodes', payload: JSON.stringify({ nodes }) })
}

const getVariablesToRemap = async () => {
  isLoading.value = true
  setTimeout(() => {
    postMessage({
      type: 'getVariablesToRemap',
      payload: {
        nestedCollectionId: props.nestedCollectionId,
        includeInstanceNodes: includeInstanceNodes.value,
        includeImages: includeImages.value,
      },
    })
  }, 200)
}

const assignAlias = () => {
  postMessage({
    type: 'assignAliasToVariable',
    payload: JSON.stringify({
      variableId: originalVariableId.value,
      aliasVariableId: aliasVariableId.value,
    }),
  })
  originalVariableId.value = null
  aliasVariableId.value = null
}

const assignRawValues = () => {
  postMessage({
    type: 'assignRawValuesToVariable',
    payload: JSON.stringify({
      variableId: originalVariableId.value,
      replacementVariableId: rawReplacementVariableId.value,
    }),
  })
  originalVariableId.value = null
  rawReplacementVariableId.value = null
}

emitter.on('msg', async (msg) => {
  if (msg.type === 'returnVariablesToRemap') {
    const parsedVariables = JSON.parse(msg.payload)
    variablesToRemap.value = parsedVariables

    // Initialize selection states
    parsedVariables.forEach((variable) => {
      // Initialize expanded state - first one expanded, others collapsed
      expandedVariables[variable.id] = variable === parsedVariables[0]
    })

    isLoading.value = false
  }
  if (msg.type === 'returnCollectionVariables') {
    localVariables.value = JSON.parse(msg.payload)
  }
})

onMounted(() => {
  // importBoundNodesFileUpload.addEventListener
})
</script>

<style lang="scss" scoped>
.tools {
  width: 100%;
  max-height: 100%;
  // display: flex;

  .toolset {
    padding: 30px;
  }
  .flex {
    display: flex;
    gap: 10px;
  }
}
.center {
  margin: auto;
}
.variable-swapper {
  width: 100%;
}

/* Variable group styles */
.variable-group {
  margin-bottom: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.variable-header {
  display: flex;
  align-items: center;
  padding: 15px;
  background-color: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  user-select: none;

  &:hover {
    background-color: rgba(255, 255, 255, 0.08);
  }

  .variable-name-container {
    flex-grow: 1;
  }
}

.focus-node-button.text {
  padding: 10px 20px;
}

.nodes-table-wrapper {
  transition: max-height 0.3s ease;
  counter-reset: node-counter;
}

.node {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:hover {
    background-color: rgba(255, 255, 255, 0.02);
  }

  &::before {
    counter-increment: node-counter;
    content: counter(node-counter) ". ";
    font-weight: bold;
    margin-right: 10px;
  }

  .preview {
    margin: 0 10px;

    img {
      max-width: 60px;
      max-height: 60px;
      object-fit: contain;
      border-radius: 4px;
    }
  }
}

.selection-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.select-all-controls {
  display: flex;
  align-items: center;
}

.selection-count {
  margin-left: 10px;
}

.bulk-action {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
