import {
  getNodesWithBoundVariables,
  getCollectionVariables,
} from './composables/variableData.js'
import { setNodeAttributeToVariable } from './composables/nodeHelpers.js'
let VARIABLE_COLLECTION_ID = null

// import variableCollection from './data/newVariableCollection.json'
// import nodesToMigrate from './data/nodesToMigrate.json'

// ------------------------------
//  Export functions
// ------------------------------

export async function getNodesBoundToCollection(collectionId) {
  const nodes = await getNodesWithBoundVariables(
    figma.currentPage,
    (name, variable, type) => {
      return (
        variable.variableCollectionId === collectionId &&
        variable.resolvedType === 'COLOR'
      )
    },
    false
  )
  return nodes
}

const hasVariableBoundToCollection = async (node, collectionId) => {
  if (!node.boundVariables) return false
  let hasCollectionVariable = false
  const boundVariableKeys = Object.keys(node.boundVariables)

  // Loop through bound variables
  for (const key of boundVariableKeys) {
    const values = node.boundVariables[key]

    // Loop through bound variable values
    for (const value of values) {
      const variable = await figma.variables.getVariableByIdAsync(value.id)
      // Flag node as having a variable if it matches the collection
      if (variable && variable.variableCollectionId === collectionId) {
        hasCollectionVariable = true
      }
    }
  }

  return hasCollectionVariable
}

async function getStylesBoundToCollection(collectionId) {
  const boundStyles = {
    paintStyles: [],
    effectStyles: [],
  }
  const paintStyles = await figma.getLocalPaintStylesAsync()
  const effectStyles = await figma.getLocalEffectStylesAsync()

  // Loop through style
  for (const style of paintStyles) {
    if (await hasVariableBoundToCollection(style, collectionId)) {
      boundStyles.paintStyles.push({
        id: style.id,
        name: style.name,
        boundVariables: style.boundVariables,
        paints: style.paints,
        type: style.type,
      })
    }
  }
  for (const style of effectStyles) {
    if (await hasVariableBoundToCollection(style, collectionId)) {
      boundStyles.effectStyles.push({
        id: style.id,
        name: style.name,
        boundVariables: style.boundVariables,
        effects: style.effects,
        type: style.type,
      })
    }
  }

  return boundStyles

  // const effects = JSON.parse(JSON.stringify(effectStyles[0].effects))
  // effects[0].boundVariables.color = {
  //   type: 'VARIABLE_ALIAS',
  //   id: variable.id,
  // }
  // effectStyles[0].effects = effects;

  // console.log(effectStyles)

  // Ok updating nodes is easy. I think I get it now.
  // Get the property or I think even maybe just go by boundVariables
  // Create a copy of it to assign updates to
  // assign property to copy. It should update thr rest?
}

// ------------------------------
//  Import functions
// ------------------------------

const sortFunction = (a, b) => {
  // Sort names starting with core/ above others
  const startsWithCoreA = a.name.startsWith('core/')
  const startsWithCoreB = b.name.startsWith('core/')

  if (startsWithCoreA && !startsWithCoreB) return -1
  if (!startsWithCoreA && startsWithCoreB) return 1

  // If all else is equal, sort alphabetically by name
  return a.name.localeCompare(b.name)
}

export async function exportNodesBoundToCollection() {
  const collections = await figma.variables.getLocalVariableCollectionsAsync()
  const newCollection = collections.find(
    (collection) => collection.name === 'Nested Collection'
  )
  const nodes = await getNodesBoundToCollection(newCollection.id)

  const fileData = JSON.stringify({
    data: JSON.stringify(nodes, null, 2),
    name: 'nodesToMigrate.json',
    type: 'text/plain;charset=utf-8',
  })
  figma.ui.postMessage({
    type: 'saveFile',
    payload: fileData,
  })
}

