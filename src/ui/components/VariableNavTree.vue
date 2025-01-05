<script setup lang="ts">
import { computed, ref } from 'vue'
import { GCollapsible } from '@twentyfourg/grimoire'

interface TreeNode {
  name: string
  path: string
  variables: any[]
  children: { [key: string]: TreeNode }
}

const props = defineProps<{
  node: TreeNode
  level?: number
  selectedPath?: string
  openUpToPath?: string
}>()

const emit = defineEmits<{
  (e: 'select', path: string): void
}>()

const selectPath = (path: string) => {
  emit('select', path)
}

const hasChildren = computed(() => {
  return Object.keys(props.node.children).length > 0
})

const isLeafNode = computed(() => {
  return !hasChildren.value && props.node.variables.length > 0
})

const variableCount = computed(() => {
  return props.node.variables.length
})

const getTotalVariableCount = (node: TreeNode) => {
  let count = node.variables.length
  for (const childNode of Object.values(node.children)) {
    count += getTotalVariableCount(childNode)
  }
  return count
}

const isPathActive = (path: string) => {
  return (
    props.selectedPath === path ||
    (props.selectedPath?.startsWith(path + '/') ?? false)
  )
}
</script>

<template>
  <div class="nav-tree" :style="{ paddingLeft: level ? '16px' : '0' }">
    <template v-if="hasChildren">
      <GCollapsible :open="isPathActive(node.path)">
        <template #header="{ open }">
          <div class="header" :class="{ active: isPathActive(node.path) }">
            <div class="nav-label" @click.stop="selectPath(node.path)">
              {{ node.name }}
              <span class="count">({{ getTotalVariableCount(node) }})</span>
            </div>
            <span class="custom-arrow" :class="{ open }">▶</span>
          </div>
        </template>

        <VariableNavTree
          v-for="[key, childNode] in Object.entries(node.children)"
          :key="key"
          :node="childNode"
          :level="(level || 0) + 1"
          :selectedPath="selectedPath"
          @select="selectPath"
        />
      </GCollapsible>
    </template>

    <template v-else-if="isLeafNode">
      <div
        class="nav-item"
        @click="selectPath(node.path)"
        :class="{ active: isPathActive(node.path) }"
      >
        <span class="bullet">•</span>
        {{ node.name }}
        <span class="count">({{ variableCount }})</span>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.nav-tree {
  margin-bottom: 4px;

  .header {
    width: 100%;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    transition: background-color 0.2s;
    &:hover:not(.active) {
      background: rgba(255, 255, 255, 0.1);
    }
    &.active {
      background: rgba(255, 255, 255, 0.15);
    }

    .custom-arrow {
      margin-left: auto;
      font-size: 10px;
      transition: transform 0.2s ease;

      &.open {
        transform: rotate(90deg);
      }
    }

    .nav-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;

      .count {
        opacity: 0.6;
        font-size: 0.9em;
      }
    }
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 8px;
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

    .bullet {
      opacity: 0.6;
    }

    .count {
      opacity: 0.6;
      font-size: 0.9em;
      margin-left: auto;
    }
  }
}
</style>
