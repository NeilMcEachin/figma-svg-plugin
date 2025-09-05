import nodes from '../data/mappedNodes.json'
import variables from '../data/variableSet.json'
import modeMap from '../data/mappedVariableModes.json'
import {
  getCollectionVariables,
  setRawValuesForVariable,
} from './variableData.js'
import { setNodeAttributeToVariable } from './nodeHelpers.js'
import { getModes } from './collectionHelpers.js'

export async function migrateNodeVariables(collectionId) {
  const variables = await getCollectionVariables(collectionId)
  for (const node of nodes) {
		try{

			if (node.variable) {
				const boundVariableName = node.variable.name
				const variable = variables.find((v) => v.name === boundVariableName)
				const figmaNode = await figma.getNodeByIdAsync(node.id)
				if(!figmaNode){
					console.log(figmaNode)
					console.log(node);
				}
				// console.log(figmaNode);
				
				// setNodeAttributeToVariable(figmaNode, node.type, variable.id)
				// console.log(variable);
				
			}
		}
		catch(e){
			console.log(node)
			console.log(e)
		}
  }
  // console.log(nodes)
}

function getMappedModeId(modes, modeName) {
  const mode = modeMap.find((m) => m.name === modeName)
  // console.log(mode);

  return mode.modeId
}

const sortFunction = (a, b) => {
  // Check if the object has VARIABLE_ALIAS in valuesByMode
  const isAliasA = Object.values(a.valuesByMode).some(
    (value) => value.type === 'VARIABLE_ALIAS'
  )
  const isAliasB = Object.values(b.valuesByMode).some(
    (value) => value.type === 'VARIABLE_ALIAS'
  )

  // Sort objects with VARIABLE_ALIAS towards the bottom
  if (isAliasA && !isAliasB) return 1
  if (!isAliasA && isAliasB) return -1

  // Sort names starting with core/ above others
  const startsWithCoreA = a.name.startsWith('core/')
  const startsWithCoreB = b.name.startsWith('core/')

  if (startsWithCoreA && !startsWithCoreB) return -1
  if (!startsWithCoreA && startsWithCoreB) return 1

  // If all else is equal, sort alphabetically by name
  return a.name.localeCompare(b.name)
}

export async function createVariableSet(collectionId) {
  const newVariablesList = await getCollectionVariables(collectionId)
  const oldVariables = variables.slice().sort(sortFunction)

  const modes = await getModes(collectionId)
  for (const oldVariable of oldVariables) {
    const newVariable = figma.variables.createVariable(
      oldVariable.name,
      collectionId,
      oldVariable.resolvedType
    )
    newVariablesList.push(newVariable)
    for (const mode of modes) {
			const value = oldVariable.valuesByMode[getMappedModeId(modes, mode.name)]
      try {
        if (value.type && value.type === 'VARIABLE_ALIAS') {
          // Get the old variable name for the old alias list that matches the value id
          const oldVariableName = variables.find((v) => v.id === value.id).name
          // find the new variable with the same name
          const newV = newVariablesList.find((v) => v.name === oldVariableName)
          value.id = newV.id
        }
        newVariable.setValueForMode(mode.modeId, value)
      } catch (e) {
        console.log(oldVariable.name)
        console.log(value)
        console.log(e)
        console.log('will try again')
        oldVariables.push(oldVariable)
      }
    }
  }
}

export async function variableCheck() {
  const collectionId = 'VariableCollectionId:3410:21870'
  const nodes = await getCollectionVariables(collectionId)
  const modeMap = {
    'Drive--dark': 'Drive Base',
    'Drive--light': 'Light Mode',
    'Cadi--dark': 'Cadillac test',
  }
  // console.log(nodes);

  for (const node of nodes) {
    if (node.valuesByMode) {
      for (const value of Object.values(node.valuesByMode)) {
        if (value.type && value.type === 'VARIABLE_ALIAS' && value.id) {
          const variable = await figma.variables.getVariableByIdAsync(value.id)
          if (
            !variable.name.startsWith('core/') &&
            !variable.name.startsWith('component/')
          ) {
            console.log(`variable: ${node.name}, alias: ${variable.name}`)
            // console.log(`variable: ${node.id}, alias: ${value.id}`);

            // await setRawValuesForVariable(node.id, value, modeMap)
          }
        }
      }
    }
  }
  // console.log(variables);
}
