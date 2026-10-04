// Minimal message catalog (REBUILD_PROMPT.md §8). All user-facing builder
// strings go through t(); more locales plug in later.

const en: Record<string, string> = {
  'app.title': 'FormsGen Builder',
  'palette.title': 'Elements',
  'palette.search': 'Search elements…',
  'palette.category.fields': 'Fields',
  'palette.category.static': 'Static',
  'palette.category.structure': 'Structure',
  'palette.empty': 'No elements match your search.',
  'canvas.empty': 'Drag elements here, or click one in the palette.',
  'canvas.container.empty': 'Drag elements here.',
  'canvas.delete': 'Delete element',
  'canvas.duplicate': 'Duplicate element',
  'tree.title': 'Outline',
  'tree.empty': 'No elements yet.',
  'tree.toggle': 'Toggle outline',
  'properties.title': 'Properties',
  'properties.empty': 'Select an element on the canvas to edit it.',
  'properties.name.label': 'Name (data key)',
  'properties.name.invalid': 'Must start with a letter; letters, digits and underscores only.',
  'properties.name.duplicate': 'This name is already used by a sibling element.',
  'properties.colspan.label': 'Column span',
  'properties.validation.add': 'Add rule…',
  'properties.validation.remove': 'Remove rule',
  'properties.conditions.placeholder': 'The visual condition builder arrives in a later phase.',
  'properties.items.value': 'Value',
  'properties.items.label': 'Label',
  'properties.items.add': 'Add option',
  'properties.items.remove': 'Remove option',
}

export function t(key: string): string {
  return en[key] ?? key
}
