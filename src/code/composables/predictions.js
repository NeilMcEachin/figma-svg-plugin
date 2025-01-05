import { getNodesWithBoundVariables } from './variableData'
import { getFullName } from './nodeHelpers'
let trainedData = null

// const main = async () => {
// }
// main()

// Levenshtein distance function
function levenshteinDistance(a, b) {
  const matrix = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

// Function to preprocess node names
function preprocessNodeName(nodeName) {
  return nodeName.split('/')
}

// Function to calculate similarity score
function calculateSimilarity(name1, name2) {
  const parts1 = preprocessNodeName(name1)
  const parts2 = preprocessNodeName(name2)

  let totalScore = 0
  const maxLength = Math.max(parts1.length, parts2.length)

  for (let i = 0; i < maxLength; i++) {
    if (i < parts1.length && i < parts2.length) {
      const distance = levenshteinDistance(parts1[i], parts2[i])
      const maxLength = Math.max(parts1[i].length, parts2[i].length)
      const score = 1 - distance / maxLength
      totalScore += score
    }
  }

  return totalScore / maxLength
}

function findSimilarNames(targetName, objectList, topN = 5) {
  const similarityScores = objectList.map((obj) => ({
    name: obj.name,
    variable: obj.variable,
    score: calculateSimilarity(targetName, obj.name),
  }))

  similarityScores.sort((a, b) => b.score - a.score)
  return similarityScores.slice(0, topN)
}

// Example usage

export async function getPredictions(node) {
  const nodeName = getFullName(node)
  if (!trainedData)
    trainedData = await getNodesWithBoundVariables(figma.currentPage)
  const similarNames = findSimilarNames(nodeName, trainedData)
  console.log(`nodeName: ${node}`)

  console.log(`simliarNames: ${similarNames}`)
}




