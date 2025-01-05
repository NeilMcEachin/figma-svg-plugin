<template>
  <GDropdown
    v-bind="{ ...$attrs, ...$props, ...conditionalProps }"
    class="styled-dropdown"
    :class="variant"
    @refMounted="dropdownRef = $event"
  >
    {{ variant }}
    <!-- TODO [refactor-vue3] make dropdown close when I click caret -->
    <!-- <template v-slot:tag="{ option, handleTagRemove }">
      <StyledTag
        class="multiselect__tag"
        :label="option[$attrs.label || 'label']"
        @remove="handleTagRemove(option, $event)"
      />
    </template> -->
    <!-- <template v-slot:caret>
      <div class="caret-container">
        <CaretIcon class="multiselect__caret" :class="{ open: dropdownRef?.isDropdownOpen }" />
      </div>
    </template> -->
    <template v-slot:clear="{ clear }"
      ><StyledButton
        class="multiselect__clear"
        icon="lxp:x-icon"
        variant="unstyled"
        @click="clear()"
    /></template>
    <!-- Apply any slots defaults above this line -->
    <template v-for="(_, name) in $slots" v-slot:[name]="slotData">
      <slot :name="name" v-bind="slotData" />
    </template>
  </GDropdown>
</template>

<script setup>
import { ref, useAttrs } from 'vue'
import { GDropdown } from '@twentyfourg/grimoire'
// import CaretIcon from '@theme/icons/carat-light.svg';
import StyledButton from './StyledButton.vue'
// import StyledTag from './StyledTag.vue';

const attrs = useAttrs()
defineProps({
  ...GDropdown.props,
  // Apply prop overrides below this line
  canClear: {
    default: false,
  },
  canDeselect: {
    default: false,
  },
  object: {
    default: false,
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'outlined', 'lined'].includes(value),
  },
  // Apply any new props below this line
})

const dropdownRef = ref(null)

const conditionalProps = {}
if (attrs.hideSelected) conditionalProps.hideSelected = attrs.hideSelected
else if (attrs.mode === 'tags' || attrs.mode === 'multiple')
  conditionalProps.hideSelected = false

if (attrs.closeOnSelect) conditionalProps.closeOnSelect = attrs.closeOnSelect
else if (attrs.mode === 'tags' || attrs.mode === 'multiple')
  conditionalProps.closeOnSelect = false
</script>

<script>
export default {
  inheritAttrs: false,
}
</script>

<style lang="scss" scoped>
.styled-dropdown {
  // Root vars
  --ms-font-size: 12px;
  --ms-bg: var(--dropdown-bg);
  --ms-bg-disabled: var(--dropdown-bg);
  --ms-border-color: var(--dropdown-border-fg);
  --ms-radius: var(--dropdown-radius);
  --ms-ring-width: 0;
  --ms-py: 5px;
  --ms-px: 10px;
  --ms-placeholder-color: var(--dropdown-placeholder-fg);
  --ms-empty-color: var(--dropdown-fg);

  // Dropdown vars
  --ms-dropdown-bg: var(--dropdown-options-bg, var(--dropdown-bg));
  --ms-dropdown-border-color: var(--dropdown-options-border-fg);
  --ms-dropdown-radius: var(--dropdown-radius);
  --ms-option-px: 16px;
  --ms-option-color-pointed: var(--dropdown-option-hovered-fg);
  --ms-option-bg-pointed: var(--dropdown-option-hovered-bg);
  --ms-option-color-selected: var(--dropdown-option-selected-fg);
  --ms-option-bg-selected: var(--dropdown-option-selected-bg);

  // --ms-option-bg-disabled: #fff;
  // --ms-option-color-disabled: #d1d5db;
  --ms-option-color-selected-pointed: var(
    --dropdown-option-selected-hovered-fg
  );
  --ms-option-bg-selected-pointed: var(--dropdown-option-selected-hovered-bg);

  // --ms-option-bg-selected-disabled: #fff;
  // --ms-option-color-selected-disabled: #d1fae5;

  // Tag vars
  --ms-tag-mx: 4px;

  min-height: 50px;
  :deep() {
    color: var(--dropdown-fg) !important;
  }

  &.is-disabled {
    pointer-events: none;
    cursor: not-allowed;
    opacity: 0.5;

    // :deep(*) {
    //   cursor: default;
    // }
  }

  &.default {
    --dropdown-border-fg: transparent;
  }

  &.outlined {
    --dropdown-border-fg: var(--dropdown-outlined-border-fg);
  }

  &.lined {
    --dropdown-border-fg: var(--dropdown-lined-border-fg);

    border-width: 0 0 1px;
  }

  &.error {
    --dropdown-border-fg: var(--dropdown-border-error-fg);
  }
  &.is-open {
    z-index: 5;
  }

  .caret-container {
    pointer-events: none;
  }

  :deep() {
    .multiselect {
      &-search {
        color: inherit;
        &::placeholder {
          color: var(--ms-placeholder-color);
          opacity: 0.5;
        }
      }

      &-placeholder {
        opacity: 0.5;
      }

      &-single-label {
        padding-right: 15px;
      }

      &-option {
        font-size: var(--ms-option-font-size, inherit);
        line-height: var(--ms-option-line-height, inherit);
        color: var(
          --dropdown-option-fg,
          var(--dropdown-options-fg, var(--dropdown-fg))
        );

        &.is-disabled {
          color: inherit;
          background: inherit;
          opacity: 0.5;
        }
      }

      &__caret,
      &__clear {
        padding: 0;
      }

      &__caret {
        position: relative;
        z-index: 1;
        flex-shrink: 0;
        width: 18px;
        height: 9px;
        margin-right: 10px;
        margin-left: 10px;
        transition: transform 0.2s ease;

        &.open {
          transform: rotateZ(180deg);
        }

        path {
          fill: currentcolor;
        }
      }

      &-tags {
        padding-left: calc(var(--ms-px) - var(--ms-tag-mx));

        &-search {
          color: inherit;
          background-color: transparent;
        }
      }

      &__tag {
        margin: 2.5px;
      }
    }
  }
}
</style>
