// Preserve author-supplied math and code; normalize legacy mathematical notation.
const protectedParts = /(```[\s\S]*?```|`[^`\n]+`|\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\n$]+\$|\\\([\s\S]*?\\\)|\[[^\]\n]*\]\([^\n)]*\)|https?:\/\/[^\s]+|<[^>\n]+>)/g;
const atom = String.raw`(?:[∠△]?[A-Za-zα-ωΑ-Ω]+(?:\([^()\n]*\))?|[-−]?\d+(?:\.\d+)?[A-Za-z]*|\([^()\n]*\))(?:[²³]|\^[{]?[\w+-]+[}]?)?`;
const equation = new RegExp(String.raw`${atom}(?:[ \t]*[+\-−*/×÷][ \t]*${atom})*[ \t]*(?:=|≠|≤|≥|<|>)[ \t]*[A-Za-zα-ωΑ-Ω0-9+\-−*/×÷=≠<>≤≥²³^().,{}π√°∠△\\ \t]+`, 'g');
const expression = /(?:\([^()\n]*[A-Za-z0-9][^()\n]*\)|[A-Za-z0-9]+)(?:[²³]|\^\{?\d+\}?)(?:[+\-−*/×÷][A-Za-z0-9²³^(){}.]+)*/g;
export function mathToTex(value: string): string {
  return value.replace(/²/g, '^2').replace(/³/g, '^3').replace(/−/g, '-').replace(/≠/g, '\\ne ').replace(/≤/g, '\\le ').replace(/≥/g, '\\ge ').replace(/×/g, '\\times ').replace(/÷/g, '\\div ').replace(/π/g, '\\pi ').replace(/°/g, '^\\circ').replace(/∠/g, '\\angle ').replace(/△/g, '\\triangle ');
}
export function formatMathText(text: string, lesson = false): string {
  // Display markers need their own Markdown blocks even when embedded in a sentence.
  const parts = text.replace(/\r\n/g, '\n').split(protectedParts);
  return parts.map((part, index) => {
    if (index % 2) {
      if (part.startsWith('$$') || part.startsWith('\\[')) return `\n\n${part}\n\n`;
      return part;
    }
    let plain = part.replace(/\\n(?=\s*(?:[（(]\d+[）)]|第[一二三四五六七八九十]+步))/g, '\n');
    if (lesson) {
      plain = plain.replace(/(?:^|\n|(?<=[。；]))\s*(第[一二三四五六七八九十\d]+步)[：:]/g, '\n\n### $1\n\n');
      plain = plain.split(/\n\n+/).map(p => p.length > 160 ? p.replace(/。(?=\S)/g, '。\n\n') : p).join('\n\n');
    }
    const encoded: string[] = [];
    const wrap = (candidate: string, offset: number, source: string) => {
      if (/[A-Za-z0-9_\\]/.test(source[offset - 1] || '')) return candidate;
      let value = candidate.trim().replace(/[. ,]+$/, '');
      // A closing bracket belonging to the surrounding sentence stays outside math.
      let suffix = '';
      while ((value.match(/\)/g)?.length || 0) > (value.match(/\(/g)?.length || 0) && value.endsWith(')')) { value = value.slice(0,-1); suffix = ')' + suffix; }
      if (!value || /[\u4e00-\u9fff]/.test(value)) return candidate;
      const display = lesson && (value.length > 30 || (value.match(/=/g)?.length || 0) > 1);
      const rendered = display ? `\n\n$$\n${mathToTex(value)}\n$$\n\n` : `$${mathToTex(value)}$`;
      encoded.push(rendered + suffix);
      return `\uE000${encoded.length - 1}\uE001`;
    };
    plain = plain.replace(equation, wrap).replace(expression, wrap)
      .replace(/\((?:[-−]?\d+(?:\.\d+)?|[a-z]),\s*(?:[-−]?\d+(?:\.\d+)?|[a-z])\)/g, wrap)
      .replace(/\\(?:d?frac|tfrac)\{[^{}]+\}\{[^{}]+\}|\\sqrt\{[^{}]+\}/g, wrap)
      .replace(/[∠△][A-Z]{1,3}/g, wrap);
    return plain.replace(/\uE000(\d+)\uE001/g, (_, id) => encoded[Number(id)]);
  }).join('').replace(/\$\$\n\n[。；，]/g, () => '$$\n\n');
}
