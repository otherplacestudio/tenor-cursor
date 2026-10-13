---
name: tenor-cursor
description: Open a saved Tenor component in a linked Cursor preview and explicitly sync local edits back to the same component. Use for Open in Cursor, Cursor Design Mode, or sync-tenor requests.
---

# Edit Tenor components in Cursor

Use the connected Tenor MCP tools and the package's tenor-component skill for
discovery, preserved-source imports, ownership, permissions and version checks.

## Open a linked preview

For a supplied component ID and version, call `tenor_get_edit_workspace` with
those exact values. Otherwise discover the intended component through shared
components or separately consented owned-canvas management. Resolve ambiguous
choices before fetching. Stay on the requested Tenor environment.

Let the user complete OAuth consent if the tool requires canvas management.
Do not expose tokens or manufacture API keys.

Inspect the returned files. Create the returned `workspace.directory` in an
empty subfolder; never overwrite an existing folder. Reuse a folder only if
its `tenor-link.json` identifies the same component, preserving unsynced work.
Use the returned workspace's setup instructions, then open its local URL in
Cursor's browser and use Design Mode when requested. Confirm the preview
renders and preserves relevant interactions and assets.

The workspace may edit a bundled saved preview. Original source, when
preserved, is available through the component package/version history. Keep
original import files in source-based updates; disclose unsupported services
rather than silently substituting behavior.

## Save only when requested

Use the generated workspace's `/sync-tenor` command. It owns source
preparation and its receipt; do not replace it with a new-component import or
an unrelated global sync command.

Read current history before saving. `tenor_update_component` needs
`expected_version` and the exact `component_updated_at` as
`expected_updated_at`. Updates append a version to the same component.
Preserve the idempotency key and identical payload on an uncertain retry.
On a conflict, keep local edits and review the newer remote state before
reconciling; never use the current time as a revision or overwrite blindly.

Only advance the local base revision after a successful server receipt.
Read back the saved history/version, refresh the Tenor canvas, and exercise the
changed interaction before reporting a completed round-trip. Verify the prior
version remains accessible and report what was not tested.

## Boundaries

A local edit is not a Tenor save. Validation is not rendered verification.
Imports and OAuth never enable Agent access. Do not install file watchers or
automatic sync hooks. Generation, billing and destructive editor actions
require the user's applicable permission. Stop on revocation.
