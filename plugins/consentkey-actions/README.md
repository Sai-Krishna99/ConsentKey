# ConsentKey Actions SDK Source

This folder contains the first-pass Logitech Actions SDK source for the console-first ConsentKey flow.

Current scope:
- `MX Creative Console` is the primary hardware surface
- `Actions Ring` is the contextual on-screen surface
- `MX Master 4` is intentionally treated as a future extension

Important constraints:
- Logitech's Node.js Actions SDK is currently documented as `Windows-only` during alpha
- The recommended setup flow is to generate the base plugin with:

```bash
npx @logitech/plugin-toolkit create consentkey-actions-windows
```

Then place that generated wrapper project in `plugins/consentkey-actions-windows/`, copy the `src/` files from this folder into the wrapper project, and install the SDK dependencies there.

Expected local broker:
- The plugin actions call the local Next.js consent broker exposed by this repo:
  - `GET /api/consent/state`
  - `POST /api/consent/request`
  - `POST /api/consent/approve`
  - `POST /api/consent/deny`

Recommended first demo flow:
1. Assign `Request HIGH Consent` to an MX Creative Console key.
2. Assign `Approve Pending Consent` to a second key or an Actions Ring slot.
3. Assign `Deny Pending Consent` to a third key or an Actions Ring slot.
4. Run the Next app locally and verify the plugin can create and resolve requests against `localhost:3000`.

The code here assumes the SDK exposes `PluginSDK`, `CommandAction`, and `sdk.registerAction(...)`, which matches Logitech's published Node.js API docs.
