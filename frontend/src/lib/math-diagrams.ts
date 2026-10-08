export type DiagramKind = 'quadratic' | 'linear' | 'inverse' | 'coordinates' | 'square' | 'similar' | 'circle' | 'area';
export function diagramFor(id: string): DiagramKind | undefined {
  if (id === 'MATH_FOUNDATION_COORDINATES') return 'coordinates';
  if (id === 'MATH_FOUNDATION_FUNCTION') return 'linear';
  if (id === 'MATH_FOUNDATION_COMPLETING_SQUARE') return 'square';
  if (id === 'MATH_09_QUADRATIC_AREA_EXTREME') return 'area';
  if (id.startsWith('MATH_09_QUADRATIC_')) return 'quadratic';
  if (id.startsWith('MATH_09_SIMILAR_')) return 'similar';
  if (id.startsWith('MATH_09_CIRCLE_')) return 'circle';
  if (id.startsWith('MATH_08_LINEAR_')) return 'linear';
  if (id.startsWith('MATH_08_INVERSE_')) return 'inverse';
}
