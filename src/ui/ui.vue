<script lang="ts" setup>
import { onMounted, ref, watch, computed } from 'vue'
import { postMessage, copyToClipboard, saveFile } from './utils'
import emitter from './eventBus'
import StyledButton from '@/components/StyledButton.vue'
import VariableSwapper from './components/VariableSwapper.vue'
import ResizableContainer from './components/ResizableContainer.vue'
import BoundNodeSearch from './components/BoundNodeSearch.vue'

import {
  GCollapsible,
  GProgressBar,
  GInput,
  GCheckbox,
  GSwitch,
} from '@twentyfourg/grimoire'
import VariablesPage from '@/components/VariablesPage.vue'
import MigrationTools from './views/MigrationTools.vue'
import VariablesTable from './components/VariablesTable.vue'

// import relations from './correctResponses'
// import { copy } from 'fs-extra'
// const chunkArray = (array, chunkSize) => {
//   const result = []
//   for (let i = 0; i < array.length; i += chunkSize) {
//     result.push(array.slice(i, i + chunkSize))
//   }
//   return result
// }

// const chunkedCorrectResponses = chunkArray(correctResponses, 100);
// console.log(chunkedCorrectResponses.length);

const collections = ref([])
const currentCollection = ref(null)
const selectedNode = ref(null)
const variableReceivingValue = ref(null)
const frames = ref([])
const unusedVariables = ref([])
const focusNodeId = ref('')
const boundNodes = ref([])
const activePage = ref(4)
const localVariables = ref([])
const colorNodes = ref([])
const colorNodeSuggestions = ref([])
const includeInstanceNodes = ref(false)

const localVariableNames = computed(() => {
  const varNames = localVariables.value.map((variable) => variable.name)
  // console.log(varNames);
  return varNames
})

const nestedCollectionId = computed(() => {
  return collections.value.find(
    (collection) => collection.name === 'Nested Collection'
  )?.id
})

const mappedFrames = computed(() => {
  const mapped = Object.values(frames.value)
  return mapped
    .sort((a, b) => b.progress - a.progress)
    .filter((frame) => !frame.name.startsWith('ignore--'))
})

const numNodesToChange = computed(() => {
  let count = 0
  mappedFrames.value.forEach((frame) => {
    count += frame.nodesToChange.length
  })
  return count
})

const totalNodes = computed(() => {
  let count = 0
  Object.values(frames.value).forEach((frame) => {
    count += frame.totalNodes
  })
  return count
})

const focusNode = (nodeId) => {
  postMessage({ type: 'focusNode', payload: JSON.stringify({ nodeId }) })
}

const exportVariablestoSCSS = () => {
  postMessage({
    type: 'exportVariablestoSCSS',
    payload: JSON.stringify({ collectionId: nestedCollectionId.value }),
  })
}

const boundNodeGroups = computed(() => {
  return [];
  const groups = {}
  boundNodes.value.forEach((node) => {
    if (!groups[node.variable.name]) {
      groups[node.variable.name] = []
    }
    groups[node.variable.name].push(node)
  })
  return groups
})
watch(nestedCollectionId, () => {
  // console.log(nestedCollectionId.value)

  getCollectionVariables()
})

const getCollectionVariables = () => {
  postMessage({
    type: 'getCollectionVariables',
    collectionId: nestedCollectionId.value,
  })
}

const createNestedCollection = () => {
  postMessage({ type: 'createNestedCollection' })
}
const deleteNestedCollection = () => {
  postMessage({
    type: 'deleteNestedCollection',
    payload: nestedCollectionId.value,
  })
}
const createVariableSet = () => {
  postMessage({ type: 'createVariableSet', payload: nestedCollectionId.value })
}
const migrateNodeVariables = () => {
  postMessage({
    type: 'migrateNodeVariables',
    payload: nestedCollectionId.value,
  })
}

const swapVariable = (attributeName, node, replacementVariableId) => {
  // console.log(attributeName, node, replacementVariableId)

  postMessage({
    type: 'swapVariable',
    payload: JSON.stringify({
      attributeName,
      nodeId: node.id,
      replacementVariableId,
      collectionId: nestedCollectionId.value,
    }),
  })
}

const getFrames = () => {
  postMessage({ type: 'getFrames' })
}

const parseName = (name) => {
  // split on / only need part with COMPONENT_SET: which i'll rename to CS:, COMPONENT: to C:, and the last part of string
  const split = name.split('/')
  const last = split[split.length - 1]
  const componentSet = split
    .find((v) => v.includes('COMPONENT_SET'))
    ?.replace('COMPONENT_SET:', 'CS:')
  const component = split
    .find((v) => v.includes('COMPONENT:'))
    ?.replace('COMPONENT:', 'C:')
  return `${componentSet} / ${component} / ${last}`
}

