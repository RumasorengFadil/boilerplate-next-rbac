export function cosine(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return 0;
  const dot = a.reduce((v, x, i) => v + x * b[i], 0);
  const norm = Math.sqrt(a.reduce((v, x) => v + x*x, 0) * b.reduce((v, x) => v + x*x, 0));
  return norm ? dot / norm : 0;
}
export function chunkText(text: string, size = 1200) {
  const normalized = text.replace(/\s+/g, " ").trim(); const chunks: string[] = [];
  for (let i = 0; i < normalized.length; i += size - 150) chunks.push(normalized.slice(i, i + size));
  return chunks;
}
