/** 页面使用的 JSON、时间、链接与章节名称工具；不包含网络请求。 */

export function safeArray<T>(value: string | undefined): T[] {
  try {
    const result = JSON.parse(value || "[]");
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

export function safeObject<T>(value: string | undefined): T | null {
  try {
    return JSON.parse(value || "null");
  } catch {
    return null;
  }
}

export function timeLabel(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function safeUrl(value: string) {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
}

export const chapterNames: Record<string, string> = {
  // 一年级
  grade1_upper: "一年级上册",
  grade1_lower: "一年级下册",
  // 二年级
  grade2_upper: "二年级上册",
  grade2_lower: "二年级下册",
  // 九年级及基础
  foundation: "数学基础",
  quadratic_function: "二次函数",
  similar_triangle: "相似三角形",
  circle: "圆",
  quadratic_equation: "一元二次方程",
  rational_number: "有理数",
  linear_equation_one: "一元一次方程",
  geometry_basic: "几何图形初步",
  algebraic_expression: "整式",
  triangle: "三角形",
  congruent_triangle: "全等三角形",
  axial_symmetry: "轴对称",
  polynomial_multiply: "整式乘法",
  factorization: "因式分解",
  fraction: "分式",
  quadratic_radical: "二次根式",
  pythagorean: "勾股定理",
  quadrilateral: "四边形",
  linear_function: "一次函数",
  linear_system: "二元一次方程组",
  inequality: "不等式",
  data_analysis: "数据分析",
  probability: "概率",
  inverse_proportion: "反比例函数",
};
