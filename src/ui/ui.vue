<script lang="ts" setup>
import { onMounted, ref, toRaw, watch } from 'vue'
import {
  postMessage,
  saveSVG,
  saveSVGZip,
  copyToClipboard,
  hexToRgb,
  prettifyXml,
  colorCodes,
} from './utils'
import StyledButton from '@/components/StyledButton.vue'
import StyledDropdown from '@/components/StyledDropdown.vue'
import { GInput } from '@twentyfourg/grimoire'
import VariableSwapper from './components/VariableSwapper.vue'
// import resizer from './components/resizer.vue';

const variableCollections = ref([])
const currentCollection = ref(null)
const selectedNode = ref(null)
const variableReceivingValue = ref(null)

const localVariables = ref([])

watch(variableCollections, (newVal, oldVal) => {
  if (!oldVal.length && newVal.length) currentCollection.value = newVal[0]
})

const updateLocalVariables = (variables) => {
  localVariables.value = variables
}
const updateCollections = (collections) => {
  variableCollections.value = collections
}
const refreshCollections = () => {
  postMessage({ type: 'refreshCollections' })
}
const exportVariables = () => {
  postMessage({ type: 'getVariables' })
}
const getStyles = () => {
  postMessage({ type: 'getStyles' })
}
// const createLinearCollection = () => {
//   postMessage({type: 'createLinearCollection'})
// }
const createNestedCollection = () => {
  postMessage({ type: 'createNestedCollection' })
}
// const createSuperNestedCollection = () => {
//   postMessage({type: 'createSuperNestedCollection'})
// }

// const pluginData = ref('');
// const addPluginData = () => {
//   postMessage({type: 'addPluginData', data: pluginData.value})
// }

const setValueForVariable = (
  collectionId,
  currentVariableId,
  replacementVariableId
) => {
  console.log(
    collectionId,
    variableCollections.value[1],
    currentVariableId,
    replacementVariableId
  )
  const payload = {
    collectionId,
    modeId: variableCollections.value[1].modes[0].modeId,
    currentVariableId,
    replacementVariableId,
  }
  postMessage({ type: 'setValueForVariable', payload })
}

const swapVariable = (attribute, variableId) => {
  postMessage({
    type: 'swapVariable',
    payload: JSON.stringify({ attribute, variableId }),
  })
}

onmessage = async (event) => {
  if (!event?.data?.pluginMessage) return
  const msg = event.data.pluginMessage
  if (!msg.type) return
  if (msg.type === 'selectionUpdated') {
    selectedNode.value = JSON.parse(msg.node)
  }
  if (msg.type === 'collectionsUpdated') {
    updateCollections(msg.collections)
  }
  if (msg.type === 'localVariablesUpdated') {
    updateLocalVariables(msg.variables)
  }
  if (msg.type === 'log') {
    console.log(msg.message)
  }
}
</script>

<template>
  <div class="wrapper">
    <!-- Create collection with new variable structure-->
    <StyledButton
      label="Create Nested Collection"
      @click="createNestedCollection"
    />
    <hr />
    <!-- Assign variable to another variable -->
    <!--  -->
    <StyledButton label="Refresh" @click="refreshCollections" />
    <StyledDropdown
      v-model="currentCollection"
      :options="variableCollections"
      valueProp="id"
      trackBy="id"
      label="name"
    />
    {{ variableCollections[1] }}
    <hr />
    {{ selectedNode }}
    <div>id: {{ selectedNode?.id }}</div>
    <div>fill: {{ selectedNode?.fill?.name || 'N/A' }}</div>
    <StyledDropdown
      v-if="selectedNode?.fill"
      v-model="variableReceivingValue"
      :options="localVariables"
      valueProp="id"
      trackBy="name"
      label="name"
      searchable
    />
    <StyledButton
      v-if="selectedNode?.fill"
      label="setValueForVariable"
      :disabled="!variableReceivingValue"
      @click="
        setValueForVariable(
          variableCollections[1].id,
          selectedNode.fill.id,
          variableReceivingValue
        )
      "
    />
    <StyledButton
      v-if="selectedNode?.fill"
      label="swapVariable"
      :disabled="!variableReceivingValue"
      @click="swapVariable('fill', variableReceivingValue)"
    />
    <div>stroke: {{ selectedNode?.stroke?.name }}</div>
    <StyledDropdown
      v-if="selectedNode?.stroke"
      v-model="variableReceivingValue"
      :options="localVariables"
      valueProp="id"
      trackBy="name"
      label="name"
      searchable
    />
    <StyledButton
      v-if="selectedNode?.stroke"
      label="setValueForVariable"
      :disabled="!variableReceivingValue"
      @click="
        setValueForVariable(
          variableCollections[1].id,
          selectedNode.stroke.id,
          variableReceivingValue
        )
      "
    />
    <StyledButton
      v-if="selectedNode?.stroke"
      label="swapVariable"
      :disabled="!variableReceivingValue"
      @click="swapVariable('stroke', variableReceivingValue)"
    />
    <hr />
    <VariableSwapper
      type="fill"
      :currentVariable="{ name: selectedNode?.fill?.name }"
      :variableOptions="localVariables"
      @swapRequested=""
    />
    <VariableSwapper
      type="stroke"
      :currentVariable="{ name: selectedNode?.stroke?.name }"
      :variableOptions="localVariables"
    />
    <div>
      <StyledButton label="Export Variables" @click="exportVariables" />
      <StyledButton label="Get Styles" @click="getStyles" />
    </div>
  </div>
  <!-- <resizer /> -->
</template>

<style lang="scss">
body {
  --body-bg: rgb(34, 34, 34);
  --body-fg: white;
  background-color: var(--body-bg);
  color: var(--body-fg);
  font-family: Arial, Helvetica, sans-serif;

  --dropdown-fg: black;
  --dropdown-bg: white;
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
  // --button-secondary-main: #{$secondary-button-bg};
  // --button-secondary-accent: #{$secondary-button-text};
  // --button-secondary-hover-main: #{$secondary-button-bg-hover};
  // --button-secondary-hover-accent: var(--button-secondary-main);
  // --button-highlight-main: #{$highlight-button-bg};
  // --button-highlight-accent: #{$highlight-button-text};
  // --button-highlight-hover-main: #{$highlight-button-bg-hover};
  // --button-highlight-hover-accent: var(--button-highlight-main);
  // --button-danger-main: var(--signal-error);
  // --button-danger-accent: #fff;
  // --button-danger-hover-main: #{$signal-error-hover};
  // --button-danger-hover-accent: var(--button-danger-main);
  --button-disabled-main: darkgrey;
  --button-disabled-accent: rgb(0, 0, 0);
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

.file-input {
  margin-top: 20px;
}
</style>