export async function exportCollectionVariables() {
  const collections = await figma.variables.getLocalVariableCollectionsAsync()
  const newCollection = collections.find(
    (collection) => collection.name === 'Nested Collection'
  )
  const variables = await getCollectionVariables(newCollection.id)
  const styles = await getStylesBoundToCollection(newCollection.id)
  console.log(newCollection)

  const data = {
    collectionName: newCollection.name,
    modes: newCollection.modes,
    variables,
    paintStyles: styles.paintStyles,
    effectStyles: styles.effectStyles,
  }
  const fileData = JSON.stringify({
    data: JSON.stringify(data, null, 2),
    name: 'newVariableCollection.json',
    type: 'text/plain;charset=utf-8',
  })
  figma.ui.postMessage({
    type: 'saveFile',
    payload: fileData,
  })
}

async function createModes(collection, modes) {
  const modeMap = {}
  for (let i = 0; i < modes.length; i++) {
    if (i === 0) {
      modeMap[modes[i].modeId] = collection.modes[i].modeId
      collection.renameMode(collection.modes[i].modeId, modes[i].name)
    } else {
      const modeId = collection.addMode(modes[i].name)
      modeMap[modes[i].modeId] = modeId
    }
  }
  return modeMap
}

async function createCollection(collectionName) {
  // Get collections and find one named the Collection Name
  const collections = await figma.variables.getLocalVariableCollectionsAsync()
  let collection = collections.find(
    (collection) => collection.name === collectionName
  )

  // Remove collection if it exists for testing
  // if (collection) {
  //   collection.remove()
  //   collection = null
  // }
  // create collection if it doesn't exist
  if (!collection) {
    collection = figma.variables.createVariableCollection(collectionName)
  }
  VARIABLE_COLLECTION_ID = collection.id
  return collection
}

async function importVariables(variables, collection, variableMap, modeMap) {
  const aliasedVariables = []
  // {name: id}
  const collectionVariablesMap = {}
  for (const variable of variables) {
    // Create Variable
    const newVariable = figma.variables.createVariable(
      variable.name,
      collection,
      variable.resolvedType
    )
    // Add variable to map for easy reference
    collectionVariablesMap[newVariable.name] = newVariable.id

    // Set values for each mode. If value is an alias, add to aliasedVariables and set value to 0 0 0 0
    const modeKeys = Object.keys(variable.valuesByMode)
    for (const modeKey of modeKeys) {
      const value = variable.valuesByMode[modeKey]
      if (value.type && value.type === 'VARIABLE_ALIAS') {
        aliasedVariables.push({
          newVariable,
          modeId: modeMap[modeKey],
          variableName: variableMap[value.id],
        })
        newVariable.setValueForMode(modeMap[modeKey], {
          r: 0,
          g: 0,
          b: 0,
          a: 0,
        })
      } else {
        newVariable.setValueForMode(modeMap[modeKey], value)
      }
    }
  }

  // Handle aliased variables by removing them from alias array.
  for (const variable of aliasedVariables) {
    const newVariable = variable.newVariable
    const modeId = variable.modeId
    const variableName = variable.variableName
    const aliasId = collectionVariablesMap[variableName]
    if (aliasId) {
      newVariable.setValueForMode(modeId, {
        type: 'VARIABLE_ALIAS',
        id: aliasId,
      })
    } else {
      console.log(`Variable ${variableName} not found`)
    }
  }

  // Just reconfirm all variables have been set. Throw log if something hasn't been set
  // If not set value will be {r: 0, g: 0, b: 0, a: 0}, Unless its transparent
  const collectionVariables = await getCollectionVariables(collection.id)
  for (const variable of collectionVariables) {
    const modeKeys = Object.keys(variable.valuesByMode)
    for (const modeKey of modeKeys) {
      const value = variable.valuesByMode[modeKey]
      if (value.r === 0 && value.g === 0 && value.b === 0 && value.a === 0) {
        // console.log(`Confirm variable ${variable.name}`)
      }
    }
  }

  return collectionVariablesMap
}
/**
 * Creates a map of variable IDs to variable names
 * @param {Array} variables - Array of variables with id and name properties
 * @returns {Object} Map of variable IDs to variable names
 * Example: {
 *   "var123": "colors/primary",
 *   "var456": "spacing/large" 
 * }
 */

