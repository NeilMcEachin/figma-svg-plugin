<style>
 #corner{
   position: absolute;
   right: 1px;
   bottom: 2px;
   cursor: nwse-resize;
 }
</style>
<template>
  <svg id="corner" ref="corner" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0V16H0L16 0Z" fill="white"/>
    <path d="M6.22577 16H3L16 3V6.22576L6.22577 16Z" fill="#8C8C8C"/>
    <path d="M11.8602 16H8.63441L16 8.63441V11.8602L11.8602 16Z" fill="#8C8C8C"/>
  </svg>
</template>
<script async setup>
	import { ref } from 'vue';
  const corner = ref(null);
	console.log(corner);
	

  function resizeWindow(e) {
    const size = {
      w: Math.max(50,Math.floor(e.clientX+5)),
      h: Math.max(50,Math.floor(e.clientY+5))
    };
		console.log(size);
		
    parent.postMessage( { pluginMessage: { type: 'resize', size: size }}, '*');
  }

	// console.log(corner);
	
  corner.onpointerdown = (e)=>{
    corner.onpointermove = resizeWindow;
    corner.setPointerCapture(e.pointerId);
  };
  corner.onpointerup = (e)=>{
    corner.onpointermove = null;
    corner.releasePointerCapture(e.pointerId);
  };
</script>