import canonicalNames from "./knowledge-names.json";

// Canonical Chinese labels from internal/service/taxonomy.go cover legacy saved guides.
const names: Record<string, string> = canonicalNames;
export function knowledgeLabel(id: string, name?: string): string {
  const label = name?.trim() || "";
  // Mathematical names such as A字型 remain valid; internal IDs never become copy.
  if (/[\u3400-\u9fff]/.test(label) && !/MATH_|[A-Z]{2,}_/.test(label)) return label;
  return names[id] || "相关数学知识";
}
