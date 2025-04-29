import { getFullName, depthFirstSearch } from './nodeHelpers'
import { getModes } from './collectionHelpers'

export async function getVariables() {
  const variables = await figma.variables.getLocalVariablesAsync()
  return variables
}

export async function getRawValue(currentValue, mode, modeMap) {
  let rawValue = currentValue
  // console.log(rawValue);

  while (rawValue.type && rawValue.type === 'VARIABLE_ALIAS') {
    const variable = await figma.variables.getVariableByIdAsync(rawValue.id)
    const vModes = await getModes(variable.variableCollectionId)

    const mappedMode = vModes.find(
      (m) => modeMap && m.name === modeMap[mode.name]
    )
    // console.log(mappedMode);

    if (variable.valuesByMode[mode.modeId]) {
      rawValue = variable.valuesByMode[mode.modeId]
    } else if (mappedMode && variable.valuesByMode[mappedMode.modeId]) {
      rawValue = variable.valuesByMode[mappedMode.modeId]
    } else {
      rawValue = Object.values(variable.valuesByMode)[0]
    }
    // if(variable.name.startsWith('core/') || variable.name.startsWith('component/')){
    //   break;
    // }
  }

  return rawValue
}

export async function setRawValuesForVariable(
  variableId,
  attributeValue,
  modeMap
) {
  const variable = await figma.variables.getVariableByIdAsync(variableId)
  const modes = await getModes(variable.variableCollectionId)

  // if there is a bound variable. Grab raw value for each mode
  for (const mode of modes) {
    const rawValue = await getRawValue(attributeValue, mode, modeMap)
    // console.log(rawValue)

    // Assign raw value to variable for each mode
    variable.setValueForMode(mode.modeId, rawValue)
  }
}

export async function getFilteredVariables(node) {
  const allVariables = await getVariables()
  return allVariables.filter(
    (variable) =>
      variable.name.startsWith('core/') ||
      variable.name.startsWith('component/')
  )
}

export async function getCollectionVariables(collectionId) {
  // console.log(collectionId);

  const variables = await getVariables()
  // console.log(variables);

  const filteredVariables = variables
    .filter((v) => v.variableCollectionId === collectionId)
    .map((v) => ({
      name: v.name,
      id: v.id,
      valuesByMode: v.valuesByMode,
      resolvedType: v.resolvedType,
    }))

  return filteredVariables
}

async function getBoundVariables(
  node,
  condition = () => true,
  includeImage = true
) {
  const variables = []
  // console.log(node);

  const boundVariableKeys = Object.keys(node?.boundVariables || {})
  // console.log(node);

  for (const key of boundVariableKeys) {
    const boundVars = Array.isArray(node.boundVariables?.[key])
      ? node.boundVariables[key]
      : [node.boundVariables?.[key]]
    // console.log(boundVars)

    if (!boundVars) continue
    try {
      for (const element of boundVars) {
        const variable = await figma.variables.getVariableByIdAsync(element.id)
        // console.log(variable)

        // console.log(condition);

        if (condition(variable.name, variable)) {
          let imageData = null
          if (includeImage) {
            const bytes = await node.exportAsync({
              format: 'PNG',
              constraint: { type: 'SCALE', value: 2 },
            })
            imageData = figma.base64Encode(bytes)
          }
          const attributes = {}
          attributes[key] = node[key]
          // console.log(node[key], key)

          variables.push({
            name: getFullName(node),
            id: node.id,
            variable: {
              name: variable.name,
              id: variable.id,
              valuesByMode: variable.valuesByMode,
            },
            attributes,
            imageData,
            type: key,
          })
        }
      }
    } catch (e) {
      console.log(`error with ${node.id}:${node.name}: ${JSON.stringify(boundVars)}`)
    }
  }

  return variables
}

async function nodeHasFillOrStroke(node) {
  const variables = []
  const boundVariableKeys = ['fills', 'strokes']

  for (const key of boundVariableKeys) {
    if (node[key] && node[key].length) {
      return true
    }
  }

  return false
}

export async function getNodesWithBoundVariables(
  node,
  condition,
  includeImage,
  includeInstanceNodes = false
) {
  let nodesWithBoundVariables = []

  // if has key visible and is false, return empty array
  if ('visible' in node && !node.visible) return []

  const variables = await getBoundVariables(node, condition, includeImage)
  if (variables.length) {
    nodesWithBoundVariables.push(...variables)
  }

  if (node.children) {
    await Promise.all(
      node.children.map(async (child) => {
        if (child.type !== 'INSTANCE' || includeInstanceNodes) {
          const childVariables = await getNodesWithBoundVariables(
            child,
            condition,
            includeImage,
            includeInstanceNodes
          )
          nodesWithBoundVariables =
            nodesWithBoundVariables.concat(childVariables)
        }
      })
    )
  }

  return nodesWithBoundVariables
}

export function createVariableNodeMap(nodes) {
  const variableNodeMap = {}

  nodes.forEach((node) => {
    if (node.variables.fills) {
      node.variables.fills.forEach((fill) => {
        if (fill.id) {
          if (!variableNodeMap[fill.id]) {
            variableNodeMap[fill.id] = []
          }
          variableNodeMap[fill.id].push(node)
        }
      })
    }
    if (node.variables.strokes) {
      node.variables.strokes.forEach((stroke) => {
        if (stroke.id) {
          if (!variableNodeMap[stroke.id]) {
            variableNodeMap[stroke.id] = []
          }
          variableNodeMap[stroke.id].push(node)
        }
      })
    }
  })

  return variableNodeMap
}

export async function getNodeTree(node) {
  let nodes = []
  if (node.name.startsWith('--')) {
    nodes.push(node)
  }

  if (node.children) {
    await Promise.all(
      node.children.map(async (child) => {
        if (child.type !== 'INSTANCE') {
          const childNode = await getNodeTree(child)
          nodes = nodes.concat(childNode)
        }
      })
    )
  }

  return nodes
}
