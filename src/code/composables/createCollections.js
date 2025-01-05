
export function createNestedCollection() {
  // I'll give it a list of all variables names as keys in css var format
  // and I'll give it an array of each variable group that should exist in figma or does in lxp variables
  // loop through list of array check for keys that have that name and create a variable for each key in that group
  // I have to make sure I don't match words that have the start of a word in them. for example
  // classroom would match --classroom and --classroom-card.
  // I need to check if there is a my version again version that include mine in them and confirm they don't get in the way
  const newMap = {}
  const collection =
    figma.variables.createVariableCollection('Nested Collection')
  const cssVarNames = Object.keys(cssVarMap)

  Object.entries(variableGroups).forEach(([groupName, variables]) => {
    variables.forEach((group) => {
      // get list of groups that include this groups name
      const listOfSimilarNames = variables.filter((varGroup) => {
        return varGroup.startsWith(group) && varGroup !== group
      })
      cssVarNames.forEach((name) => {
        if (
          name.startsWith(`--${group}`) &&
          !listOfSimilarNames.some((similarName) =>
            name.startsWith(`--${similarName}`)
          )
        ) {
          const newName = name.slice(`--${group}-`.length)
          if (!newMap[groupName]) {
            newMap[groupName] = {}
          }
          if (!newMap[groupName][group]) {
            newMap[groupName][group] = {}
          }
          try {
            if (!newMap[groupName][group][newName]) {
              newMap[groupName][group][newName] = { r: 1, g: 1, b: 1, a: 1 }
              const colorVariable = figma.variables.createVariable(
                `${groupName}/${group}${newName ? '/' : ''}${newName}`,
                collection,
                'COLOR'
              )
              colorVariable.setValueForMode(
                collection.modes[0].modeId,
                newMap[groupName][group][newName]
              )
            }
          } catch (e) {
            console.log(`${groupName}/${group}/${newName}`, e)
          }
        }
      })
    })
  })

  // console.log(newMap);
}