export async function getModes(collectionId){
  const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId)
  const modes = collection.modes
	return modes;
}