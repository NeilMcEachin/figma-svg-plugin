// Import sample module
import * as fs from 'fs'
import cssVarMap from './final-map.json'
import varsToDelete from './data/varsToDelete.json'
import variableGroups from './variables.js'
import { nodeToObject } from './helpers/nodeToObject.ts'
import {
  getFullName,
  setNodeAttributeToVariable,
} from './composables/nodeHelpers.js'
import { getPrediction } from './composables/getPrediction.js'
import {
  getVariables,
  getFilteredVariables,
  getNodesWithBoundVariables,
  getCollectionVariables,
  getRawValue,
  getNodeTree,
} from './composables/variableData.js'
import { exportVariablestoSCSS } from './composables/exportVariables.js'
import { getModes } from './composables/collectionHelpers.js'
import { deleteVariables } from './composables/deleteVariables.js'
import { createLinearGradient } from './helpers/linearGradient.ts'
import { extractLinearGradientParamsFromTransform } from './helpers/extractLinearGradientStartEnd.ts'
import { figmaGradientToCSS } from './helpers/gptAttempt.js'
import {
  migrateNodeVariables,
  variableCheck,
  createVariableSet,
} from './composables/migrateVariables.js'
// import './composables/variableData.js'
import {
  exportNodesBoundToCollection,
  exportCollectionVariables,
  exportCollectionModeVariables,
  importCollectionVariables,
  // importStyles,
  importBoundNodes,
} from './migrate.js'
import { log } from 'scripts/utils'
import messageBridge from './composables/messageBridge.js'

let windowWidth = 1200
let windowHeight = 600
let previousWidth = windowWidth

let previousHeight = windowHeight
const minimizedHeight = 32 // Height of just the title bar
const minimizedWidth = 342 // Width of collapses die bar

// Function to load window size from client storage
async function loadWindowSize() {
  const storedWidth = await figma.clientStorage.getAsync('windowWidth')
  const storedHeight = await figma.clientStorage.getAsync('windowHeight')
  if (storedWidth && storedHeight) {
    windowWidth = storedWidth
    windowHeight = storedHeight
  }
  figma.ui.resize(windowWidth, windowHeight)
}
figma.showUI(__html__, {
  width: windowWidth,
  height: windowHeight,
  themeColors: true,
  title: 'Variable Manager',
})
// Function to save window size to client storage
async function saveWindowSize(width: number, height: number) {
  await figma.clientStorage.setAsync('windowWidth', width)
  await figma.clientStorage.setAsync('windowHeight', height)
}

loadWindowSize()
// This shows the HTML page in "ui.html".

async function getCollections() {
  const collections = await figma.variables.getLocalVariableCollectionsAsync()
  figma.ui.postMessage({
    type: 'returnCollections',
    payload: JSON.stringify(
      collections.map((c) => ({
        id: c.id,
        name: c.name,
        modes: [...c.modes],
      }))
    ),
  })
}
getCollections()

async function getVariable(id) {
  const variables = await getVariables()
  return variables.find((variable) => variable.id === id)
}

async function getUniqueIds(node) {
  const uniqueIds = new Set()

  async function traverse(node) {
    if (node.boundVariables) {
      if (node.boundVariables.fills) {
        node.boundVariables.fills.forEach((fill) => {
          if (fill.id) {
            uniqueIds.add(fill.id)
          }
        })
      }
      if (node.boundVariables.strokes) {
        node.boundVariables.strokes.forEach((stroke) => {
          if (stroke.id) {
            uniqueIds.add(stroke.id)
          }
        })
      }
    }

    if (node.children?.length) {
      for (const child of node.children) {
        await traverse(child)
      }
    }
  }

  await traverse(node)
  return Array.from(uniqueIds)
}

function condenseNodes(nodes) {
  const condensed = {}

  nodes.forEach((node) => {
    const { name, variable, type, id, imageData } = node

    if (!condensed[name]) {
      condensed[name] = { name, id, imageData }
    }

    if (type === 'fills') {
      condensed[name].fills = variable
    }

    if (type === 'strokes') {
      condensed[name].strokes = variable
    }
  })

  return Object.values(condensed)
}

