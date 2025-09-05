export async function getModes(collectionId){
  try {
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId)
    if (!collection) {
      console.warn(`Collection ${collectionId} not found`)
      return []
    }
    return collection.modes || []
  } catch (error) {
    console.warn(`Error getting modes for collection ${collectionId}:`, error)
    return []
  }
}