const varsToDelete = ref([])
const unusedVariables2 = ref([])
const variablesToRemap = ref([])

const deleteUnusedVariables = () => {
  postMessage({
    type: 'deleteUnusedVariables',
    payload: JSON.stringify(varsToDelete.value),
  })
  varsToDelete.value = []
}
emitter.on('msg', async (msg) => {
  if (msg.type === 'returnSelection') {
    selectedNode.value = JSON.parse(msg.payload)
  }
  if (msg.type === 'returnColorNodes') {
    colorNodes.value = JSON.parse(msg.payload)
    // console.log(colorNodes.value.map((node) => node.name))

    // colorNodeSuggestions.value = await getOpenAI(
    //   colorNodes.value.map((node) => node.name)
    // )

    // console.log(varSuggestions)
  }
  if (msg.type === 'returnUnusedVariables') {
    unusedVariables.value = JSON.parse(msg.payload)
  }
  if (msg.type === 'returnUnusedVariables2') {
    unusedVariables2.value = JSON.parse(msg.payload)
  }
  if (msg.type === 'returnVariablesToRemap') {
    // console.log(msg.payload)

    variablesToRemap.value = JSON.parse(msg.payload)
    console.log(variablesToRemap.value)
  }
  if (msg.type === 'test') {
    console.log('hellow :) 2')
  }
  if (msg.type === 'saveFile') {
    saveFile(JSON.parse(msg.payload))
  }
  if (msg.type === 'returnCollections') {
    collections.value = JSON.parse(msg.payload)
  }
  if (msg.type === 'returnBoundNodes') {
    boundNodes.value = JSON.parse(msg.payload)
  }
  if (msg.type === 'returnFrames') {
    frames.value = msg.payload
    // console.log(msg.payload)
  }
  if (msg.type === 'returnCollectionVariables') {
    // console.log(msg.payload)

    localVariables.value = JSON.parse(msg.payload)
    // console.log(localVariables.value);

    // console.log(localVariables.value)
    // if (colorNodes.value) {
    //   colorNodeSuggestions.value = await getOpenAI(
    //     colorNodes.value.map((node) => node.name)
    //   )
    // }
  }
})
onMounted(() => {
  window.onmessage = (event) => {
    if (!event?.data?.pluginMessage) return
    const msg = event.data.pluginMessage

    if (!msg.type) return
    // Emit events to be caught by components
    emitter.emit('msg', msg)
  }
})

const tabs = ref([
  { label: 'Main' },
  { label: 'Variables' },
  { label: 'Migration Tools' },
  { label: 'Bound Node Search' },
  { label: 'Variables Table' },
])
</script>

