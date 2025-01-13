interface VariableValue {
  r?: number
  g?: number
  b?: number
  type?: string
  id?: string
  [key: string]: any
}

interface Variable {
  id: string
  name: string
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING'
  valuesByMode: {
    [mode: string]: VariableValue | string | number
  }
}

export const normalizeColor = (color: string): string => {
  // Remove all spaces and convert to lowercase
  color = color.toLowerCase().replace(/\s/g, '')
  
  // Handle hex format
  if (color.startsWith('#')) {
    // Convert short hex (#fff) to full hex (#ffffff)
    if (color.length === 4) {
      color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
    }
    // Convert hex to rgb values (0-255)
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return `${r},${g},${b}`
  }
  
  // Handle rgb/rgba format
  if (color.startsWith('rgb')) {
    // Extract just the numbers
    const matches = color.match(/\d+/g)
    if (matches && matches.length >= 3) {
      return matches.slice(0, 3).join(',')
    }
  }

  // Handle 3-digit hex without #
  if (color.length === 3 && /^[0-9a-f]{3}$/i.test(color)) {
    const r = parseInt(color[0] + color[0], 16)
    const g = parseInt(color[1] + color[1], 16)
    const b = parseInt(color[2] + color[2], 16)
    return `${r},${g},${b}`
  }
  
  return color
}

export const isColorTerm = (term: string): boolean => {
  // Remove # if present
  const cleanTerm = term.startsWith('#') ? term.slice(1) : term
  
  return (
    term.startsWith('rgb') || 
    // Match any valid hex-like pattern (1-6 characters of hex digits)
    /^#?[0-9a-f]{1,6}$/i.test(term)
  )
}

export const normalizeHexInput = (hex: string): string => {
  // Remove # if present
  hex = hex.startsWith('#') ? hex.slice(1) : hex
  
  // Pad the hex value appropriately based on length
  switch (hex.length) {
    case 1: // Single digit: repeat 6 times (f -> ffffff)
      return '#' + hex.repeat(6)
    case 2: // Two digits: repeat 3 times (ff -> ffffff)
      return '#' + hex.repeat(3)
    case 3: // Three digits: double each (fff -> ffffff)
      return '#' + hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    case 4: // Four digits: use first 3 doubled (ffff -> ffffff)
      return '#' + hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    case 5: // Five digits: use first 3 doubled (fffff -> ffffff)
      return '#' + hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    case 6: // Six digits: use as is
      return '#' + hex
    default:
      return '#' + hex.padEnd(6, hex[hex.length - 1])
  }
}

export const colorsMatch = (searchTerm: string, figmaColor: string | VariableValue): boolean => {
  // Convert search term to RGB values (0-255)
  const searchNormalized = normalizeColor(searchTerm)
  if (!searchNormalized) return false
  const [searchR, searchG, searchB] = searchNormalized.split(',').map(Number)
  
  // Handle Figma's color object format
  if (typeof figmaColor === 'object' && figmaColor !== null) {
    if ('r' in figmaColor && 'g' in figmaColor && 'b' in figmaColor && 
        typeof figmaColor.r === 'number' && 
        typeof figmaColor.g === 'number' && 
        typeof figmaColor.b === 'number') {
      // Figma uses 0-1 range, convert to 0-255
      const r = Math.round(figmaColor.r * 255)
      const g = Math.round(figmaColor.g * 255)
      const b = Math.round(figmaColor.b * 255)
      
      // Exact matching
      return r === searchR && g === searchG && b === searchB
    }
  }
  
  // If it's a string (like from getVariableValue), normalize and compare
  if (typeof figmaColor === 'string') {
    const colorNormalized = normalizeColor(figmaColor)
    if (!colorNormalized) return false
    return searchNormalized === colorNormalized
  }
  
  return false
}

export const isNumberTerm = (term: string): boolean => {
  // Match numbers with optional decimal points and units
  return /^-?\d*\.?\d+(%|px|rem|em)?$/i.test(term)
}

export const numbersMatch = (searchTerm: string, value: string | number | VariableValue): boolean => {
  // Extract the numeric part and optional unit
  const matches = searchTerm.match(/^(-?\d*\.?\d+)(%|px|rem|em)?$/i)
  if (!matches) return false
  
  const searchNum = parseFloat(matches[1])
  const searchUnit = matches[2]
  
  // If it's a direct number value
  if (typeof value === 'number') {
    // If search has a unit, don't match raw numbers
    if (searchUnit) return false
    const threshold = Math.max(0.1, searchNum * 0.1) // 10% threshold or 0.1 minimum
    return Math.abs(value - searchNum) <= threshold
  }
  
  // If it's a string value (like "16px" or "1.5rem")
  if (typeof value === 'string') {
    const valueMatches = value.match(/^(-?\d*\.?\d+)(%|px|rem|em)?$/i)
    if (!valueMatches) return false
    
    const valueNum = parseFloat(valueMatches[1])
    const valueUnit = valueMatches[2]
    
    // If units are specified, they should match
    if (searchUnit && valueUnit && searchUnit !== valueUnit) return false
    
    // Use a threshold for fuzzy matching
    const threshold = Math.max(0.1, searchNum * 0.1) // 10% threshold or 0.1 minimum
    return Math.abs(valueNum - searchNum) <= threshold
  }
  
  return false
}

export const valuesMatchAcrossModes = (
  sourceVariable: Variable,
  targetVariable: Variable,
  modes: string[]
): boolean => {
  // Must be same type
  if (sourceVariable.resolvedType !== targetVariable.resolvedType) return false

  return modes.every(modeId => {
    const sourceValue = sourceVariable.valuesByMode[modeId]
    const targetValue = targetVariable.valuesByMode[modeId]

    // Handle color values
    if (sourceVariable.resolvedType === 'COLOR') {
      if (typeof sourceValue === 'object' && sourceValue !== null &&
          typeof targetValue === 'object' && targetValue !== null) {
        // Compare the RGB values directly
        if ('r' in sourceValue && 'g' in sourceValue && 'b' in sourceValue &&
            'r' in targetValue && 'g' in targetValue && 'b' in targetValue &&
            typeof sourceValue.r === 'number' && typeof sourceValue.g === 'number' && typeof sourceValue.b === 'number' &&
            typeof targetValue.r === 'number' && typeof targetValue.g === 'number' && typeof targetValue.b === 'number') {
          return sourceValue.r === targetValue.r &&
                 sourceValue.g === targetValue.g &&
                 sourceValue.b === targetValue.b &&
                 (sourceValue.a === targetValue.a || (!sourceValue.a && !targetValue.a))
        }
      }
      return false
    }

    // Handle number values
    if (sourceVariable.resolvedType === 'FLOAT') {
      if (typeof sourceValue === 'number' && typeof targetValue === 'number') {
        return Math.abs(sourceValue - targetValue) < 0.0001
      }
      if (typeof sourceValue === 'string' && typeof targetValue === 'string') {
        const sourceNum = parseFloat(sourceValue)
        const targetNum = parseFloat(targetValue)
        if (!isNaN(sourceNum) && !isNaN(targetNum)) {
          return Math.abs(sourceNum - targetNum) < 0.0001
        }
      }
    }

    // Handle string values and everything else
    return JSON.stringify(sourceValue) === JSON.stringify(targetValue)
  })
} 