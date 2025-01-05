import { assignAliasToVariable, setRawValuesFromReplacementForVariable } from './variableHelpers.js'
export default async function main(msg){
    if(msg.type === 'assignAliasToVariable'){
        const { variableIds, aliasVariableId } = JSON.parse(msg.payload)
        for (const variableId of variableIds) {
            await assignAliasToVariable(variableId, aliasVariableId)
        }
        figma.commitUndo()
    }
    if(msg.type === 'assignRawValuesToVariable'){
        const { variableIds, replacementVariableId } = JSON.parse(msg.payload)
        for (const variableId of variableIds) {
            await setRawValuesFromReplacementForVariable(variableId, replacementVariableId)
        }
        figma.commitUndo()
    }
}