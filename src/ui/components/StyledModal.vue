<template>
  <GModal
    v-bind="{ ...$attrs, ...$props }"
    class="styled-modal"
    ref="modalRef"
    @keydown.esc.stop="$emit('close')"
    @close="$emit('close')"
  >
    <template v-slot:footer>
      <slot name="footer">
        <div class="modal-footer">
          <StyledButton label="Cancel" variant="text" @click="$emit('close')" />
          <StyledButton
            label="Confirm"
            :disabled="disabled"
            @click="$emit('confirm')"
          />
        </div>
      </slot>
    </template>
    <template v-for="(_, name) in $slots" v-slot:[name]="slotData">
      <slot :name="name" v-bind="slotData" />
    </template>

    <!-- Default footer if none provided -->
    <!--  -->
  </GModal>
</template>

<script setup>
import { GModal } from '@twentyfourg/grimoire'
import StyledButton from './StyledButton.vue'
import { ref, watch, nextTick } from 'vue'

const modalRef = ref(null)
const props = defineProps({
  ...GModal.props,
  disabled: {
    type: Boolean,
    default: false,
  },
  inline: {
    type: Boolean,
    default: false,
  },
})

watch(() => props.show, async (newValue) => {
  if (newValue) {
    await nextTick()
    modalRef.value?.$el?.focus()
  }
})

defineEmits(['close', 'update:modelValue', 'confirm'])
</script>

<script>
export default {
  inheritAttrs: false,
}
</script>

<style lang="scss" scoped>
.styled-modal {
  position: fixed;

  &.overlay {
    background-color: var(--modal-overlay-bg);
  }

  :deep() {
    > .content {
      display: flex;
      flex-direction: column;
      width: 450px;
      padding: 35px;
      color: var(--modal-card-fg);
      text-align: center;
      background-color: var(--modal-card-bg);
      border: 1px solid var(--modal-card-fg);
      box-shadow: var(--shadow-2);

      > * {
        width: 100%;
      }
    }

    .content-body {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
      text-align: left;
    }

    .icon-container {
      margin-bottom: 1rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 24px;
      padding-top: 24px;
    }
  }
}
</style>
