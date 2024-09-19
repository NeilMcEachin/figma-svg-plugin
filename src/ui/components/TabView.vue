<template>
	<div>
		<div class="tabs">
			<div class="tab-buttons">
				<StyledButton v-for="tab in tabs" class="tab" :class="`tab-${tab}`" variant="text" @click="setActiveTab(tab)">{{ tab }}</StyledButton>
			</div>
			<div class="tab-slider">
				<div class="tab-marker" :style="{left: `${activeTabPos}px`}"></div>
			</div>
		</div>
		<div class="tab-view">
			<div v-for="tab in tabs" :key="tab" v-show="activeTab === tab" >
				<slot :name="tab"></slot>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref } from 'vue';
import StyledButton from '@/components/StyledButton.vue';
const props = defineProps({
	tabs: Array
})
const activeTab = ref(props.tabs[0] || null);
const activeTabPos = ref(0);

function getStyle(oElm, strCssRule){
    var strValue = "";
    if(document.defaultView && document.defaultView.getComputedStyle){
        strValue = document.defaultView.getComputedStyle(oElm, "");
				if(strCssRule){
					strValue = strValue.getPropertyValue(strCssRule);
				}
    }
    else if(oElm.currentStyle){
        strCssRule = strCssRule.replace(/\-(\w)/g, function (strMatch, p1){
            return p1.toUpperCase();
        });
        strValue = oElm.currentStyle[strCssRule];
    }
    return strValue;
}

function setActiveTab(tab){
	activeTab.value = tab;
	console.log(tab);
	let target = document.querySelector(`.tab-${tab}`);
	activeTabPos.value = target.getBoundingClientRect().x;
	
	
	// console.log(getStyle(e.target).margin);

}
</script>

<style lang="scss" scoped>
.tabs{

	.tab{
		margin: 0 10px;
	}
	.tab-buttons{
		width: 100%;
		display: flex;
	}
	.tab-slider{
		width: 100%;
	}
	.tab-marker{
		// position: absolute;
		// top: 100%;
		height: 5px;
		width: 80px;
		background-color: #fff;
	}
}
</style>