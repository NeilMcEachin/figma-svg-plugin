// Import sample module
import * as fs from 'fs';
import {rgbToHex} from './utils.js';
import cssVarMap from './final-map.json';
import variableGroups from './variables.js';

// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (see documentation).

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 600, height: 600, themeColors: true, /* other options */ });
figma.clientStorage.getAsync('size').then(size => {
  if(size) figma.ui.resize(size.w,size.h);
}).catch(err=>{});

// figma.on('stylechange', async () => {
//   console.log('hello');
  
// })

async function getAllVariables(){
  const localVariables = await figma.variables.getLocalVariablesAsync();
  const filteredVariables = localVariables.filter(v => v.variableCollectionId === 'VariableCollectionId:3432:16828').map(c => ({id: c.id, name: c.name}));
  figma.ui.postMessage({ type: 'localVariablesUpdated', variables: filteredVariables });
  return localVariables;
}

// getAllVariables();



async function exportToJSON() {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const files = [];
  for (const collection of collections) {
    files.push(...(await processCollection(collection)));
  }
  // figma.ui.postMessage({ type: "EXPORT_RESULT", files });
  // console.log(files);
  
}

async function getCollections(){
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  figma.ui.postMessage({ type: 'collectionsUpdated', collections: collections.map(c => ({id: c.id, name: c.name, modes: [...c.modes]})) });
  
}
getCollections();


async function processCollection({ name, modes, variableIds }) {
  const files = [];
  // for (const mode of modes) {
  const mode = modes[0];
  const file = { fileName: `${name}.${mode.name}.tokens.json`, body: {} };
  for (const variableId of variableIds) {
    const { name, resolvedType, valuesByMode } = await figma.variables.getVariableByIdAsync(variableId);
    const value = valuesByMode[mode.modeId];
    // console.log(name.split('/').pop(), resolvedType);
    console.log(name);
    
    
    // if (value !== undefined && ["COLOR", "FLOAT"].includes(resolvedType)) {
    //   let obj = file.body;
    //   name.split("/").forEach((groupName) => {
    //     obj[groupName] = obj[groupName] || {};
    //     obj = obj[groupName];
    //   });
    //   obj.$type = resolvedType === "COLOR" ? "color" : "number";
    //   if (value.type === "VARIABLE_ALIAS") {
    //     const currentVar = await figma.variables.getVariableByIdAsync(
    //       value.id
    //     );
    //     obj.$value = `{${currentVar.name.replace(/\//g, ".")}}`;
    //   } else {
    //     obj.$value = resolvedType === "COLOR" ? rgbToHex(value) : value;
    //   }
    // }
  }
  files.push(file);
  // }
  return files;
}

const paintStyles = figma.getLocalPaintStyles();
// console.log(paintStyles);

function createLinearCollection(){
  const collection = figma.variables.createVariableCollection('Linear Collection w/o --');
  const cssVarNames = Object.keys(cssVarMap);
  cssVarNames.forEach(name => {
    const newName = name.slice(`--`.length)
        try{
          const colorVariable = figma.variables.createVariable(`${newName}`, collection, "COLOR");
          colorVariable.setValueForMode(collection.modes[0].modeId, {r: 1, g: 1, b: 1, a: 1});
        } catch(e){
          console.log(`${newName}`,e);
        }
  })
}
function createSuperNestedCollection(){
  const collection = figma.variables.createVariableCollection('Super Nested Collection');
  const cssVarNames = Object.keys(cssVarMap);
  cssVarNames.forEach(name => {
    const newName = name.slice(`--`.length).replaceAll('-','/');
        try{
          const colorVariable = figma.variables.createVariable(`${newName}`, collection, "COLOR");
          colorVariable.setValueForMode(collection.modes[0].modeId, {r: 1, g: 1, b: 1, a: 1});
        } catch(e){
          console.log(`${newName}`,e);
        }
  })
}
function createNestedCollection(){
  // I'll give it a list of all variables names as keys in css var format
  // and I'll give it an array of each variable group that should exist in figma or does in lxp variables
  // loop through list of array check for keys that have that name and create a variable for each key in that group
  // I have to make sure I don't match words that have the start of a word in them. for example
  // classroom would match --classroom and --classroom-card. 
  // I need to check if there is a my version again version that include mine in them and confirm they don't get in the way
  const newMap = {};
  const collection = figma.variables.createVariableCollection('Nested Collection');
  const cssVarNames = Object.keys(cssVarMap);
  variableGroups.forEach(group => {
    // get list of groups that include this groups name
    const listOfSimilarNames = variableGroups.filter(varGroup => {
      return varGroup.startsWith(group) && varGroup !== group;
    })
    cssVarNames.forEach(name => {
      
      if(name.startsWith(`--${group}`) && !listOfSimilarNames.some(similarName => name.startsWith(`--${similarName}`))){
        const newName = name.slice(`--${group}-`.length);
        if(!newMap[group]){
          newMap[group] = {};
        }
        newMap[group][newName] = {r: 1, g: 1, b: 1, a: 1};
        try{
          const colorVariable = figma.variables.createVariable(`${group}/${newName}`, collection, "COLOR");
          colorVariable.setValueForMode(collection.modes[0].modeId, newMap[group][newName]);
        } catch(e){
          console.log(`${group}/${newName}`,e);
        }
      }
    })
  })


  // console.log(newMap);
  

}
async function getVariable(id){
  const variables = await getAllVariables();
  return variables.find(variable => variable.id === id);
}
async function getSelection() {
  const selectedNodes = figma.currentPage.selection;
  console.log(selectedNodes[0]);
  
  if(selectedNodes.length){
    const node = selectedNodes[0];
    if(!node) return;
    let nodeObject = {id: node.id};
    if(node.fills?.length){
      const fill = node.fills[0];
      if(fill.boundVariables?.color){
        const variable = await getVariable(fill.boundVariables.color.id); 
        nodeObject.fill = {id: variable.id, name: variable.name};
      }
    }
    if(node.strokes?.length){
      const stroke = node.strokes[0];
      if(stroke.boundVariables?.color){
        const variable = await getVariable(stroke.boundVariables.color.id); 
        // console.log(variable);
        nodeObject.stroke = {id: variable.id, name: variable.name};

      }
    }
    // console.log(nodeObject);
    figma.ui.postMessage({type: 'selectionUpdated', node: JSON.stringify(nodeObject) });
  }
  
}
if(figma.currentPage.selection.length) getSelection();


