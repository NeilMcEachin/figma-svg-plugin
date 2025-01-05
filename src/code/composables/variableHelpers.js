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