<template>
  <ResizableContainer>
    <template #title>Variable Manager</template>
    <div class="content">
      <div class="tabs">
        <StyledButton
          v-for="(tab, index) in tabs"
          :key="index"
          :label="tab.label"
          @click="activePage = index"
        />
      </div>
      <div v-show="activePage === 0">
        <div>
          <div class="flex">
            <GInput
              v-model="focusNodeId"
              style="width: 200px"
              placeholder="Focus Node"
            />
            <StyledButton label="Focus Node" @click.stop="focusNode(focusNodeId)" />
          </div>
          <StyledButton
            label="Get Styles"
            @click="postMessage({ type: 'getStyles' })"
          />
        </div>
        <div class="wrapper">
          <StyledButton
            label="Delete Unused Variables"
            @click="postMessage({ type: 'deleteVariables' })"
          />
          <StyledButton label="Get List of Pages" @click="getFrames" />
          <div class="frames">
            <div>{{ totalNodes - numNodesToChange }} / {{ totalNodes }} Done</div>
            <div>{{ numNodesToChange }} left to do</div>
            <template v-for="frame of mappedFrames" :key="frame.id">
              <GCollapsible v-if="frame.progress < 1">
                <template v-slot:title>
                  {{ frame.name }}
                  <StyledButton
                    variant="text"
                    icon="g:eye"
                    @click.stop="focusNode(frame.id)"
                  />
                  ({{ frame.totalNodes - frame.nodesToChange.length }} /
                  {{ frame.totalNodes }})
                  <GProgressBar
                    :progress="
                      (frame.totalNodes - frame.nodesToChange.length) /
                      frame.totalNodes
                    "
                    showPercentage
                  />
                </template>
                <template
                  v-for="node of frame.nodesToChange"
                  class="frame"
                  :key="frame.id"
                >
                  {{ node.name }}
                  <!-- <div>{{ parseName(node.name) }}</div> -->
                  <!-- <VariableSwapper
                  :type="node.type"
                  :currentVariable="node.variable"
                  :variableOptions="localVariables"
                  :prediction="node.variablePrediction"
                  @swapRequested="swapVariable(node.type, node, $event)"
                /> -->
                </template>
              </GCollapsible>
            </template>
          </div>
          <div class="unused-variables">
            <GCollapsible
              div
              v-for="(variable, name) in unusedVariables"
              :key="name"
            >
              <template v-slot:title>
                {{ name }}
                ({{ variable.nodes.length }})
              </template>
              <div v-for="node in variable.nodes" :key="node">
                {{ node.name }}
                <StyledButton
                  variant="text"
                  icon="g:eye"
                  @click.stop="focusNode(node.id)"
                />
              </div>
            </GCollapsible>
          </div>
          <StyledButton
            label="Get Unused Variables"
            @click="postMessage({ type: 'getUnusedVariables' })"
          />
          <hr />
          {{ nestedCollectionId }}
          <StyledButton
            label="Delete Nested Collection"
            :disabled="!nestedCollectionId"
            @click.once="deleteNestedCollection"
          />
          <StyledButton
            label="Create Nested Collection"
            :disabled="!!nestedCollectionId"
            @click.once="createNestedCollection"
          />
          <StyledButton
            label="Create Variable Set"
            :disabled="!nestedCollectionId || localVariables.length > 0"
            @click.once="createVariableSet"
          />
          <!-- {{ localVariables }} -->
          <hr />
          <StyledButton
            label="Migrate Node Variables"
            :disabled="!nestedCollectionId || localVariables.length === 0"
            @click.once="migrateNodeVariables"
          />
          <hr />
          <StyledButton
            label="Get Unused Vars 2"
            @click="
              postMessage({
                type: 'getUnusedVariables2',
                payload: {
                  nestedCollectionId,
                  includeInstanceNodes: true,
                },
              })
            "
          />
          <GSwitch
            v-model="includeInstanceNodes"
            label="Include Instance Nodes"
          />
          <StyledButton
            label="Delete Unused Variables"
            :disabled="varsToDelete.length === 0"
            @click="deleteUnusedVariables"
          />
          <div v-for="variable of unusedVariables2" :key="variable.id" class="row">
            <GCheckbox
              v-model="varsToDelete"
              :label="variable.name"
              :value="variable.id"
            />
            <StyledButton
              label="Copy"
              @click="
                copyToClipboard(
                  variable.name
                    .replace(/^(component\/|core\/)/, '')
                    .replace(/\//g, '-')
                )
              "
            />
          </div>
          <hr />
          <StyledButton
            label="Get Variables to Remap"
            @click="
              postMessage({
                type: 'getVariablesToRemap',
                payload: { nestedCollectionId, includeInstanceNodes },
              })
            "
          />
          <StyledButton
            label="Remap Variables"
            @click="
              postMessage({
                type: 'remapVariables',
              })
            "
          />
          <div v-for="variable of variablesToRemap" :key="variable.id" class="row">
            <GCollapsible>
              <template #title>
                <StyledButton
                  :label="variable.name"
                  @click.stop="copyToClipboard(variable.name)"
                />
              </template>
              <div class="row" v-for="node in variable.nodes" :key="node.id">
                {{ node.name }}
                <StyledButton icon="g:eye" @click="focusNode(node.id)" />
              </div>
            </GCollapsible>
          </div>
          <hr />
          <StyledButton
            label="Get Bound Nodes"
            @click="
              postMessage({ type: 'getBoundNodes', payload: nestedCollectionId })
            "
          />

          <GCollapsible
            v-for="(group, key) of boundNodeGroups"
            :title="`${key} (${group.length})`"
            :key="key"
          >
            <div v-for="node in group" :key="node">
              {{ node.name }}
              <StyledButton
                variant="text"
                icon="g:eye"
                @click.stop="focusNode(node.id)"
              />
            </div>
          </GCollapsible>
          <hr />
          <StyledButton label="Refresh Variables" @click="getCollectionVariables" />
          <!-- {{ localVariableNames }} -->
          <div class="nodes">
            <div v-for="node in colorNodes" class="node" :key="node.name">
              <StyledButton label="Focus" @click="focusNode(node.id)" />
              <div class="preview">
                <img :src="`data:image/png;base64,${node.imageData}`" alt="" />
              </div>
              <!-- <div>{{ parseName(node.name) }}</div> -->
              {{ node.name }}
              <div>
                <!-- {{ node.variable }} -->
              </div>
              <!-- <div v-if="colorNodeSuggestions">
              {{ colorNodeSuggestions[node.name] }}
            </div> -->
              <VariableSwapper
                type="fill"
                v-if="!!node.fills"
                :currentVariable="node.fills"
                :variableOptions="localVariables"
                :prediction="node.variablePrediction"
                @swapRequested="swapVariable('fills', node, $event)"
              />
              <VariableSwapper
                type="stroke"
                v-if="!!node.strokes"
                :currentVariable="node.strokes"
                :variableOptions="localVariables"
                :prediction="node.variablePrediction"
                @swapRequested="swapVariable('strokes', node, $event)"
              />
            </div>
          </div>
          <hr />
          <StyledButton label="Export Variables to SCSS" @click="exportVariablestoSCSS" />
        </div>
      </div>
      <!-- {{ nestedCollectionId }} -->
      <div v-show="activePage === 1">
        <VariablesPage v-bind="{ nestedCollectionId }" />
      </div>
      <MigrationTools v-show="activePage === 2" />
      <BoundNodeSearch 
        v-show="activePage === 3" 
        :nestedCollectionId="nestedCollectionId"
        :boundNodes="boundNodes"
      />
      <VariablesTable
        v-show="activePage === 4"
        :nestedCollectionId="nestedCollectionId"
      />
    </div>
  </ResizableContainer>
</template>

<style lang="scss">
body {
  --body-bg: rgb(34, 34, 34);
  --body-fg: white;
  background-color: var(--body-bg);
  color: var(--body-fg);
  font-family: Arial, Helvetica, sans-serif;
  margin: 0;
  overflow: hidden;

  --dropdown-fg: white;
  --dropdown-bg: transparent;
  --dropdown-placeholder-fg: white;
  --dropdown-border-fg: white;
  --dropdown-outlined-border-fg: var(--dropdown-border-fg);
  --dropdown-lined-border-fg: var(--dropdown-border-fg);
  --dropdown-border-error-fg: red;
  --dropdown-radius: 0;
  --dropdown-options-fg: black;
  --dropdown-options-bg: white;
  --dropdown-options-border-fg: transparent;
  --dropdown-option-hovered-fg: black;
  --dropdown-option-hovered-bg: #d3cec0;
  --dropdown-option-selected-fg: black;
  --dropdown-option-selected-bg: #fccf5f;
  --dropdown-option-selected-hovered-fg: black;
  --dropdown-option-selected-hovered-bg: #fbc234;

  // Button
  --button-primary-main: white;
  --button-primary-accent: black;
  --button-primary-hover-main: var(--button-primary-main);
  --button-primary-hover-accent: var(--button-primary-accent);
  --button-disabled-main: darkgrey;
  --button-disabled-accent: rgb(0, 0, 0);

  // Input
  --input-bg: #ffffff1a;
  --input-border-disabled-fg: #9fa5aa;
  --input-border-fg: #ffffff40;
  --input-border-focus-fg: #ffffff;
  --input-disabled-bg: #4d4f52;
  --input-disabled-fg: #9fa5aa;
  --input-fg: #ffffff;
  --input-placeholder-fg: #ffffffbf;
  --input-radius: 0px;

  // Modal
  --modal-card-bg: var(--body-bg);
  --modal-card-fg: var(--body-fg);
  --modal-overlay-bg: rgba(0, 0, 0, 0.5);
  --shadow-2: 2px 3px 6px rgba(0, 0, 0, 0.25);
}

.styled-button.toggle-ui-size {
  padding: 5px;
}

.nodes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  .node {
    padding: 10px;
    border: 1px solid;
  }
}

.frames {
  .g-progress-bar {
    margin-left: auto;
    margin-right: 10px;
    width: 200px;

    .percentage {
      color: black;
    }
  }
  .g-collapsible {
    .header .arrow {
      margin-left: unset;
    }
  }
}

.svg-item {
  padding: 10px;
}

.flex {
  display: flex;
  align-items: center;
}

.variable-swapper {
  margin-bottom: 10px;
}

.organize {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  > * {
    margin-bottom: 10px;
  }
}
.preview {
  height: 40px;
  padding: 10px;
  img {
    max-width: 100%;
    max-height: 100%;
  }
}

.row {
  display: flex;
  align-items: center;
  .g-button {
    margin-left: 5px;
  }
}

.file-input {
  margin-top: 20px;
}

.bound-node-search {
  padding: 20px;
  
  .search-header {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }

  .bound-nodes-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .node-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px;
  }

  .node-name {
    word-break: break-all;
    margin-right: 10px;
  }
}
</style>
