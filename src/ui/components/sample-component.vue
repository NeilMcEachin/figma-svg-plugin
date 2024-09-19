<script lang="ts" setup>
  // data
  const title = "Rectangle Creator";
  let count = 5;

  // methods
  const create = () => {
    window.parent.postMessage({pluginMessage: { type: "create-rectangles", count }}, "*")
  }
  const svg = () => {
    window.parent.postMessage({pluginMessage: { type: "get-selected-layers", count }}, "*")
  }
  const cancel = () => {
    window.parent.postMessage({pluginMessage: { type: "cancel" }}, "*")
  }
</script>

<template>
  <h2>{{ title }}</h2>
  <p>Count: <input id="count" v-model="count"></p>
  <button id="create" @click="create()">Create</button>
  <button id="svg" @click="svg()">SVG</button>
  <button id="cancel" @click="cancel()">Cancel</button>
</template>

<style lang="scss">
</style>
