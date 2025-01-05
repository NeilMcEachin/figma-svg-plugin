<template>
  <GInput
    v-bind="{ ...$attrs, ...computedProps }"
    class="styled-input"
    :class="size"
    ref="inputRef"
  >
    <!-- Apply any slots defaults above this line -->
    <template v-for="(_, name) in $slots" v-slot:[name]="slotData">
      <slot :name="name" v-bind="slotData" />
    </template>
  </GInput>
  <small
    v-if="maxlength && showCount && type !== 'number'"
    class="character-count"
  >
    <slot
      name="count"
      v-bind="{ characterCount, maxLength: maxlength, charactersLeft }"
    >
      {{ characterCount }} / {{ maxlength }}
    </slot>
  </small>
</template>

<script setup>
import { GInput } from '@twentyfourg/grimoire'
import { computed, ref } from 'vue'

const inputRef = ref(null)

const defaultProps = defineProps({
  ...GInput.props,
  // Apply prop overrides below this line
  variant: {
    default: 'lined',
  },
  size: {
    type: String,
    default: null,
  },
  // Apply any new props below this line
  showCount: {
    type: Boolean,
    default: false,
  },
  maxlength: {
    type: [Number, String],
  },
})

// Conditional Props. Props I want to change the behavior of based on conditional information.
// Attention! When updating for spinoff you may need to tweak these to match style
// Filled adds a background to input, outlined adds a border around entire input, lined adds a border to the bottom of an input.
// You can combine them for different style types based on conditionals
const conditionalProps = {
  variant: (localProps) => {
    const variant = localProps.variant.split(' ')
    if (localProps.type === 'textarea' && !variant.includes('filled'))
      variant.push('filled')
    if (localProps.size === 'lg') return 'outlined filled'
    return variant.join(' ')
  },
}
// Props that take in to account conditional props and any that should not be passed into GInput
const computedProps = computed(() => {
  const localProps = { ...defaultProps }

  // Evaluate any conditional props
  Object.keys(conditionalProps).forEach((key) => {
    localProps[key] = conditionalProps[key](defaultProps)
  })

  // delete props that shouldn't be passed to GInput
  delete localProps.size

  // Return results
  return localProps
})

// TODO move this to GField in the future
const characterCount = computed(() => {
  if (!inputRef?.value) return 0
  if (typeof inputRef.value.computedValue === 'string') {
    return inputRef.value.computedValue.length
  }
  if (typeof inputRef.value.computedValue === 'number') {
    return inputRef.value.computedValue.toString().length
  }
  return 0
})

const charactersLeft = computed(() => {
  if (
    computedProps.value.maxlength &&
    characterCount.value < computedProps.value.maxlength
  )
    return computedProps.value.maxlength - characterCount.value
  return 0
})
</script>

<script>
export default {
  inheritAttrs: false,
}
</script>

<style lang="scss" scoped>
.styled-input {
  --g-input-background-color: transparent;
  --g-input-font-color: var(--input-fg);
  --g-input-action-icon-size: 24px;
  --g-input-clear-icon-size: 20px;
  --g-input-border-color: transparent;

  width: 100%;
  border-radius: var(--input-radius);

  :deep() {
    .input-element {
      padding: 10px;
      font-size: 12px;

      &::placeholder {
        color: var(--input-placeholder-fg);
        opacity: 1;
      }

      &:disabled {
        color: var(--input-disabled-fg);
      }
    }
  }

  &.filled {
    --g-input-background-color: var(--input-bg);

    &.disabled {
      --g-input-background-color: var(--input-disabled-bg);
    }
  }

  &.outlined {
    --g-input-border-color: var(--input-border-fg);
  }

  &.lined {
    --input-radius: 0;
    --g-input-border-color: var(--input-border-fg);
  }

  &:focus-within {
    // TODO [figma] add showcase to figma file
    --g-input-border-color: var(--input-border-focus-fg);
  }

  &.error {
    --g-input-border-color: var(--signal-error);
  }

  :deep(.input-action) {
    width: 35px;
    height: 35px;
    outline-color: inherit;
  }

  &.type--textarea {
    :deep() {
      .input-element {
        &:not(.auto-resize) {
          min-height: 160px;
        }
      }
    }
  }

  &.lg {
    height: 59px;
    padding: 15px;

    --input-radius: 0;
  }
}
</style>
