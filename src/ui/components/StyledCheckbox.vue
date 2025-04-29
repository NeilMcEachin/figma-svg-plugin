<template>
  <GCheckbox
    v-bind="{ ...$attrs, ...$props }"
    class="styled-checkbox"
  >
    <!-- Apply any slots defaults above this line -->
    <template v-for="(_, name) in $slots" v-slot:[name]="slotData">
      <slot :name="name" v-bind="slotData" />
    </template>
  </GCheckbox>
</template>

<script setup>
import { GCheckbox } from '@twentyfourg/grimoire'

const props = defineProps({
  ...GCheckbox.props,
})

</script>

<script>
export default {
  inheritAttrs: false,
}
</script>

<style lang="scss" scoped>
.styled-checkbox {
  --g-checkbox-size: 20px;
  --g-checkbox-label-gap: 15px;
  --g-checkbox-bg-color: var(--checkbox-bg);
  --g-checkbox-border-color: var(--checkbox-border-fg);


  &.checked {
    --g-checkbox-bg-color: var(--checkbox-checked-bg);
    --g-checkbox-border-color: var(--checkbox-checked-border-fg);
  }

  :deep(.icon-checkmark){
    width: unset;
  }
}
</style>
