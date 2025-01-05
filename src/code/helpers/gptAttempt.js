function calculateAngleFromGradientTransform(gradientTransform, nodeWidth, nodeHeight) {
  // Calculate start and end points using node dimensions and gradientTransform matrix
  const x1 = gradientTransform[0][2] * nodeWidth;
  const y1 = gradientTransform[1][2] * nodeHeight;
  const x2 = x1 + gradientTransform[0][0] * nodeWidth;
  const y2 = y1 + gradientTransform[1][0] * nodeHeight;

  // Compute angle in degrees between the points
  let angleRad = Math.atan2(y2 - y1, x2 - x1);
  let angleDeg = angleRad * (180 / Math.PI);

  // Normalize to 0-360 degrees
  angleDeg = (angleDeg + 360) % 360;

  // Figma gradient direction often needs a 90-degree adjustment
  return (angleDeg + 90) % 360;
}

function parseColorStop(colorStop) {
  const color = colorStop.color;
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a;
  
  // Preserve position as it is from Figma, including values over 100%
  const position = (colorStop.position * 100).toFixed(2);

  return `rgba(${r}, ${g}, ${b}, ${a}) ${position}%`;
}

export function figmaGradientToCSS(gradientFill, nodeWidth, nodeHeight) {
  // Calculate angle with provided node size and gradient transform
  const angle = calculateAngleFromGradientTransform(gradientFill.gradientTransform, nodeWidth, nodeHeight);
  const colorStops = gradientFill.gradientStops.map(parseColorStop);

  // Format as CSS linear-gradient string
  return `linear-gradient(${angle.toFixed(0)}deg, ${colorStops.join(', ')})`;
}