async function getSelection() {
  return
  const selectedNodes = figma.currentPage.selection
  console.log(selectedNodes)

  if (selectedNodes.length && selectedNodes[0].type !== 'PAGE') {
    const nodes = []
    for (const node of selectedNodes) {
      const boundNodes = await getNodesWithBoundVariables(
        node,
        (name) => !name.startsWith('core/') && !name.startsWith('component/')
      )
      nodes.push(...condenseNodes(boundNodes))
    }
    for (const node of nodes) {
      node.variablePrediction = await getPrediction(node)
    }
    // console.log(nodes)
    figma.ui.postMessage({
      type: 'returnNodes',
      payload: JSON.stringify(selectedNodes),
    })

    figma.ui.postMessage({
      type: 'returnColorNodes',
      payload: JSON.stringify(nodes),
    })
  }
}

async function setRawValuesForVariable(variableId, attributeValue, modeMap) {
  const variable = await figma.variables.getVariableByIdAsync(variableId)
  const modes = await getModes(variable.variableCollectionId)

  // if there is a bound variable. Grab raw value for each mode
  for (const mode of modes) {
    const rawValue = await getRawValue(attributeValue, mode, modeMap)
    // Assign raw value to variable for each mode
    variable.setValueForMode(mode.modeId, rawValue)
  }
}

// async function setNodeAttributeToVariable(node, attributeName, variableId) {
//   const variable = await figma.variables.getVariableByIdAsync(variableId)
//   const nodeAttributeCopy = JSON.parse(JSON.stringify(node[attributeName]))

//   nodeAttributeCopy[0] = figma.variables.setBoundVariableForPaint(
//     nodeAttributeCopy[0],
//     'color',
//     variable
//   )
//   node[attributeName] = nodeAttributeCopy
// }

async function updateCorrectMappings(nodes) {
  const correctMappings = JSON.parse(
    await figma.root.getPluginData('correctMappings')
  )
  nodes.forEach((node) => {
    const index = correctMappings.findIndex((mapping) => mapping.id === node.id)
    if (index > -1) {
      correctMappings[index] = node
    } else {
      correctMappings.push(node)
    }
  })
  // console.log(correctMappings);

  figma.root.setPluginData('correctMappings', JSON.stringify(correctMappings))
}

async function dfsRecursiveFind(node, results = {}, visited = new Set()) {
  if (!node || visited.has(node) || node.name.startsWith('ignore--'))
    return results

  // Mark the node as visited
  visited.add(node)

  function setResults(variable, node) {
    if (!results.hasOwnProperty(variable.name)) {
      results[variable.name] = {
        id: variable.id,
        name: variable.name,
        resolvedType: variable.resolvedType,
      }
      results[variable.name].nodes = []
    }
    results[variable.name].nodes.push({ id: node.id, name: node.name })
  }

  if (node.visible && node.boundVariables) {
    const boundVariables = Object.entries(node.boundVariables)

    for (const [key, value] of boundVariables) {
      if (value.type) {
        const variable = await figma.variables.getVariableByIdAsync(value.id)
        setResults(variable, node)
      } else if (Array.isArray(value)) {
        for (const boundV of value) {
          const variable = await figma.variables.getVariableByIdAsync(boundV.id)
          if (variable?.name) {
            setResults(variable, node)
          }
        }
      }
      // else
      //   // const varDef = await figma.variables.getVariableByIdAsync(value.Spinoff.id)
      //   // console.log(varDef.name);
      //   console.log(node);
      // }
    }
  }
  // // Check if the node's value matches the target value
  // if (node.value === targetValue) {
  //     result.push(node);
  // }

  // Recur for each child
  if (node.children) {
    for (const child of node.children) {
      await dfsRecursiveFind(child, results, visited)
    }
  }

  return results
}

figma.on('selectionchange', async () => {
  getSelection()
})

const refreshCollectionVariables = async (collectionId) => {
  const collections = await figma.variables.getLocalVariableCollectionsAsync()
  if (collections.length === 0) return
  let variables = []
  let localCollectionId = collectionId
  if (!localCollectionId) {
    const nestedCollectionIndex = collections.findIndex(
      (c) => c.name === 'Nested Collection'
    )
    if (nestedCollectionIndex > -1) {
      localCollectionId = collections[nestedCollectionIndex].id
    } else {
      localCollectionId = collections[0].id
    }
  }
  variables = await getCollectionVariables(localCollectionId)

  console.log(variables)

  figma.ui.postMessage({
    type: 'returnCollectionVariables',
    payload: JSON.stringify(variables),
  })
}

