import {
  getVariables,
  getCollectionVariables,
  getRawValue,
} from './variableData'
import { figmaRGBToHex } from './convertColor.ts'
function sortVariables(items) {
  items.sort((a, b) => {
    // First, sort by whether it's 'core/' or 'component'
    if (a.name.startsWith('core/') && b.name.startsWith('component/')) {
      return -1
    }
    if (a.name.startsWith('component/') && b.name.startsWith('core/')) {
      return 1
    }
    // If both are 'core/' or both are 'component', sort alphabetically
    return a.name.localeCompare(b.name)
  })
}

export async function exportVariablestoSCSS(id, modeMap) {
  const collection = await figma.variables.getVariableCollectionByIdAsync(id)
  const modes = collection.modes
  let collectionVariables = await getCollectionVariables(id)
  collectionVariables = collectionVariables.filter(v => v.name.startsWith('core/') || v.name.startsWith('component/'))
  sortVariables(collectionVariables)
  let variableConfig = ''

  for (const mode of modes) {
    variableConfig += `[data-theme='is${mode.name}Mode'] {\n`
    for (const variable of collectionVariables) {
      let color = variable.valuesByMode[mode.modeId]

      color = await getRawValue(color, mode, modeMap)

      if (typeof color === 'number' && variable.name.includes('radius')) {
        color = `${color}px`
      } else if (
        typeof color === 'object' &&
        'r' in color &&
        'g' in color &&
        'b' in color
      ) {
        color = figmaRGBToHex(color)
      }
      // console.log(color)

      console.log(variable.name.split('/'))

      const name = `--${variable.name.split('/').slice(1).join('-')}`
      variableConfig += `${name}: ${color};\n`
    }
    variableConfig += `}\n\n`
  }

  return variableConfig
}
