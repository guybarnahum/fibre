# Thread Editor prototype

A dependency-free static prototype for loading and visualizing synthetic Thread JSON.

Run from the repository root:

```bash
npm run editor
```

The prototype can load local fixture JSON, edit a proposed self-model in memory, preview a command, compare raw state, and download a modified snapshot. It does **not** represent the future production write path. Production edits must become authenticated, validated commands and append-only events through the World Kernel.
