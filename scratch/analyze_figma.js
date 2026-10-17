const fs = require('fs');

const data = JSON.parse(fs.readFileSync('figma_inicio_node.json', 'utf8'));
const root = data.nodes['2:3441'].document;

function rgbToHex(c) {
  if (!c) return 'none';
  const r = Math.round(c.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(c.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(c.b * 255).toString(16).padStart(2, '0');
  const a = c.a !== undefined && c.a < 1 ? ` (${Math.round(c.a * 100)}%)` : '';
  return `#${r}${g}${b}${a}`;
}

function dump(node, depth = 0) {
  const indent = '  '.repeat(depth);
  let extra = [];
  if (node.characters) extra.push(`text="${node.characters.replace(/\n/g, '\\n')}"`);
  if (node.cornerRadius !== undefined) extra.push(`radius=${node.cornerRadius}`);
  if (node.rectangleCornerRadii) extra.push(`radii=${JSON.stringify(node.rectangleCornerRadii)}`);
  if (node.layoutMode) extra.push(`layout=${node.layoutMode}`);
  if (node.itemSpacing !== undefined) extra.push(`gap=${node.itemSpacing}`);
  if (node.paddingLeft !== undefined) extra.push(`pad=[${node.paddingTop},${node.paddingRight},${node.paddingBottom},${node.paddingLeft}]`);
  if (node.fills && node.fills.length) {
    const fills = node.fills.map(f => f.type === 'SOLID' ? rgbToHex(f.color) : f.type).join(', ');
    extra.push(`fills=[${fills}]`);
  }
  if (node.strokes && node.strokes.length) {
    const strokes = node.strokes.map(s => s.type === 'SOLID' ? rgbToHex(s.color) : s.type).join(', ');
    extra.push(`strokes=[${strokes}] weight=${node.strokeWeight}`);
  }
  if (node.style) {
    const s = node.style;
    extra.push(`font=${s.fontFamily} ${s.fontWeight} ${s.fontSize}px/${s.lineHeightPx ? Math.round(s.lineHeightPx) + 'px' : ''}`);
  }
  console.log(`${indent}${node.name} [${node.type}] (${node.id}) ${extra.join(' ')}`);
  if (node.children) {
    node.children.forEach(c => dump(c, depth + 1));
  }
}

root.children.forEach((c, idx) => {
  console.log(`\n========================================`);
  console.log(`SECTION ${idx}: ${c.name} (${c.id})`);
  console.log(`========================================`);
  dump(c, 0);
});
