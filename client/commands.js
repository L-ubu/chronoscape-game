// Parse user input into commands or free-form actions
export function parseInput(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // OOC message
  if (trimmed.startsWith('//')) {
    return { type: 'action', text: trimmed };
  }

  // Slash command
  if (trimmed.startsWith('/')) {
    const parts = trimmed.slice(1).split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');
    return { type: 'command', command, args };
  }

  // Free-form action
  return { type: 'action', text: trimmed };
}
