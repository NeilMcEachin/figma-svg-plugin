<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { postMessage } from '../utils'
import { GCollapsible, GInput } from '@twentyfourg/grimoire'
import StyledButton from '@/components/StyledButton.vue'
import emitter from '../eventBus'

const props = defineProps<{
  nestedCollectionId: string | null
}>()

const isLoading = ref(false)
const boundNodeSearchQuery = ref('')
const boundNodes = ref([])

const toCssVarFormat = (name: string) => {
  return '--' + name.replace(/^(component\/|core\/)/, '').replace(/\//g, '-')
}

const filteredBoundNodes = computed(() => {
  if (!boundNodeSearchQuery.value) return []

  const query = boundNodeSearchQuery.value.toLowerCase()
  return boundNodes.value.filter((node) => {
    if (query.startsWith('--')) {
      // CSS variable format search
      const cssVarName = toCssVarFormat(node.variable.name).toLowerCase()
      return cssVarName.includes(query)
    }
    // Regular search
    return node.variable.name.toLowerCase().includes(query)
  })
})

const getBoundNodes = () => {
  isLoading.value = true
  setTimeout(() => {
    postMessage({ type: 'getBoundNodes', payload: props.nestedCollectionId })
  }, 200)
}

const focusNode = (nodeId: string) => {
  postMessage({ type: 'focusNode', payload: JSON.stringify({ nodeId }) })
}

onMounted(() => {
  emitter.on('msg', (msg: any) => {
    if (msg.type === 'returnBoundNodes') {
      isLoading.value = false
      boundNodes.value = JSON.parse(msg.payload)
    }
  })
})
</script>

<template>
  <div class="bound-node-search">
    <div class="search-header">
      <StyledButton
        label="Get Bound Nodes"
        :loading="isLoading"
        @click="getBoundNodes"
      />
      {{ boundNodes.length }}
      <GInput
        v-model="boundNodeSearchQuery"
        style="width: 300px"
        placeholder="Search by variable name or CSS format (--)"
      />
    </div>
    <div class="bound-nodes-list">
      <div class="node-info" v-for="node,index in filteredBoundNodes" :key="`${node.id}-${index}`">
        <div class="node-name">
          {{ node.name }}
          <div class="css-var">{{ toCssVarFormat(node.variable.name) }}</div>
        </div>
        <StyledButton
          variant="text"
          icon="g:eye"
          @click.stop="focusNode(node.id)"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
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

  .css-var {
    font-size: 0.9em;
    color: #666;
    margin-top: 4px;
  }
}
</style>