figma.on('documentchange', async () => {
  console.log('documentchange')
  refreshCollectionVariables()
})

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'refreshCollections') {
    getCollections()
  }
  if (msg.type === 'getCollectionVariables') {
    refreshCollectionVariables(msg.payload?.collectionId)
  }
  if (msg.type === 'getCollectionModes') {
    const { collectionId } = msg.payload
    const modes = await getModes(collectionId)

    figma.ui.postMessage({
      type: 'returnCollectionModes',
      payload: JSON.stringify(modes),
    })
  }
  if (msg.type === 'deleteVariables') {
    const boundVariables = await dfsRecursiveFind(figma.currentPage)
    deleteVariables(varsToDelete, boundVariables)
  }
  if (msg.type === 'swapVariable') {
    const { attributeName, nodeId, replacementVariableId } = JSON.parse(
      msg.payload
    )

    const node = await figma.getNodeByIdAsync(nodeId)

    const modeMap = {
      'Drive--dark': 'Drive Base',
      'Drive--light': 'Light Mode',
      'Cadi--dark': 'Cadillac test',
    }

    // Check if bound variable exists then bind value to that else bind to attribute e.g .boundVariable:{fills} || .fills
    const attributeValue =
      node.boundVariables[attributeName] || node[attributeName]

    if (attributeValue) {
      await setRawValuesForVariable(
        replacementVariableId,
        attributeValue[0],
        modeMap
      )
    }
    await setNodeAttributeToVariable(node, attributeName, replacementVariableId)
    const boundNodes = await getNodesWithBoundVariables(node, () => true, false)
    updateCorrectMappings(boundNodes)

    getSelection()
  }
  if (msg.type === 'createNestedCollection') {
    // createNestedCollection()
    const collection =
      figma.variables.createVariableCollection('Nested Collection')
    collection.renameMode(collection.modes[0].modeId, 'Drive--dark')
    collection.addMode('Drive--light')
    collection.addMode('Cadi--dark')
    getCollections()
  }
  if (msg.type === 'deleteNestedCollection') {
    const collection = await figma.variables.getVariableCollectionByIdAsync(
      msg.payload
    )
    collection.remove()
    getCollections()
  }

  if (msg.type === 'exportVariablestoSCSS') {
    const { collectionId } = JSON.parse(msg.payload)

    const modeMap = {
      'Drive--dark': 'Drive Base',
      'Drive--light': 'Light Mode',
      'Cadi--dark': 'Cadillac test',
    }
    const variableConfig = await exportVariablestoSCSS(collectionId, modeMap)
    // console.log(variableConfig);

    const fileData = JSON.stringify({
      data: variableConfig,
      name: 'variables.scss',
      type: 'text/scss',
    })
    figma.ui.postMessage({ type: 'saveFile', payload: fileData })
  }

  if (msg.type === 'getStyles') {
    const paintStyles = await figma.getLocalPaintStylesAsync()
    const effectStyles = await figma.getLocalEffectStylesAsync()
    const textStyles = await figma.getLocalTextStylesAsync()
    console.log('paintStyles:')
    console.log(paintStyles)
    console.log('effectStyles:')
    console.log(effectStyles)
    console.log('textStyles:')
    console.log(textStyles[38])

    const node = figma.currentPage.selection[0]
    // console.log(node.fills[0], node.width, node.height)
    // const css = await node.getCSSAsync()
    // console.log(css.background || css.fill)
    // const gradient = figmaGradientToCSS(node.fills[0], node.width, node.height)
    // console.log(gradient)

    // console.log(paintStyles)
    // console.log(extractLinearGradientParamsFromTransform)
    // for (const paintStyle of paintStyles) {
    // if (
    //   paintStyle.paints.length &&
    //   paintStyle.paints[0].type === 'GRADIENT_LINEAR'
    // ) {
    //   const node = paintStyle.consumers[0].node
    // for (const { node } of paintStyle.consumers) {
    // console.log(node.fills[0].gradientTransform)
    // const gradient = extractLinearGradientParamsFromTransform(node.width, node.height, node.fills[0].gradientTransform)
    // const css = await node.getCSSAsync()
    // console.log(css)
    // }
    // }
    // }
  }

  if (msg.type === 'getUnusedVariables') {
    const paintStyles = await figma.getLocalPaintStylesAsync()
    const effectStyles = await figma.getLocalEffectStylesAsync()
    // console.log(paintStyles)
    // console.log(effectStyles)
    const styles = [...paintStyles, ...effectStyles]

    const results = {}

    function setResults(variable, node) {
      if (!results.hasOwnProperty(variable.name)) {
        results[variable.name] = {
          id: variable.id,
          name: variable.name,
          resolvedType: variable.resolvedType,
        }
        results[variable.name].nodes = []
      }
      results[variable.name].nodes.push({ id: node.id, name: node.name })
    }

    for (const node of styles) {
      if (node.boundVariables) {
        const boundVariables = Object.entries(node.boundVariables)

        for (const [key, value] of boundVariables) {
          if (value.type) {
            const variable = await figma.variables.getVariableByIdAsync(
              value.id
            )
            setResults(variable, node)
          } else if (Array.isArray(value)) {
            for (const boundV of value) {
              const variable = await figma.variables.getVariableByIdAsync(
                boundV.id
              )
              if (variable?.name) {
                setResults(variable, node)
              }
            }
          }
        }
      }
    }

    // const img = figma.getImageByHash('ac583f21bfc97f4575bae178535257c55089d47c');
    // const bytes = await img.getBytesAsync();
    // const url = URL.createObjectURL(new Blob([bytes]))
    // console.log(url);
    // console.log(results)

    // return
    const boundVariables = await dfsRecursiveFind(figma.currentPage)
    // console.log(nodesWithBoundVariables)
    Object.keys(results).forEach((key) => {
      const variable = results[key]
      if (!boundVariables.hasOwnProperty(variable.name)) {
        boundVariables[variable.name] = {
          id: variable.id,
          name: variable.name,
          resolvedType: variable.resolvedType,
        }
        boundVariables[variable.name].nodes = []
      }
      for (const node of variable.nodes) {
        boundVariables[variable.name].nodes.push(node)
      }
    })

    const unusedVars = []
    const usedVars = {}
    const variables = await getFilteredVariables()
    // Get nodes with bound variables, get all variables possible
    // Check variables that are not in bound variables list
    // Then check variables that are assigned to a variable alias
    variables.forEach((variable) => {
      if (variable.resolvedType === 'COLOR') {
        const name = `--${variable.name.split('/').slice(1).join('-')}`
        if (!boundVariables.hasOwnProperty(variable.name)) {
          unusedVars.push(name)
        } else {
          usedVars[name] = []
        }
        // if (variable.name.includes('card')) {
        // }
      }
    })
    //     const values = Object.values(variable.valuesByMode)
    //     if (
    //       values.every((value) => {
    //         return (
    //           value.hasOwnProperty('r') &&
    //           value.r === 1 &&
    //           value.hasOwnProperty('g') &&
    //           value.g === 1 &&
    //           value.hasOwnProperty('b') &&
    //           value.b === 1 &&
    //           (!value.hasOwnProperty('a') || value.a === 0 || value.a === 1)
    //         )
    //       })
    //     ) {
    //       unusedVars.push(variable.name)
    //       console.log(variable.name)
    //       console.log(variable)
    //     }
    //   }
    // })

    console.log('unusedVars:')
    console.log(unusedVars.sort((a, b) => a.localeCompare(b)))
    console.log('usedVars:')
    console.log(usedVars)

    const variableNames = Object.keys(boundVariables)
    const filteredNodes = {}
    variableNames.forEach((name) => {
      if (
        !name.startsWith('component/') &&
        !name.startsWith('core/') &&
        boundVariables[name].resolvedType === 'COLOR'
      ) {
        filteredNodes[name] = boundVariables[name]
      }
    })
    // console.log(filteredNodes)

    // let ignoredVariables = await figma.root.getPluginData('ignoredVariables')
    // if (ignoredVariables) ignoredVariables = JSON.parse(ignoredVariables)
    // const filteredVariables = variables.filter((variable) => {
    //   const values = Object.values(variable.valuesByMode)
    //   if (ignoredVariables.hasOwnProperty(variable.id))
    //     return ignoredVariables[variable.id]
    //   return values.every(
    //     ({ r, g, b, a }) =>
    //       !!r && r === 1 && g && g === 1 && b && b === 1 && (!a || a === 1)
    //   )
    // })

    figma.ui.postMessage({
      type: 'returnUnusedVariables',
      payload: JSON.stringify(filteredNodes),
    })
    // console.log(filteredVariables)
  }

  if (msg.type === 'deleteUnusedVariables') {
    const variableIds = JSON.parse(msg.payload)
    for (const id of variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(id)
      console.log(variable)

      try {
        variable.remove()
      } catch (e) {
        console.error(e)
      }
    }
  }

  async function getStyles() {
    const paintStyles = await figma.getLocalPaintStylesAsync()
    const effectStyles = await figma.getLocalEffectStylesAsync()
    // console.log(paintStyles)
    // console.log(effectStyles)
    const styles = [...paintStyles, ...effectStyles]

    const results = {}

    function setResults(variable, node) {
      if (!results.hasOwnProperty(variable.name)) {
        results[variable.name] = {
          id: variable.id,
          name: variable.name,
          resolvedType: variable.resolvedType,
        }
        results[variable.name].nodes = []
      }
      results[variable.name].nodes.push({ id: node.id, name: node.name })
    }

    for (const node of styles) {
      if (node.boundVariables) {
        const boundVariables = Object.entries(node.boundVariables)

        for (const [key, value] of boundVariables) {
          if (value.type) {
            try {
              const variable = await figma.variables.getVariableByIdAsync(
                value.id
              )
              setResults(variable, node)
            } catch (e) {
              console.log(`cant find variable ${value.name}`)
            }
          } else if (Array.isArray(value)) {
            for (const boundV of value) {
              try {
                const variable = await figma.variables.getVariableByIdAsync(
                  boundV.id
                )
                if (variable?.name) {
                  setResults(variable, node)
                }
              } catch (e) {
                console.log(`cant find variable ${value.name}`)
              }
            }
          }
        }
      }
    }
    return results
  }

  if (msg.type === 'getUnusedVariables2') {
    // const results = await getStyles()
    // console.log(results)
    // return

    const ignoreList = [
      // Showcase
      'component/datepicker/bg',
      'component/datepicker/fg',
      'component/datepicker/cell-active-bg',
      'component/datepicker/cell-active-fg',
      'component/datepicker/cell-hover-bg',
      'component/datepicker/cell-hover-fg',
      'component/datepicker/cell-secondary-bg',
      'component/datepicker/cell-secondary-fg',
      'component/datepicker/cell-secondary-hover-bg',
      'component/base-video-player/control-bg',
      'component/base-video-player/control-fg',
      'component/base-video-player/volume-slider-fg',
      'component/base-video-chat/livestream-controls-bg',
      'component/base-video-chat/placeholder-bg',
      'component/base-video-chat/placeholder-fg',
      'component/dropdown/option-selected-hovered-bg',
      'component/dropdown/option-selected-hovered-fg',
      'component/dropdown/options-stroke',
      'component/input/border-focus-fg',
      'component/skeleton/bg',
      'component/skeleton/fg',
      'component/footer/version-fg',
      // Inquire
      'component/avatar/instructor-border-fg',
      'component/people-grid/admin-border-fg',
      // Implement
      'component/collapsible/bg',
      'component/collapsible/header-bg',
      'component/collapsible/fg',
      'component/button/user/bg',
      'component/page/fg',
      'component/sidenav/bg',
      // Refactor
      'component/login/bg-image',
      'component/login/mobile-bg-image',
      'component/registration/bg-image',
      'component/registration/mobile-bg-image',
      'component/channel-card/banner-image',
      'component/not-found/fg',
      'component/verify-email/fg',
      'component/registration/bg',
      'component/registration/mobile-bg',
      'component/profile-banner/bg-image',
      'component/profile-banner/mobile-bg-image',
      'component/channel-header/banner-default-image',
    ]
    const collections = await figma.variables.getLocalVariableCollectionsAsync()
    console.log(collections)
    // return
    let collectionVariables = await getCollectionVariables(collections[1].id)
    collectionVariables = collectionVariables.filter(
      (variable) =>
        !ignoreList.includes(variable.name) && variable.resolvedType === 'COLOR'
    )
    const nodes = await getNodesWithBoundVariables(
      figma.currentPage,
      () => true,
      false,
      msg.payload.includeInstanceNodes
    )

    const unusedVars = []
    for (const variable of collectionVariables) {
      if (
        !nodes.some((node) => {
          return node.variable.id === variable.id
        }) &&
        !collectionVariables.some((v) =>
          Object.values(v.valuesByMode).some(
            (value) => value.id && value.id === variable.id
          )
        )
      ) {
        unusedVars.push(variable)
      }
    }
    console.log(unusedVars)

    figma.ui.postMessage({
      type: 'returnUnusedVariables2',
      payload: JSON.stringify(unusedVars),
    })
  }

  if (msg.type === 'remapVariables') {
    const remap = {
      'buttons, links/Primary button/primary-btn-text':
        'component/button/primary-fg',
      'buttons, links/Primary button/primary-btn-fill':
        'component/button/primary-bg',
      'buttons, links/Primary button/primary-btn-text-hover':
        'component/button/primary-hover-fg',
      'buttons, links/Primary button/primary-btn-fill-hover':
        'component/button/primary-hover-bg',
      'buttons, links/Text button or body copy link/text-btn-hover':
        'component/button/text/primary-hover-fg',
      'buttons, links/Disabled button/disabled-btn-text':
        'component/button/disabled-fg',
      'control colors/Error/signal-error': 'core/signal/error',
      'control colors/main-text': 'core/primary/fg',
      'divs, borders/divs-borders': 'core/border/primary-fg',
      'control colors/icons-primary': 'core/primary/icon-fg',
      'tags/Tag or Keyword/keyword-bg': 'component/tag/bg',
      'navigation/left-nav-bg': 'component/sidenav/bg',
      'navigation/left-nav-text-inactive': 'component/sidenav/link-fg',
      'navigation/left-nav-text-active': 'component/sidenav/link-active-fg',
      'navigation/nav-active-highlight': 'component/sidenav/link-active-bg',
      // 'navigation/nav-item-text-active': '',
      'tags/New/new-tag-bg': 'component/tag/primary-bg',
      'tags/New/new-tag-text': 'component/tag/primary-fg',
      // 'profile-photo-ring': '',
      'control colors/Accent 1/accent1-stop2': 'core/accent1-stop-2',
      'tags/Tag or Keyword/keyword-text': 'component/tag/fg',
      // 'buttons, links/Text button or body copy link/text-btn-disabled': 'component/button/text/disabled-bg',
      // 'text colors/components-pages-text': '',
      // 'filter, dropdowns & fields/filter-bg': '',
      // 'bg, overlay, flyouts/blurred-modal-bg': '',
      highlight: 'core/highlight',
      'control colors/Error/error-notification-stop-1': 'core/error-stop-1',
      'control colors/Error/error-notification-stop-2': 'core/error-stop-2',
      'control colors/Success/success-notification-stop-1':
        'core/success-stop-1',
      'control colors/Success/success-notification-stop-2':
        'core/success-stop-2',
      'divs, borders/optional-border': 'core/border/optional-fg',
      'control colors/Success/signal-success': 'core/signal/success',
      // 'email variables/divs':'',
      'control colors/Success/signal-success-hover':
        'core/signal/success-hover',
      'control colors/Error/signal-error-fg': 'core/signal/error-fg',
      'control colors/Success/signal-success-foreground':
        'core/signal/success-fg',
      'control colors/Error/signal-error-hover': 'core/signal/error-hover',
      'control colors/Success/success-notification-fg':
        'core/signal/success-fg',
      'control colors/Accent 4/accent4-stop-1': 'core/accent4-stop-1',
      'control colors/Accent 4/accent4-stop-2': 'core/accent4-stop-2',
      'buttons, links/Text button or body copy link/text-btn':
        'component/button/text/primary-fg',
      'cards/card-bg': 'component/card/bg',
      'cards/card-stroke': 'component/card/stroke',
      'text colors/helper-text': 'core/meta/fg',
      'bg, overlay, flyouts/page BG/bg-gradient-stop-1':
        'component/page/gradient-stop-1',
      'bg, overlay, flyouts/page BG/bg-gradient-stop-2':
        'component/page/gradient-stop-2',
    }

    const collections = await figma.variables.getLocalVariableCollectionsAsync()
    const oldCollection = await getCollectionVariables(collections[0].id)
    const newCollection = await getCollectionVariables(collections[1].id)

    const idMap = {}
    const oldCollectionKeys = Object.keys(remap)
    for (const key of oldCollectionKeys) {
      const oldVar = oldCollection.find((v) => v.name === key)
      const newVar = newCollection.find((v) => v.name === remap[key])
      idMap[oldVar.id] = newVar.id
    }

    const nodes = await getNodesWithBoundVariables(
      figma.currentPage,
      () => true,
      false
    )

    for (const node of nodes) {
      // console.log(node)
      if (idMap.hasOwnProperty(node.variable.id)) {
        const figmaNode = await figma.getNodeByIdAsync(node.id)
        if (figmaNode) {
          // console.log(figmaNode)

          try {
            await setNodeAttributeToVariable(
              figmaNode,
              node.type,
              idMap[node.variable.id]
            )
          } catch (e) {
            console.log(
              `cant bind node ${figmaNode.name}:${figmaNode.id} with variable ${
                idMap[node.variable.id]
              }`
            )
          }
        }
      }
    }
  }
  if (msg.type === 'getVariablesToRemap') {
    // const results = await getStyles()
    const ignoreList = [
      'url bar (ignore)/url-bar-bg',
      'url bar (ignore)/url-bar-black',
      'url bar (ignore)/url-bar-red',
      'url bar (ignore)/url-bar-yellow',
      'url bar (ignore)/url-bar-green',
      'url bar (ignore)/url-bar',
    ]

    const collections = await figma.variables.getLocalVariableCollectionsAsync()
    const nestedCollection = await getCollectionVariables(collections[1].id)
    let collectionVariables = await getCollectionVariables(collections[0].id)
    collectionVariables = collectionVariables.filter(
      (variable) =>
        variable.resolvedType === 'COLOR' && !ignoreList.includes(variable.name)
    )
    const nodes = await getNodesWithBoundVariables(
      figma.currentPage,
      () => true,
      msg.payload.includeImages,
      msg.payload.includeInstanceNodes
    )

    const unusedVars = []
    for (const variable of collectionVariables) {
      const obj = variable
      obj.nodes = []

      nodes.forEach((node) => {
        if (node.variable.id === variable.id) {
          obj.nodes.push(node)
        }
      })
      nestedCollection.forEach((v) => {
        if (
          Object.values(v.valuesByMode).some(
            (value) => value.id && value.id === variable.id
          )
        ) {
          obj.nodes.push(v)
        }
      })
      if (obj.nodes.length) {
        unusedVars.push(obj)
      }
    }
    // console.log(unusedVars)

    figma.ui.postMessage({
      type: 'returnVariablesToRemap',
      payload: JSON.stringify(unusedVars),
    })
  }
  if (msg.type === 'getBoundNodes') {
    console.log(figma.currentPage)
    const nodes = await getNodesWithBoundVariables(
      figma.currentPage,
      () => true,
      false
    )
    // nodes = nodes.filter((node) => !node.name.includes('ignore--'))
    console.log(nodes)
    figma.ui.postMessage({
      type: 'returnBoundNodes',
      payload: JSON.stringify(nodes),
    })
    console.log(nodes)
  }

  if (msg.type === 'ignoreUnusedVariable') {
    const ignoredVariables = JSON.parse(
      await figma.root.getPluginData('ignoredVariables')
    )
    const { id } = JSON.parse(msg.payload)
    ignoredVariables[id] = ignoredVariables[id] ? !ignoredVariables[id] : true
    figma.root.setPluginData(
      'ignoredVariables',
      JSON.stringify(ignoredVariables)
    )
  }

  if (msg.type === 'getFrames') {
    console.log(figma.currentPage)

    const frameNodes = figma.currentPage.children.map((child) => ({
      name: child.name,
      id: child.id,
    }))
    const nodes = await getNodesWithBoundVariables(
      figma.currentPage,
      () => true,
      false
    )
    const filteredNodes = nodes.filter(
      (node) =>
        !node.variable.name.startsWith('component/') &&
        !node.variable.name.startsWith('core/')
    )
    // console.log(filteredNodes);

    function findFrame(node, frameNodes) {
      const frame = node.name.split('/')[1].trim().split(':')[1]
      return frameNodes.find((f) => f.name === frame)
    }

    function hasFrame(frames, node) {
      return frames.some((f) => f.name === node.name)
    }

    const frames = {}
    for (const node of nodes) {
      const frameNode = findFrame(node, frameNodes)
      const frameName = frameNode?.name
      if (frameName) {
        if (!frames.hasOwnProperty(frameNode.id))
          frames[frameNode.id] = {
            id: frameNode.id,
            name: frameName,
            nodesToChange: [],
            totalNodes: 0,
            progress: 0,
          }
        if (
          !node.variable.name.startsWith('component/') &&
          !node.variable.name.startsWith('core/')
        ) {
          frames[frameNode.id].nodesToChange.push(node)
        }
        const frame = frames[frameNode.id]
        frames[frameNode.id].totalNodes++
        frames[frameNode.id].progress =
          (frame.totalNodes - frame.nodesToChange.length) / frame.totalNodes
      }
    }

    // console.log(frames)

    figma.ui.postMessage({
      type: 'returnFrames',
      payload: frames,
    })
  }

  if (msg.type === 'createVariableSet') {
    await createVariableSet(msg.payload)
  }

  if (msg.type === 'migrateNodeVariables') {
    await migrateNodeVariables(msg.payload)
  }

  if (msg.type === 'assignVariableToNodes') {
    const data = JSON.parse(msg.payload)
    for (const node of data.nodes) {
      const figmaNode = await figma.getNodeByIdAsync(node.id)
      await setNodeAttributeToVariable(figmaNode, node.type, data.variableId)
    }
  }

  if (msg.type === 'focusNode') {
    const { nodeId } = JSON.parse(msg.payload)

    const node = await figma.getNodeByIdAsync(nodeId)
    if (!node) return

    let parentNode = node.parent
    while (parentNode && parentNode.type !== 'PAGE') {
      parentNode = parentNode.parent
    }
    if (parentNode) {
      await figma.setCurrentPageAsync(parentNode)
    }
    // console.log(node);
    figma.currentPage.selection = [node]
    figma.viewport.scrollAndZoomIntoView([node])
  }

  if (msg.type === 'focusNodes') {
    const { nodes } = JSON.parse(msg.payload)
    // const nodes = await figma.currentPage.getNodesByIdsAsync(nodeIds)
    figma.currentPage.selection = nodes
    figma.viewport.scrollAndZoomIntoView(nodes)
  }

  if (msg.type === 'getNodesBoundToCollection') {
    console.log('getNodesBoundToCollection', msg.payload.includeInstanceNodes)
    exportNodesBoundToCollection(msg.payload.includeInstanceNodes)
  }

  if (msg.type === 'exportCollectionModeVariables') {
    exportCollectionModeVariables(msg.payload.collectionId, msg.payload.modeId)
  }

  if (msg.type === 'exportCollectionVariables') {
    exportCollectionVariables()
  }

  if (msg.type === 'importCollectionVariables') {
    importCollectionVariables(JSON.parse(msg.payload))
    // importStyles(JSON.parse(msg.payload))
  }
  if (msg.type === 'importBoundNodes') {
    importBoundNodes(JSON.parse(msg.payload))
  }

  // if (msg.type === 'migrateVariables') {
  // }

  if (msg.type === 'toggleMinimize') {
    if (windowHeight === minimizedHeight) {
      // Restore previous size
      windowWidth = previousWidth
      windowHeight = previousHeight
    } else {
      // Store current size and minimize
      previousWidth = windowWidth
      previousHeight = windowHeight
      windowWidth = minimizedWidth
      windowHeight = minimizedHeight
    }
    figma.ui.resize(windowWidth, windowHeight)
    await saveWindowSize(windowWidth, windowHeight)
  }
  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  if (msg.type === 'cancel') {
    figma.closePlugin()
  }
  if (msg.type === 'testMessage') {
    console.log('hello')
  }
  if (msg.type === 'resize') {
    const { width, height } = msg
    windowWidth = width
    windowHeight = height
    figma.ui.resize(windowWidth, windowHeight)
    // Save new dimensions
    await saveWindowSize(windowWidth, windowHeight)
  }

  await messageBridge(msg)
}

