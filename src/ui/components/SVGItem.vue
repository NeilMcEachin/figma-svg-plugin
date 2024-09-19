<template>
	<div class="svg-item">
		<div class="name">
			{{ name }}.svg
		</div>
		<div class="icon" v-html="data"></div>
		<StyledButton label="Export" variant="outline" @click="$emit('exportSVG')" />
		<StyledButton label="Copy" variant="outline" @click="$emit('copySVG')" />
	</div>
</template>

<script setup>
import StyledButton from '@/components/StyledButton.vue';
defineProps({
	name: String,
	data: String
});
</script>

<style lang="scss" scoped>
	.svg-item{
		display: flex;
		align-items: center;
		.name{
			margin-right: 20px;
		}

		.icon{
			margin-left: auto;
			width: 40px;
			flex-shrink: 0;

			:deep(svg){
				width: 100%;
				height: 100%;
			}
		}

		.g-button{
			margin-left: 10px;
		}
	}
</style>