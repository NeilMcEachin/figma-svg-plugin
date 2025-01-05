<template>
  <div class="tools">
    <div class="center">
      <div class="toolset">
        <div class="title">Tools for file you're exporting from</div>
        <StyledButton
          label="Export Bound Nodes"
          @click="postMessage({ type: 'getNodesBoundToCollection' })"
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
        <GSwitch
          v-model="includeInstanceNodes"
          label="Include Instance Nodes (Much slower)"
        />
        <GCollapsible v-for="variable in variablesToRemap" :key="variable.id">
          <template v-slot:title>
            <VariableAssigner
              :currentVariable="variable"
              :variableOptions="localVariables"
              :suggestion="variableRemaps[variable.name]"
              actionText="Change All To"
              @changeRequested="assignVariableToNode($event, variable.nodes)"
              @click.stop
              @keyup.stop
              @keydown.stop
              @keypress.stop
            >
              <template v-slot:name="{ name }">
                {{ name }} ({{ variable.nodes.length }})
              </template>
            </VariableAssigner>
          </template>
          <div v-for="node in variable.nodes" :key="node.id" class="node">
            <StyledButton
              icon="g:eye"
              variant="text"
              @click="focusNode(node.id)"
            />
            {{ node.name }}
            <div class="preview">
              <img :src="`data:image/png;base64,${node.imageData}`" alt="" />
            </div>
            <VariableAssigner
              :currentVariable="variable"
              :variableOptions="localVariables"
              :suggestion="variableRemaps[variable.name]"
              @changeRequested="assignVariableToNode($event, [node])"
            />
          </div>
        </GCollapsible>
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
import { ref, computed, nextTick } from 'vue'
import StyledButton from '@/components/StyledButton.vue'
import VariableDropdown from '@/components/VariableDropdown.vue'
import StyledInput from '@/components/StyledInput.vue'
import { GCollapsible, GSwitch } from '@twentyfourg/grimoire'
import VariableAssigner from '@/components/VariableAssigner.vue'
import variableRemaps from '@/data/variableRemaps'
import emitter from '../eventBus'
import { onMounted } from 'vue'

const importBoundNodesFileUpload = ref(null)
const importCollectionVariablesFileUpload = ref(null)
const variablesToRemap = ref([])
const localVariables = ref([])
const includeInstanceNodes = ref(false)
const isLoading = ref(false)
const aliasVariableId = ref(null)
const originalVariableId = ref(null)
const replacementVariableId = ref(null)
const rawReplacementVariableId = ref(null)
const props = defineProps({
  nestedCollectionId: String,
})

const assignVariableToNode = (newVariableId, nodes) => {
  const data = {
    variableId: newVariableId,
    nodes,
  }
  postMessage({ type: 'assignVariableToNodes', payload: JSON.stringify(data) })
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

const getVariablesToRemap = async () => {
  isLoading.value = true
  setTimeout(() => {
    postMessage({
      type: 'getVariablesToRemap',
      payload: {
        nestedCollectionId: props.nestedCollectionId,
        includeInstanceNodes: includeInstanceNodes.value,
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
    variablesToRemap.value = JSON.parse(msg.payload)
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
:deep(.g-collapsible) {
  .g-collapsible__content {
    padding-left: 20px;
    padding-right: 20px;
  }
}
</style>
