import { assignAliasToVariable, setRawValuesFromReplacementForVariable, copyVariables } from './variableHelpers.js'
import { getNodesWithBoundVariables, getCollectionVariables } from './variableData.js'
import { setNodeAttributeToVariable } from './nodeHelpers.js'
export default async function main(msg){
    if(msg.type === 'assignAliasToVariable'){
        const { variableIds, aliasVariableId } = JSON.parse(msg.payload)
        for (const variableId of variableIds) {
            await assignAliasToVariable(variableId, aliasVariableId)
        }
        figma.commitUndo()
    }
    if(msg.type === 'assignRawValuesToVariable'){
        const { variableIds, replacementVariableId } = JSON.parse(msg.payload)
        for (const variableId of variableIds) {
            await setRawValuesFromReplacementForVariable(variableId, replacementVariableId)
        }
        figma.commitUndo()
    }
    if(msg.type === 'copyVariables'){
        const { variables, targetPathPrefix } = JSON.parse(msg.payload)
        
        // Get the collection ID from the first variable (assuming all variables are from the same collection)
        if (variables.length > 0) {
            // Need to get the actual variable to find its collection ID
            const firstActualVariable = await figma.variables.getVariableByIdAsync(variables[0].id)
            const collectionId = firstActualVariable.variableCollectionId
            
            await copyVariables(variables, targetPathPrefix, collectionId)
            figma.commitUndo()
        }
    }
    if(msg.type === 'scanFrameVariables'){
        const { target, includeImages = false, includeInstanceNodes = false } = JSON.parse(msg.payload)
        let nodesToScan = []
        
        // If no target specified, or target is 'selection', try selection first
        if (!target || target === 'selection') {
            if (figma.currentPage.selection.length > 0) {
                nodesToScan = figma.currentPage.selection
            } else {
                // Fallback to current page if no selection
                nodesToScan = [figma.currentPage]
            }
        } else if (target === 'page') {
            nodesToScan = [figma.currentPage]
        }
        
        if (nodesToScan.length === 0) {
            figma.ui.postMessage({
                type: 'returnFrameVariables',
                payload: JSON.stringify([])
            })
            return
        }
        
        let allBoundVariables = []
        for (const node of nodesToScan) {
            const boundVars = await getNodesWithBoundVariables(
                node,
                (name) => name.startsWith('component/'), // Only scan component variables
                includeImages,
                includeInstanceNodes
            )
            allBoundVariables = allBoundVariables.concat(boundVars)
        }
        
        figma.ui.postMessage({
            type: 'returnFrameVariables',
            payload: JSON.stringify(allBoundVariables)
        })
    }
    if(msg.type === 'remapFrameVariables'){
        const { remappings } = JSON.parse(msg.payload)
        
        // Get all available variables to find the target variable IDs
        const collections = await figma.variables.getLocalVariableCollectionsAsync()
        let allVariables = []
        for (const collection of collections) {
            const collectionVars = await getCollectionVariables(collection.id)
            allVariables = allVariables.concat(collectionVars)
        }
        
        // Create a map of variable names to IDs for quick lookup
        const variableNameToId = new Map()
        allVariables.forEach(variable => {
            variableNameToId.set(variable.name, variable.id)
        })
        
        let remappedCount = 0
        
        // Process each remapping
        for (const remapping of remappings) {
            try {
                const targetVariableId = variableNameToId.get(remapping.newVariableName)
                
                if (targetVariableId) {
                    // Get the node and update its variable binding
                    const node = await figma.getNodeByIdAsync(remapping.nodeId)
                    if (node) {
                        await setNodeAttributeToVariable(node, remapping.attributeName, targetVariableId)
                        remappedCount++
                    }
                } else {
                    console.warn(`Target variable not found: ${remapping.newVariableName}`)
                }
            } catch (error) {
                console.error(`Failed to remap variable for node ${remapping.nodeId}:`, error)
            }
        }
        
        console.log(`Remapped ${remappedCount} of ${remappings.length} variable bindings`)
        
        figma.ui.postMessage({
            type: 'frameVariablesRemapped',
            payload: JSON.stringify({ remappedCount, totalCount: remappings.length })
        })
        
        if (remappedCount > 0) {
            figma.commitUndo()
        }
    }
    if(msg.type === 'remapFrameVariablesToTarget'){
        const { remappings } = JSON.parse(msg.payload)
        
        let remappedCount = 0
        
        // Process each remapping - these use direct variable IDs
        for (const remapping of remappings) {
            try {
                // Get the node and update its variable binding
                const node = await figma.getNodeByIdAsync(remapping.nodeId)
                if (node) {
                    await setNodeAttributeToVariable(node, remapping.attributeName, remapping.newVariableId)
                    remappedCount++
                }
            } catch (error) {
                console.error(`Failed to remap variable for node ${remapping.nodeId}:`, error)
            }
        }
        
        console.log(`Remapped ${remappedCount} of ${remappings.length} variable bindings`)
        
        figma.ui.postMessage({
            type: 'frameVariablesRemapped',
            payload: JSON.stringify({ remappedCount, totalCount: remappings.length })
        })
        
        if (remappedCount > 0) {
            figma.commitUndo()
        }
    }
}