function createVariableMap(variables) {
  const variableMap = {}
  for (const variable of variables) {
    variableMap[variable.id] = variable.name
  }
  return variableMap
}

async function setVariableToStyle(variable, style){
}

/**
 * Updates variable bindings in a paint object based on provided mappings
 * @param {Paint} paint - The current paint object from the document
 * @param {Paint} importedPaint - The corresponding imported paint object
 * @param {Object.<string, string>} oldNewVariableMap - Mapping of old variable IDs to new variable IDs
 * @returns {Paint} Updated paint object
 */
function updatePaintVariables(paint, importedPaint, oldNewVariableMap) {
  // Create deep copy of paint to modify
  const updatedPaint = JSON.parse(JSON.stringify(paint))

  // Handle all bound variables on the paint
  if (updatedPaint.boundVariables) {
    Object.keys(updatedPaint.boundVariables).forEach(key => {
      const importedVar = importedPaint?.boundVariables?.[key]
      if (importedVar?.id) {
        updatedPaint.boundVariables[key].id = oldNewVariableMap[importedVar.id] || updatedPaint.boundVariables[key].id
      }
    })
  }

  // Handle gradient stops
  if (updatedPaint.gradientStops) {
    updatedPaint.gradientStops.forEach((stop, stopIndex) => {
      const importedStop = importedPaint?.gradientStops?.[stopIndex]
      if (stop.boundVariables) {
        Object.keys(stop.boundVariables).forEach(key => {
          const importedVar = importedStop?.boundVariables?.[key]
          if (importedVar?.id) {
            stop.boundVariables[key].id = oldNewVariableMap[importedVar.id] || stop.boundVariables[key].id
          }
        })
      }
    })
  }

  return updatedPaint
}

/**
 * Updates variable bindings in an effect object based on provided mappings
 * @param {Effect} effect - The current effect object from the document
 * @param {Effect} importedEffect - The corresponding imported effect object
 * @param {Object.<string, string>} oldNewVariableMap - Mapping of old variable IDs to new variable IDs
 * @returns {Effect} Updated effect object
 */
function updateEffectVariables(effect, importedEffect, oldNewVariableMap) {
  // Create deep copy of effect to modify
  const updatedEffect = JSON.parse(JSON.stringify(effect))

  // Handle all bound variables on the effect
  if (updatedEffect.boundVariables) {
    Object.keys(updatedEffect.boundVariables).forEach(key => {
      const importedVar = importedEffect?.boundVariables?.[key]
      if (importedVar?.id) {
        updatedEffect.boundVariables[key].id = oldNewVariableMap[importedVar.id] || updatedEffect.boundVariables[key].id
      }
    })
  }

  return updatedEffect
}

/**
 * Migrates style variables from old collection to new collection
 * @param {Array<Object>} importedStyles - Styles from the imported collection
 * @param {Object.<string, string>} oldNewVariableMap - Mapping of old variable IDs to new variable IDs
 * @returns {Promise<void>}
 */
async function migrateStyleVariables(importedStyles, oldNewVariableMap) {
  const paintStyles = await figma.getLocalPaintStylesAsync()
  const effectStyles = await figma.getLocalEffectStylesAsync()
  const stylesInDocument = [...paintStyles, ...effectStyles]

  for (const importedStyle of importedStyles) {
    const styleInDocument = stylesInDocument.find(s => s.name === importedStyle.name)
    
    if (!styleInDocument) continue

    // Handle paint styles
    if (styleInDocument.paints) {
      const updatedPaints = styleInDocument.paints.map((paint, index) => 
        updatePaintVariables(paint, importedStyle.paints?.[index], oldNewVariableMap)
      )
      styleInDocument.paints = updatedPaints
    }

    // Handle effect styles
    if (styleInDocument.effects) {
      const updatedEffects = styleInDocument.effects.map((effect, index) =>
        updateEffectVariables(effect, importedStyle.effects?.[index], oldNewVariableMap)
      )
      styleInDocument.effects = updatedEffects
    }
  }
}

