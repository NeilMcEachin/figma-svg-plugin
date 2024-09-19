<template>
  <GButton v-bind="{ ...$attrs, ...$props }" class="styled-button">
    <!-- Apply any slots defaults above this line -->
    <template v-for="(_, name) in $slots" v-slot:[name]="slotData">
      <slot :name="name" v-bind="slotData" />
    </template>
  </GButton>
</template>

<script setup>
import { GButton } from '@twentyfourg/grimoire';
import { getCurrentInstance } from 'vue';

defineProps({
  ...GButton.props,
  // Apply prop overrides below this line
  colorVariants: {
    default: () => ['primary', 'secondary', 'danger', 'highlight'],
  },
  // Apply any new props below this line
});
// Expose entire instance so I can use ref in parent. maybe I should expose only props since thats what I need.
const instance = getCurrentInstance();
defineExpose(instance.proxy);
</script>

<script>
export default {
  inheritAttrs: false,
};
</script>

<style lang="scss" scoped>
.styled-button {
  --g-button-icon-gap: 10px;

  height: 36px;
  padding: 0 30px;
  border-radius: 6px;
  transition: background-color 100ms ease-in-out;


  &.default {
    &:hover,
    &:focus-visible {
      text-decoration: underline;
    }

    &.primary {
      color: var(--button-primary-accent);
      background: var(--button-primary-main);
      border: 1px solid var(--button-primary-accent);

      &:hover,
      &:focus-visible {
        color: var(--button-primary-hover-accent);
        background: var(--button-primary-hover-main);
      }
    }

    &.secondary {
      color: var(--button-secondary-accent);
      background: var(--button-secondary-main);

      &:hover,
      &:focus-visible {
        color: var(--button-secondary-hover-accent);
        background: var(--button-secondary-hover-main);
      }
    }

    &.danger {
      color: var(--button-danger-accent);
      background: var(--button-danger-main);

      &:hover,
      &:focus-visible {
        color: var(--button-danger-hover-accent);
        background: var(--button-danger-hover-main);
      }
    }

    &.highlight {
      color: var(--button-highlight-accent);
      background: var(--button-highlight-main);

      &:hover,
      &:focus-visible {
        color: var(--button-highlight-hover-accent);
        background: var(--button-highlight-hover-main);
      }
    }

    &:disabled {
      color: var(--button-disabled-accent);
      background: var(--button-disabled-main);
      border: none;
    }
  }

  // NEW
  &.outline {
    border-color: currentcolor;

    &.primary {
      color: var(--button-primary-accent);

      &:not(:disabled) {
        &:hover,
        &:focus-visible {
          color: var(--button-primary-hover-accent);
        }
      }
    }

    &.secondary {
      color: var(--button-secondary-main);

      &:not(:disabled) {
        &:hover,
        &:focus-visible {
          color: var(--button-secondary-hover-main);
        }
      }
    }

    &.highlight {
      color: var(--button-highlight-main);

      &:not(:disabled) {
        &:hover,
        &:focus-visible {
          color: var(--button-highlight-hover-main);
        }
      }
    }

    &.danger {
      color: var(--button-danger-main);

      &:not(:disabled) {
        &:hover,
        &:focus-visible {
          color: var(--button-danger-hover-main);
        }
      }
    }

    &:disabled {
      color: var(--button-disabled-main);
    }
  }

  &.text {
    padding: 5px;


    &.primary {
      color: var(--button-primary-accent);

      &:not(:disabled) {
        &:hover,
        &:focus-visible {
          color: var(--button-primary-hover-accent);
        }
      }
    }

    &.secondary {
      color: var(--button-secondary-main);

      &:not(:disabled) {
        &:hover,
        &:focus-visible {
          color: var(--button-secondary-hover-main);
        }
      }
    }

    &.highlight {
      color: var(--button-highlight-main);

      &:not(:disabled) {
        &:hover,
        &:focus-visible {
          color: var(--button-highlight-hover-main);
        }
      }
    }

    &.danger {
      color: var(--button-danger-main);

      &:not(:disabled) {
        &:hover,
        &:focus-visible {
          color: var(--button-danger-hover-main);
        }
      }
    }


    &:disabled {
      color: var(--button-disabled-main);
    }
  }

  &.link {
    height: initial;
    padding: 0;
    background: transparent;


    &.inline {
      font-size: unset;
      line-height: unset;
    }

    &.primary {
      color: var(--button-primary-accent);

      &:not(:disabled) {
        &:hover,
        &:focus-visible {
          color: var(--button-primary-hover-accent);
        }
      }
    }

    &.secondary {
      color: var(--button-secondary-main);

      &:not(:disabled) {
        &:hover,
        &:focus-visible {
          color: var(--button-secondary-hover-main);
        }
      }
    }

    &.danger {
      color: var(--button-danger-main);

      &:not(:disabled) {
        &:hover,
        &:focus-visible {
          color: var(--button-danger-hover-main);
        }
      }
    }

    &.highlight {
      color: var(--button-highlight-main);

      &:not(:disabled) {
        &:hover,
        &:focus-visible {
          color: var(--button-highlight-hover-main);
        }
      }
    }


    &:disabled {
      color: var(--button-disabled-main);
      opacity: 1;
    }
  }

  &.unstyled {
    height: initial;
    padding: 0;
  }

  &:disabled {
    pointer-events: none;
    cursor: default;
  }
}
</style>