async function loadMappings() {
  const nodes = await getNodesWithBoundVariables(
    figma.currentPage,
    () => true,
    false
  )
  // console.log(nodes)

  const filteredNodes = nodes.filter(
    (node) =>
      node.variable.name.startsWith('component/') ||
      node.variable.name.startsWith('core/')
  )
  await figma.root.setPluginData(
    'correctMappings',
    JSON.stringify(filteredNodes)
  )
  console.log(filteredNodes)
}
// Init
;(async () => {
  // Run on launch as well
  // console.log(figma.currentPage)

  if (figma.currentPage.selection.length) getSelection()

  // await loadMappings()
  // await migrateVariables();
  // await variableCheck();

  // const collectionId = 'VariableCollectionId:3410:21870'
  // const modes = await getModes(collectionId)
  // const modeObject = {};
  // const collectionVariables = await getCollectionVariables(collectionId)
  // console.log(collectionVariables);

  // console.log(JSON.parse(await figma.root.getPluginData('correctMappings')))

  // Get all nodes with a fill or stroke
  // const nodes = await getNodeTree(figma.currentPage)
  // console.log(nodes);

  // console.log(nodes)
  // Get all nodes with bound variables that start with 'component/' or 'core/'
  // console.log(filteredNodes)

  // // Get all variables that start with 'component/' or 'core/'
  // const filteredVariables = await getFilteredVariables(figma.currentPage)
  // console.log(filteredVariables.map((v) => ({ name: v.name, id: v.id })))
})()
