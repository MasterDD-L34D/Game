#!/usr/bin/env node
// Evo-Tactics — find main worktree path helper.
// Usage: node scripts/find-main-worktree.cjs
// Output: stdout = main worktree path (no newline) OR empty string if main not in any worktree.
// Exit: 0 always (empty output handled by caller).
//
// Pattern: cross-PC pure Node, NO shell escape issues. Used by .bat launchers
// (Sync-Main + Demo + Toggle bats) per detect main worktree path automatic.

'use strict';

const { execSync } = require('node:child_process');

try {
  const output = execSync('git worktree list --porcelain', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  // Parse porcelain blocks. Each worktree = 3-4 lines:
  //   worktree <path>
  //   HEAD <sha>
  //   branch refs/heads/<name>      (or "detached")
  //   <empty line>

  const blocks = output.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    if (!block.includes('branch refs/heads/main')) continue;
    const match = block.match(/^worktree (.+)$/m);
    if (match) {
      // Output path without trailing newline (cmd %%P picks it cleanly)
      process.stdout.write(match[1].trim());
      process.exit(0);
    }
  }

  // Main not in any worktree — empty output
  process.exit(0);
} catch (err) {
  // Git error or not in repo — empty output, exit 0 (caller handles)
  process.exit(0);
}
