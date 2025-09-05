import { getModes } from './collectionHelpers'
export async function assignAliasToVariable(variableId, aliasVariableId) {
  const alias = await figma.variables.createVariableAliasByIdAsync(aliasVariableId)
  const variable = await figma.variables.getVariableByIdAsync(variableId)

  for (const modeId of Object.keys(variable.valuesByMode)) {
    variable.setValueForMode(modeId, alias)
  }
}

export async function getRawValue(currentValue, modeId) {
  let rawValue = currentValue

  // Keep grabbing value from alias until we get a raw value
  while (rawValue.type && rawValue.type === 'VARIABLE_ALIAS') {
    const variable = await figma.variables.getVariableByIdAsync(rawValue.id)

    if (variable.valuesByMode[modeId]) {
      rawValue = variable.valuesByMode[modeId]
    } else {
      rawValue = Object.values(variable.valuesByMode)[0]
    }
  }

  return rawValue
}

// Assumes from same collection
export async function setRawValuesFromReplacementForVariable(
  variableId,
  replacementVariableId,
) {
  const variable = await figma.variables.getVariableByIdAsync(variableId)
  const modes = await getModes(variable.variableCollectionId)
  const replacementVariable = await figma.variables.getVariableByIdAsync(replacementVariableId)

  // if there is a bound variable. Grab raw value for each mode
  for (const mode of modes) {
    const modeId = mode.modeId;
    const rawValue = await getRawValue(replacementVariable.valuesByMode[modeId], modeId)

    // Assign raw value to variable for each mode
    variable.setValueForMode(modeId, rawValue)
  }
}

export async function copyVariables(variables, targetPathPrefix, collectionId) {
  const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId)
  const createdVariables = []
  
  // Helper function to transform variable name
  const transformVariableName = (originalName, targetPrefix) => {
    const parts = originalName.split('/')
    if (parts.length >= 2) {
      // For paths like "component/button/primary-bg"
      // Replace first part with target prefix: "component/login/button/primary-bg"
      const remainingPath = parts.slice(1).join('/')
      return `${targetPrefix}/${remainingPath}`
    } else {
      // For simple names, just prepend target prefix
      return `${targetPrefix}/${originalName}`
    }
  }

  // Create variables and set them as aliases to the original variables
  for (const sourceVar of variables) {
    const newName = transformVariableName(sourceVar.name, targetPathPrefix)
    
    try {
      const newVariable = figma.variables.createVariable(
        newName,
        collection.id,
        sourceVar.resolvedType
      )
      
      createdVariables.push(newVariable)
      
      // Always create alias to the original variable for each mode
      for (const mode of collection.modes) {
        const modeId = mode.modeId
        const sourceValue = sourceVar.valuesByMode[modeId]
        
        if (sourceValue !== undefined) {
          // Always alias to the source variable, regardless of whether it's already an alias
          newVariable.setValueForMode(modeId, {
            type: 'VARIABLE_ALIAS',
            id: sourceVar.id
          })
        }
      }
    } catch (error) {
      console.error(`Failed to create variable ${newName}:`, error)
    }
  }
  
  return createdVariables
}
