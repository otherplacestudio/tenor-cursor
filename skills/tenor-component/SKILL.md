---
name: tenor-component
description: Connect to Tenor to list, implement, or sync shared components; import self-contained React components; and manage owned canvases with explicit OAuth consent.
---

# Work with Tenor components and canvases

Use the connected Tenor MCP tools as the source of truth for any component the
user asks to bring into a repository or save in Tenor.

## Supported MCP contract

- Discovery and handoff: list components with Agent access, fetch a saved
  component or its versioned package, and check whether a local copy is current.
- Import: validate and save self-contained React source into a new private canvas
  or an existing owned canvas. Source validation is not render verification.
- Canvas control: list and inspect owned canvases; create or rename a canvas;
  rename, move, or append a new version to a component.
- Preparation and verification: analyze runtime needs, preserve larger source
  packages, prepare a local edit workspace, and run bounded browser checks.

The separately consented embedded editor can delete owned canvas content. The
ordinary component-management tools cannot delete content. No MCP tool changes
sharing or enables Agent access. The user
controls Agent access from the component's Share menu in Tenor. Never claim that
an MCP import, source validation, or passing a narrow assertion proves complete
visual fidelity.

## First use

1. For “open Tenor,” “get started,” or “try Tenor,” prefer `tenor_open_editor`
   when the connected host exposes it and supports MCP Apps. It presents the
   actual Tenor canvas inside a supported MCP Apps host after explicit `mcp:editor` OAuth consent.
   Let the user approve that connection themselves; an existing read or canvas
   management grant does not include editor access.
2. If the editor tool or embedded display is unavailable, call
   `tenor_open_workspace`. Open its exact `workspace_url` in the host's built-in
   browser when available, otherwise provide the ordinary browser link. Do not
   claim a view opened until the host or browser confirms it.
3. If the account lacks active access, open https://tenor.design/dashboard so
   the user can complete normal signup or billing. Never purchase, start a trial,
   or submit payment without the user's request. Account settings, checkout and
   unsupported editor operations continue in the regular Tenor browser.
4. The browser may need a separate login with the same Tenor account. Never copy
   OAuth tokens, editor capabilities, session cookies or API keys into a page,
   URL, source file or model-visible response. The embedded UI manages its own
   short-lived, project-bound generation connection in memory.
5. An empty `tenor_list_components` result means no components have Agent access;
   it does not mean the account has no canvases or the connection failed. Open
   the editor's owned-canvas picker, or offer to import source they provide.
6. Use exact returned canvas IDs. Do not guess from an ambiguous name. The
   embedded editor can create a private empty canvas; its internal creation
   receipt reuses one request ID after a timeout. Ordinary browser access to an
   exact canvas uses `tenor_open_workspace` after canvas-management consent.

The editor's `tenor_editor_*` operations are app-only transport helpers, not
model-directed tools. Use the model-visible import and management tools for
requested structured changes, and the editor or browser for visual inspection.
Existing sharing permissions, source preservation, ownership and version-conflict
rules still apply. Installation and hosted availability are separate from the
local package; do not claim marketplace publication from tool source alone.
CLI and other hosts without embedded UI use ordinary web links.

## Find the component

1. If the prompt includes a Tenor identifier and version, use those exact
   values.
2. Otherwise call `tenor_list_components` and ask the user to choose when more
   than one result reasonably matches.
3. Never attempt to access a component that Tenor does not return. Explain that
   the user can enable Agent access from the component's Share menu.

## Inspect before editing

Call `tenor_get_component_package` for implementation work. Treat the returned
package as authoritative for:

- preserved source and assets
- package dependencies
- the public prop contract
- responsive and interactive behavior
- integrity and verification metadata
- the saved Tenor version

