function splitName(name) {
  return name.split(/[-|/]/)
}
export const deleteVariables = async (varsToDelete, boundVariables) => {
  const variables = await figma.variables.getLocalVariablesAsync()
  const filteredVariables = variables.filter(
    (variable) =>
      variable.name.startsWith('core/') ||
      variable.name.startsWith('component/')
  )
  // console.log(variables)
	const stubbornVars = {}
  for (const deleteVar of varsToDelete) {
    // console.log(splitName(deleteVar));
    for (const variable of filteredVariables) {
      const name = `--${variable.name.split('/').slice(1).join('-')}`
      if (name === deleteVar) {
        if (Object.keys(boundVariables).includes(variable.name)) {
          // console.log(
          //   `Variable ${variable.name} is bound to a node and cannot be deleted.`
          // )
					stubbornVars[variable.name] = boundVariables[variable.name];
          // console.log()
					// for(const boundV of boundVariables[variable.name].nodes){
					// }
        } else {
          try {
            variable.remove()
          } catch (error) {
            console.log(error)
            console.log(`Failed to delete variable ${variable.name}`)
          }
        }
      }
    }
  }
    figma.ui.postMessage({
      type: 'returnUnusedVariables',
      payload: JSON.stringify(stubbornVars),
    })
}
