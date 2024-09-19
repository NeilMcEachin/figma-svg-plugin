<template>
	<div class="label">{{ type }}:</div>
	<div class="variable-swapper">

		<div class="pill">{{ currentVariable?.name }}</div>
		<StyledButton label="Swap With" @click="swapVariable('next', replacementVariableId)" :disabled="!replacementVariableId"/>
		<StyledDropdown v-model="replacementVariableId" :options="variableOptions" valueProp="id" trackBy="name" label="name" placeholder="Select a variable to swap with" searchable variant="outlined" :searchFilter="searchFilter" />
	</div>
</template>

<script setup>
import  StyledButton  from '@/components/StyledButton.vue';
import  StyledDropdown  from '@/components/StyledDropdown.vue';
import {ref} from 'vue';
defineProps({
	type: {
		type: String,
		default: 'fill'
	},
	currentVariable: Object,
	variableOptions: Array
});
const replacementVariableId = ref(null);

const searchFilter = (option, query) => {
	return query.trim().split(/[ /-]+/).every(word => option.name.includes(word));
}
</script>

<style lang="scss" scoped>

	.label{
		margin-bottom: 5px;
	}
.variable-swapper{
	display: flex;
	align-items: center;
	gap: 5px;


	.pill{
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
		color: #fff;
    background-color: #383838;
    border-radius: 4px;
		border: 1px solid #444;
    padding: 0 5px;
		font-size: 11px;
		height: 30px;
		width: 200px;
	}

	.styled-button{
		padding: 5px;
		flex-shrink: 0;
		height: auto;
		font-size: 11px;
		height: 30px;
		border-radius: 4px;
	}
	.styled-dropdown{
		--ms-font-size: 11px;
		--dropdown-bg: #383838;
		--dropdown-placeholder-fg: #fff;
		--dropdown-border-fg: #444;
		--dropdown-fg: #fff;
		--dropdown-option-fg: #000;
		--dropdown-radius: 4px;
		min-height: auto;
		height: 30px;
	}
}
</style>