When original import source is preserved, its files live in
`implementation.reference.files` (respect each file's `encoding`).
`sourcePackage` describes the original entry, dependencies, adaptations and
optional manifest; `filesLocation` points to those same files without duplicating
them. `runnable.code` is the saved preview bundle, not a replacement for the
original editable source. Check `sourcePreservation` before claiming originals
are available. Verification evidence is bound to the returned runnable hash and
does not establish overall visual fidelity or accessibility.

Before changing files, inspect the target repository's package manager,
framework, styling conventions, component structure, and verification
commands. Briefly report the Tenor component name and version, its public props
and dependencies, and the files you expect to change.

## Implement

Preserve the component's appearance, interactions, responsive behavior,
assets, and public interface. Adapt file placement, imports, and dependency
installation to the repository rather than redesigning the component.

Do not replace real imagery or vector assets with placeholders. Do not import
Tenor's application-shell packages or private host theme. Keep component styles
scoped and portable.

Add or update a small usage example only where the repository convention
expects one. Avoid unrelated refactors.

## Verify

Run the most relevant typecheck, lint, tests, and build checks available in the
repository. If the package contract conflicts with a repository constraint,
explain the conflict before changing the public contract.

Use `tenor_check_version` when the user asks whether a previously implemented
component is current. Report version and prop-contract changes separately.

## Bring repository code into Tenor

Use `tenor_import_component` only when the user asks to send a component into
Tenor. Review the intended source first. Include only the component and synthetic
example data; exclude credentials, environment files, proprietary data from other
projects, and unrelated repository files. Preserve the requested design and behavior.

1. Call `tenor_get_capabilities`. Use the real repository source. Prepare a demo
   entry with required providers, props and synthetic data; preserve the component,
   CSS, fonts, assets and interactive state. Never recreate it from a screenshot.
2. For multi-file components, use this plugin's `../../scripts/prepare-import.mjs` helper
   (relative to this skill directory) to bundle installed browser
   dependencies without executing project code or installing packages. Supply
   compiled app CSS for Tailwind/PostCSS. Only React and React DOM runtime modules
   remain external. Keep original files in `source_package`, record exact dependency
   versions, and disclose adaptations. Unavailable server/native/framework services
   need an explicit adapter; never silently stub behavior or replace assets.
3. Call `tenor_validate_import` before saving. This checks source, not rendering.
4. To target an existing canvas, call `tenor_list_canvases` then `tenor_get_canvas`.
   Use its exact `canvas_id`; names are not unique. Omit `canvas_id` to create a new
   canvas, optionally with a separate `canvas_name`. Omitting placement on an
   existing canvas puts the component beside existing content.
5. Imports require `mcp:components:create`. Existing-canvas imports and management
   require separate `mcp:canvases:manage` consent. Old read/create grants retain
   their original permissions. Reauthorize through OAuth if challenged.
6. Create a UUID `idempotency_key`, retain it, and reuse it with identical content
   after a timeout. Never use a new key just to retry a save.
7. Open the returned exact `canvas_url` or matching `desktop_url`. Saving checks
   syntax; `render_status` and `interaction_status` remain `not_verified` until
   separately tested. Compare the actual preview with the source at relevant
   sizes, exercise pointer/keyboard states, animation, overlays and assets, and
   check console errors. Report any missing app CSS or service-backed behavior.

## Manage canvases and versions

With explicit canvas-management consent, use `tenor_create_canvas`,
`tenor_rename_canvas`, `tenor_rename_component`, and `tenor_move_component`.
Moving keeps source and history. Use `tenor_get_canvas` to choose coordinates
and copy that component's exact `updated_at` into `expected_updated_at` when
calling `tenor_move_component`. Read `tenor_get_component_history` immediately
before `tenor_update_component`; pass both the latest `expected_version` and its
exact `component_updated_at` as `expected_updated_at`. Updates append a version.
If Tenor reports a version or timestamp conflict, read the canvas/history again,
review the newer state, and retry with a new request key only after reconciling
the requested change. Never replace either precondition with the current time or
blindly overwrite the new state. Provide the updated `source_package` on each
source-based update. Reading a specific version returns its runnable code and
original import files, if supplied.

These controls do not delete content or change sharing/access permissions.
Manage Agent access explicitly for each component in the application's Share
menu. OAuth consent and MCP imports never enable it; read the receipt's
`agent_access` field and do not assume a newly created component is shared.
The toggle controls shared-component discovery and handoff tools. Separately
approved canvas management can read and edit owned components even with Agent
access off; removing that connection in Integrations revokes management access.

A manually configured connection can request the new capabilities with:
`codex mcp login <server-name> --scopes mcp:tools,mcp:components:create,mcp:canvases:manage`.
Stop on revoked permission or an incompatible plan.

## General preparation and verification

Use `tenor_analyze_import` to identify runtime requirements before saving.
The bundled helper accepts `--manifest /path/import.json` with adapter
`react-browser-v1`, an `export` name, JSON `props`, local `providers` (module,
export, props) and public `environment` values. Preserve real providers and
behavior; use a source harness for function props or application services.

For larger source trees, prepare with `--archive true`. Hash the exact JSON bytes,
call `tenor_prepare_package_upload`, PUT those bytes as application/json to the
signed URL, then call `tenor_import_package` with its archive ID. Do not expose
signed URLs in logs. Check capabilities for limits: archives do not increase the
2 MB runnable-code limit. Retain archive ID and the original idempotency key.

Use `tenor_verify_component` with the exact saved version and a bounded plan of
CSS-selector actions/assertions. It exercises the saved source in an isolated
browser and returns diagnostics and a screenshot. Repeat using the same request
ID to read its receipt; history reports whether evidence matches saved source.
A pass covers only the supplied checks. Compare against the original component
before claiming visual fidelity, and disclose unsupported services or interactions.

## Package-backed builds and repairs

Package installation is unavailable in this launch candidate. The standalone
`build-import.mjs` CLI, its compatibility export, the hosted workspace runner,
and the Tenor Mac executor all fail closed until a hard VM/container boundary
is available. Self-contained React components remain importable through the
normal MCP workflow above.

Use `tenor_get_import_build_workflow` for the current boundary and
`tenor_resolve_import_dependencies` to resolve exact pins from the original
manifest/lockfile without installing packages. Package-backed work must wait for
that isolated builder. Retain original source, destination, dependencies and
interactions for a later retry. Never replace unsupported behavior with
placeholders to obtain a passing build.

After a successful build/import, run exact-version browser interaction checks
and compare against the original. For an update, read the current history,
copy `component_updated_at` exactly into `expected_updated_at`, use its
`expected_version`, and submit a fresh update key. On conflict, reload the
canvas/history and reconcile newer source before retrying.