// async function addPluginData(data){
//   const node = figma.currentPage.selection[0];
//   node.setPluginData('test', JSON.stringify(data));
// }


figma.on('selectionchange', async () => {
  getSelection();
})

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = async (msg) => {

  // if (msg.type === 'getSelection') {
  //   figma.ui.postMessage({ type: 'updateSelection', svgs: await getSelection() })
  // }

  // if (msg.type === 'sendOptimize') {
  //   svgOptimize = JSON.parse(msg.data);

  //   // figma.ui.postMessage({ type: 'save-file', svg: msg.data });
  // }

  if (msg.type === "cancel") {
    figma.closePlugin();
  }

  
  // if (msg.type === 'organize-selection') {
  //   sortInGrid(figma.currentPage.selection, msg.config);
  // }

  // if (msg.type === 'export-iconify-set'){
    // createIconSet(msg.svgs);
  // }

  if(msg.type === 'getVariables'){
    // const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
    // figma.ui.postMessage({ type: 'log', message: 'hello!'})
    // console.log(localCollections);
    exportToJSON();
    
  }

  if(msg.type === 'refreshCollections'){
    getCollections();
  }
  if(msg.type === 'getStyles'){
    const styles = await figma.getLocalPaintStylesAsync();
    console.log(styles);
    
  }
  if(msg.type === 'setValueForVariable'){
    // console.log(msg.payload);
    const sourceVariable = figma.variables.getVariableById(msg.payload.currentVariableId);
    const targetVariable = figma.variables.getVariableById(msg.payload.replacementVariableId);

    console.log(sourceVariable);
    const alias = figma.variables.createVariableAlias(sourceVariable);
    
    targetVariable.setValueForMode(msg.payload.modeId, alias);
    // console.log(sourceVariable, targetVariable);
  }
  if(msg.type === 'swapVariable'){
    const {attribute, variableId} = JSON.parse(msg.payload);
    const replacementVariable = figma.variables.getVariableById(variableId);
    console.log(replacementVariable);
    // Fills and strokes must be set via their immutable arrays
    const node = figma.currentPage.selection[0];
    if(attribute === 'fill'){
      let fillsCopy = JSON.parse(JSON.stringify(node.fills));
      fillsCopy[0] = figma.variables.setBoundVariableForPaint(fillsCopy[0], 'color', replacementVariable)
      node.fills = fillsCopy
    }
    if(attribute === 'stroke'){
      let strokesCopy = JSON.parse(JSON.stringify(node.strokes));
      strokesCopy[0] = figma.variables.setBoundVariableForPaint(strokesCopy[0], 'color', replacementVariable)
      node.strokes = strokesCopy
    }
    // figma.currentPage.selection[0].setBoundVariable(attribute, replacementVariable);
  }
  if(msg.type === 'createLinearCollection'){
    createLinearCollection();
  }
  if(msg.type === 'createNestedCollection'){
    createNestedCollection();
  }
  if(msg.type === 'createSuperNestedCollection'){
    createSuperNestedCollection();
  }
  if(msg.type === 'addPluginData'){
    addPluginData(msg.data);
  }
  if(msg.type === 'resize'){
    figma.ui.resize(msg.size.w,msg.size.h);      
    figma.clientStorage.setAsync('size', msg.size).catch(err=>{});// save size
  }



  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
};
