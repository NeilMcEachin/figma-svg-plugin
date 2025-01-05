function findBestMatches(query, data) {
  // Function to extract important parts from a name string
  function extractParts(name) {
    const parts = name.split(' / ')
    const componentPart = parts.find((p) => p.startsWith('COMPONENT:')) || ''
    const componentSetPart =
      parts.find((p) => p.startsWith('COMPONENT_SET:')) || ''

    // Extract variants, e.g., "Property 1=Default"
    const variants = componentPart.split(',').map((variant) => variant.trim())

    // Extract last part type (e.g., "TEXT" or "FRAME")
    const lastPart = parts[parts.length - 1] || ''
    const [lastPartType] = lastPart.split(':') // Get the part before the colon (e.g., "TEXT", "FRAME")

    return {
      lastPartType: lastPartType || '', // e.g., "TEXT"
      componentSet: componentSetPart, // e.g., "COMPONENT_SET:leaderboard table cell"
      component: componentPart, // Full component part
      variants: variants, // List of variants (e.g., Property 1=Default)
      fullString: name,
    }
  }

  // Function to compare and score variants
  function compareVariants(queryVariants, itemVariants) {
    let totalVariantScore = 0

    queryVariants.forEach((queryVariant) => {
      const [queryKey, queryValue] = queryVariant
        .split('=')
        .map((part) => part.trim())

      itemVariants.forEach((itemVariant) => {
        const [itemKey, itemValue] = itemVariant
          .split('=')
          .map((part) => part.trim())

        // Variant name and value matching logic
        if (queryKey === itemKey && queryValue === itemValue) {
          // Full match on both name and value
          totalVariantScore += 2
        } else if (queryKey === itemKey || queryValue === itemValue) {
          // Partial match (name or value matches)
          totalVariantScore += 1
        }
      })
    })

    return totalVariantScore
  }

  // Function to calculate the score for an item
  function calculateScore(queryParts, itemParts) {
    // Disqualify immediately if component sets don't match
    if (queryParts.componentSet !== itemParts.componentSet) {
      return -Infinity // Strong disqualification for mismatched component sets
    }

    // Penalize if the last part types (e.g., "TEXT" vs "FRAME") don't match
    if (queryParts.lastPartType !== itemParts.lastPartType) return -Infinity

    // Penalize mismatches in components but still allow some similarity
    if (queryParts.component !== itemParts.component) return 1

    // Compare variants (no specific names assumed)
    const variantScore = compareVariants(
      queryParts.variants,
      itemParts.variants
    )

    // Add variant score to overall score (but don't let it override more important parts)
    return (
      2 +
      variantScore +
      calculateSimilarity(queryParts.fullString, itemParts.fullString)
    )
  }

  // Function to calculate overall string similarity (as a tiebreaker)
  function calculateSimilarity(str1, str2) {
    const length = Math.max(str1.length, str2.length)
    let matches = 0
    for (let i = 0; i < length; i++) {
      if (str1[i] === str2[i]) matches++
    }
    return matches / length
  }

  const queryParts = extractParts(query.name)

  // Calculate scores for all items
  const scoredItems = data.map((item) => ({
    item: item,
    score: calculateScore(queryParts, extractParts(item.name)),
  }))

  // Filter out disqualified items (with -Infinity score)
  const validItems = scoredItems.filter(
    (scoredItem) => scoredItem.score !== -Infinity
  )

  // Sort items by score in descending order
  validItems.sort((a, b) => b.score - a.score)

  // Return top 3 matches, including the name, variable, and score
  return validItems.slice(0, 3).map((scoredItem) => ({
    name: scoredItem.item.name,
    variable: scoredItem.item.variable,
    score: scoredItem.score,
  }))
}

export async function getPrediction(node) {
  let correctMappings = await figma.root.getPluginData('correctMappings')
  if (correctMappings) {
    correctMappings = JSON.parse(correctMappings)
    const variables = findBestMatches(node, correctMappings)
    return variables
  }
  return null
}
