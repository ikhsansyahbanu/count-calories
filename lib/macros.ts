export function getMacroTargets(
  targetKkal: number,
  goal?: string
): { proteinG: number; karboG: number; lemakG: number } {
  if (goal === 'cutting') {
    return {
      proteinG: Math.round((targetKkal * 0.30) / 4),
      karboG:   Math.round((targetKkal * 0.40) / 4),
      lemakG:   Math.round((targetKkal * 0.30) / 9),
    }
  }
  // bulking and maintain use same ratios
  return {
    proteinG: Math.round((targetKkal * 0.25) / 4),
    karboG:   Math.round((targetKkal * 0.50) / 4),
    lemakG:   Math.round((targetKkal * 0.25) / 9),
  }
}
