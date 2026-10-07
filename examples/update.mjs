// Regenerates the generated files of the example projects from
// examples/form/event-registration.formsgen.json with the builder's own export
// targets: runs the drift test (apps/builder/src/export/examples.test.ts) in
// write mode. Usage: pnpm examples:update
import { spawnSync } from 'node:child_process'

const result = spawnSync(
  'pnpm',
  ['--filter', '@formsgen/builder', 'exec', 'vitest', 'run', 'src/export/examples.test.ts'],
  { stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, FG_EXAMPLES_WRITE: '1' } },
)
process.exit(result.status ?? 1)
