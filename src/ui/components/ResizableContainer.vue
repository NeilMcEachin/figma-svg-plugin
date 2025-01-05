<script lang="ts" setup>
import { onUnmounted } from 'vue'
import { postMessage } from '../utils'

let isResizing = false
let resizeType: string | null = null
let startX = 0
let startY = 0
let startWidth = 0 
let startHeight = 0
const MIN_WIDTH = 200
const MIN_HEIGHT = 32
const MAX_WIDTH = 2000
const MAX_HEIGHT = 2000

function toggleMinimize() {
  postMessage({ type: 'toggleMinimize' })
}

function startResize(type: string, e: MouseEvent) {
  isResizing = true
  resizeType = type
  startX = e.clientX
  startY = e.clientY
  const rect = document.querySelector('.resizable-container').getBoundingClientRect()
  startWidth = rect.width
  startHeight = rect.height
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

function handleResize(e: MouseEvent) {
  if (!isResizing) return

  let newWidth = startWidth
  let newHeight = startHeight

  if (resizeType === 'right' || resizeType === 'corner') {
    newWidth = startWidth + (e.clientX - startX)
    newWidth = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH)
  }
  
  if (resizeType === 'bottom' || resizeType === 'corner') {
    newHeight = startHeight + (e.clientY - startY)
    newHeight = Math.min(Math.max(newHeight, MIN_HEIGHT), MAX_HEIGHT)
  }

  if (newWidth !== startWidth || newHeight !== startHeight) {
    postMessage({ 
      type: 'resize',
      width: newWidth,
      height: newHeight
    })
  }
}

function stopResize() {
  isResizing = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<template>
  <div class="resizable-container">
    <div class="title-bar" @dblclick="toggleMinimize">
      <slot name="title">Variable Manager</slot>
    </div>
    <div class="content">
      <slot></slot>
    </div>
    <div class="resize-handle right" @mousedown="(e) => startResize('right', e)"></div>
    <div class="resize-handle bottom" @mousedown="(e) => startResize('bottom', e)"></div>
    <div class="resize-handle corner" @mousedown="(e) => startResize('corner', e)"></div>
  </div>
</template>

<style lang="scss" scoped>
.resizable-container {
  position: relative;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  
  .title-bar {
    height: 32px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid var(--border-primary-fg);
    cursor: default;
    user-select: none;
    transition: background-color 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    &:active {
      background: rgba(255, 255, 255, 0.08);
    }
  }
  
  .content {
    height: calc(100% - 32px);
    overflow: auto;
    padding: 16px 21px 16px 16px;
    box-sizing: border-box;
  }

  .resize-handle {
    position: fixed;
    z-index: 100;
    background: transparent;

    &.right {
      top: 0;
      right: 0;
      width: 5px;
      height: 100%;
      cursor: ew-resize;
    }

    &.bottom {
      bottom: 0;
      left: 0;
      width: 100%;
      height: 5px;
      cursor: ns-resize;
    }

    &.corner {
      right: 0;
      bottom: 0;
      width: 15px;
      height: 15px;
      cursor: nwse-resize;
      z-index: 101;
    }

    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }
  }
}
</style> 