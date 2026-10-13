# Tenor for Cursor

Bring React components into your Tenor creative workspace, refine linked local
previews in Cursor, and explicitly save new versions to the same canvas.

## Install

When the reviewed marketplace listing is available, install **Tenor** from
Cursor's Customize panel. This package alone does not establish marketplace
approval. For direct MCP access, add the configuration below to project
`.cursor/mcp.json` or user `~/.cursor/mcp.json`, or use the install link:

[Add Tenor MCP to Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=tenor&config=eyJ1cmwiOiJodHRwczovL3Rlbm9yLmRlc2lnbi9hcGkvbWNwIiwiYXV0aCI6eyJzY29wZXMiOlsibWNwOnRvb2xzIiwibWNwOmNvbXBvbmVudHM6Y3JlYXRlIiwibWNwOmNhbnZhc2VzOm1hbmFnZSJdLCJDTElFTlRfSUQiOiJ0bnJfY2xpZW50X2pHTHlMeDhxcFJxQ01jMUlITkRsXzREdWhpOTBxNTc5Q2N5Z3JNeDJxZEkifX0%3D)

```json
{
  "mcpServers": {
    "tenor": {
      "url": "https://tenor.design/api/mcp",
      "auth": {
        "scopes": [
          "mcp:tools",
          "mcp:components:create",
          "mcp:canvases:manage"
        ],
        "CLIENT_ID": "tnr_client_jGLyLx8qpRqCMc1IHNDl_4Duhi90q579CcygrMx2qdI"
      }
    }
  }
}
```

Sign in through Tenor's browser OAuth screen and review its permissions.
No permanent API key is required. The configured public OAuth client ID is not an access token or secret. Older read-only grants may need reconnecting
for imports or canvas management. A direct MCP connection does not install the
plugin's skills; a marketplace or local plugin install does.

If you already have a direct Tenor MCP connection, enable just one production
connection when installing this plugin to avoid duplicate tools. Keep any
staging connection distinctly named and use the exact environment requested.

## Use

- “Show the components I've shared from Tenor.”
- “Import this React component into a new private Tenor canvas.”
- “Open this saved Tenor component in a linked Cursor preview.”
- After an edit in the returned workspace, run its `/sync-tenor` command.

The `tenor-component` skill covers discovery, source-preserving imports,
canvas management and conflict-checked versions. The `tenor-cursor` skill
covers linked previews and explicit Cursor sync. Local edits stay local until
you ask to save. Updates append history to the same component.

Tenor's Share menu controls Agent access. Imports stay private; OAuth consent
does not enable sharing. Canvas management is a separate permission that
allows access to owned components even when Agent access is off. Disconnect
the connection in Tenor Integrations to revoke access.

Use the saved version's original source package when available. A linked local
preview may use an already bundled runnable source; do not claim that it
automatically restores the original application's backend or services. Source
validation is separate from rendered fidelity and interaction verification.

## Requirements and limits

A Tenor account with the applicable access and explicit OAuth consent is
required. Linked previews require the local runtime and dependencies specified
by the returned workspace. Review those files before executing them. The
bundled import-preparation helper uses an already installed source-repository
bundler; it never installs dependencies or executes the application.

Tenor's package-installation/build workflow remains disabled until its isolated
builder is available. Self-contained React imports and linked editing use the
existing supported paths. Do not substitute placeholders for unsupported
services or dependencies.

MCP Apps and embedded editing depend on the host and separately consented
editor access. This plugin does not promise embedded editor, CLI or cloud
parity. Browser links remain available through `tenor_open_workspace`.

## Troubleshooting

- No shared components: enable Agent access for the intended component in
  Tenor's Share menu; an empty list does not mean an empty account.
- Insufficient permission: reconnect through OAuth and approve only the
  workflow you want. Do not create replacement API keys.
- Version conflict: preserve local edits, reload the current Tenor history,
  and reconcile changes before retrying.
- Connection errors: inspect Cursor's MCP Logs and your organization's MCP
  policy. Production uses exactly `https://tenor.design/api/mcp`.

## Data and support

The remote MCP service receives requested component source and tool arguments
under the signed-in account's permissions. This package contains instructions
and source-preparation helpers; it does not bundle customer data, credentials,
or Tenor's private application source. Uploaded components are stored in Tenor.
Tenor generation operations can consume account usage and require their own
permission; ordinary package installation does not purchase anything.

[Privacy](https://tenor.design/privacy) ·
[Terms](https://tenor.design/terms) ·
[Support](mailto:hello@tenor.design)

The plugin code and instructions are distributed under the included MIT
license. Tenor branding remains subject to its owner's trademark rights.
