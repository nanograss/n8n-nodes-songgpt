# n8n-nodes-songgpt

An n8n community node package for the SongGPT AI Music API. Generate songs, extend or cover library audio, replace a song section, and read asynchronous task results from n8n workflows.

[n8n](https://n8n.io/) is a workflow automation platform.

## Operations

- **Generate Music** — create songs from a description (simple mode) or from lyrics and style (custom mode).
- **Extend Song** — continue a library song or an existing uploaded-audio reference from a selected position.
- **Cover Song** — re-record a library song or existing uploaded-audio reference in a new style while keeping its melody.
- **Replace Section** — replace a time range using full lyrics and a new style.
- **Get Task Status** — read status and song metadata, including audio and cover URLs when available.

Creation operations are asynchronous. They return a `unique_id` (for example `mst_...`) and a numeric `task_id` while the task is pending. Add an n8n Wait node, then call **Get Task Status** with the returned `unique_id`. A task is settled when the API returns `is_complete: true`; `audio_url` and `cover_url` may be null until transfer to SongGPT storage is complete. The status operation emits one n8n item per task.

Extend and Cover accept either a SongGPT library song ID or an upload ID. The current public API reference does not include an audio-upload operation, so upload IDs must come from an existing website upload. An API-only workflow can use `songs[].id` from generated results to extend a song or create a cover.

## Installation

Install the package through the community-node installation flow for your n8n instance, using the npm package name `n8n-nodes-songgpt`. For n8n Cloud discovery, the package must first be reviewed and verified by n8n.

## Credentials

Create a SongGPT API key (it starts with `sk_api_`) in the [SongGPT API dashboard](https://www.songgpt.ai/open-api). In n8n, create a **SongGPT API** credential and paste the key into the password field. Requests use the `Authorization: Bearer` header. The credential is stored by n8n; do not add API keys to workflow fields or exported examples.

The API has a separate prepaid balance from SongGPT website plans and MCP credits. Generate, extend, and cover cost $0.10 per call and return 2 songs; replacing a section costs $0.05 and returns 1 song. Task status requests have no additional charge. Failed, timed-out, or moderation-blocked tasks are refunded. Review the current [API documentation](https://www.songgpt.ai/open-api/docs) and [pricing](https://www.songgpt.ai/open-api) before running workflows.

## Usage

1. Add the SongGPT node to a workflow and select a credential.
2. Choose a creation operation and provide its required values. The only documented model is `songgpt-v1`.
3. Connect a Wait node after a creation operation. Songs are usually ready in 1-2 minutes.
4. Add another SongGPT node using **Get Task Status** and map the prior `unique_id` into Task IDs. Repeat the Wait/status step until `is_complete` is true.
5. Use `songs[].audio_url`, `songs[].cover_url`, `songs[].lyrics`, `songs[].id`, and other returned song fields in later workflow steps.

For multiple task IDs, enter a comma-separated list of 1 to 20 `unique_id` values.

An importable example workflow is available at [examples/generate-and-check-task.json](./examples/generate-and-check-task.json). Select your saved SongGPT API credential in both SongGPT nodes after importing. The example checks the task once after two minutes; repeat the Wait and status check if `is_complete` is still false.

## SongGPT MCP

SongGPT also provides a [Model Context Protocol (MCP) server](https://www.songgpt.ai/mcp) at `https://www.songgpt.ai/api/mcp` for agents such as Claude, ChatGPT, Cursor, Gemini CLI, Claude Code, and Codex. That connector is separate from this n8n community node, which calls the HTTP API documented at [https://www.songgpt.ai/open-api/docs](https://www.songgpt.ai/open-api/docs).

## Compatibility

This package uses the n8n Node API v1 and has no external runtime dependencies. Verify it against your target n8n version before publishing.

## Development

Install development dependencies and use the included scripts:

    npm install
    npm run build
    npm run lint
    npm run dev

## Resources

- [SongGPT API product page](https://www.songgpt.ai/open-api)
- [SongGPT API documentation](https://www.songgpt.ai/open-api/docs)
- [SongGPT API OpenAPI reference](https://www.songgpt.ai/open-api/reference.json)
- [SongGPT MCP page](https://www.songgpt.ai/mcp)
- [n8n community-node documentation](https://docs.n8n.io/integrations/community-nodes/)
- [n8n node development documentation](https://docs.n8n.io/connect/create-nodes/)

## License

MIT. See [LICENSE](./LICENSE).