async function createOldNewVariableMap(importedVariables, collectionId){
  const importedVariableMap = {}
  for (const variable of importedVariables) {
    importedVariableMap[variable.name] = variable.id
  }

  const collectionVariables = await getCollectionVariables(collectionId);
  const oldNewVariableMap = {}
  for (const variable of collectionVariables) {
    oldNewVariableMap[importedVariableMap[variable.name]] = variable.id
  }
  return oldNewVariableMap;
}

export async function importCollectionVariables(variableCollection) {
  // Create collection
  const collection = await createCollection(variableCollection.collectionName)
  const styles = [...variableCollection.paintStyles, ...variableCollection.effectStyles];
  const oldNewVariableMap = await createOldNewVariableMap(variableCollection.variables, collection.id);
  console.log(oldNewVariableMap);
  await migrateStyleVariables(styles, oldNewVariableMap);
  return;
  // Create Modes and return map { oldId: newId }
  const modeMap = await createModes(collection, variableCollection.modes)
  // Return variable map for reference { oldId: newName }
  const variableMap = createVariableMap(variableCollection.variables)
  // Sort variables coming in
  const incomingVariables = variableCollection.variables.sort(sortFunction)
  // Returns map of names to new variable ids { name: id }
  const collectionMap = await importVariables(
    incomingVariables,
    collection,
    variableMap,
    modeMap
  )
}

/**
 * Migrates node variables from one collection to another
 * @param {Array} nodes - Array of nodes with their bound variables and types. Example:
 * [{
 *   id: "node123", 
 *   name: "Rectangle 1",
 *   type: "fills",
 *   variable: {
 *     id: "var456",
 *     name: "colors/primary"
 *   }
 * }]
 * @param {string} collectionId - ID of the variable collection to migrate to
 */
export async function migrateNodeVariables(nodes, collectionId) {
  // Get all variables from the target collection we're migrating to
  const variables = await getCollectionVariables(collectionId)

  // Loop through each node that needs to be migrated
  for (const node of nodes) {
    try {
      // Only process nodes that have a variable binding
      if (node.variable) {
        // Get the name of the variable currently bound to this node
        const boundVariableName = node.variable.name
        
        // Find the matching variable in the target collection by name
        const variable = variables.find((v) => v.name === boundVariableName)
        
        // Get reference to the actual Figma node
        const figmaNode = await figma.getNodeByIdAsync(node.id)
        
        // Skip if node doesn't exist in the document
        if (!figmaNode) {
          console.log(`Node ${node.id} not found, Skipping`)
          continue
        }

        // Bind the node's property to the new variable from target collection
        setNodeAttributeToVariable(figmaNode, node.type, variable.id)
      }
    } catch (e) {
      // Log any errors along with the problematic node
      console.log(node)
      console.log(e) 
    }
  }
}

/**
 * Imports nodes with bound variables from a JSON file and migrates them to a target collection
 * 
 * @param {Array} nodesToMigrate - Array of node objects containing:
 *   - id: Node ID in the Figma document
 *   - name: Display name of the node
 *   - type: Property type that has the variable binding (e.g. 'fills', 'effects')
 *   - variable: Object containing variable info:
 *     - id: Original variable ID
 *     - name: Variable name used for matching
 * 
 * @todo Update hardcoded 'Nested Collection' name to be configurable
 * @todo Add error handling for collection not found case
 */
export async function importBoundNodes(nodesToMigrate) {
  // Get all variable collections in the document
  const collections = await figma.variables.getLocalVariableCollectionsAsync()
  
  // Find the target collection to migrate variables into
  const collection = collections.find(
    (collection) => collection.name === 'Nested Collection'
  )
  
  // Migrate the node bindings to variables in the target collection
  await migrateNodeVariables(nodesToMigrate, collection.id)
}
