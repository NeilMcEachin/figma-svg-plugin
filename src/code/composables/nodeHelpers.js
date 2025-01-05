// Get full name of node by looping through parents until document
export function getFullName(node) {
  if (!node) return ''
  let name = `${node.type}:${node.name}`
  let parentNode = node.parent

  while (parentNode && parentNode.type && parentNode.type !== 'DOCUMENT') {
    // Avoid adding things like Frame 1111 etc to the name
    name = `${parentNode.type}:${parentNode.name} / ${name}`
    parentNode = parentNode.parent
  }

  return name
}

export function depthFirstSearch(node, callback) {
  callback(node)

  if (node.children) {
    node.children.forEach((child) => {
      depthFirstSearch(child, callback)
    })
  }
}


export async function setNodeAttributeToVariable(node, attributeName, variableId) {
  const variable = await figma.variables.getVariableByIdAsync(variableId)
  const nodeAttributeCopy = JSON.parse(JSON.stringify(node[attributeName]))
  // console.log(nodeAttributeCopy)
  nodeAttributeCopy[0] = figma.variables.setBoundVariableForPaint(
    nodeAttributeCopy[0],
    'color',
    variable
  )
  node[attributeName] = nodeAttributeCopy
}
