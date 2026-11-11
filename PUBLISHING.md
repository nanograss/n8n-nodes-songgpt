# Publishing and n8n verification

## Before the first release

1. Confirm that the repository URL in `package.json` matches https://github.com/nanograss/n8n-nodes-songgpt.
2. Confirm that the npm publisher and GitHub repository owners are authorized to publish this integration.
3. Install dependencies and run the node checks described by the n8n documentation. Test each operation with a dedicated SongGPT API key and confirm completed task results before release.
4. Configure npm Trusted Publishing for the GitHub Actions workflow named `publish.yml`, or configure the `NPM_TOKEN` Actions secret as described by npm.
5. Push the package repository to GitHub. Publish tagged releases through the included GitHub Actions workflow so npm attaches provenance.
6. After the package is publicly available on npm, submit its full npm package URL at https://creators.n8n.io/nodes.

## Review declarations

The Creator Portal asks the submitter to confirm node authorship and official representation of the integration. Check each statement only when it is true for the signed-in account.

## Current package handoff state

- The package source and GitHub Actions publishing workflow are prepared.
- The `repository.url` field is configured as https://github.com/nanograss/n8n-nodes-songgpt.git.
- No API key is included. Live API calls and end-to-end behavior have not been verified in this package draft.
- This local package has not been published to npm or submitted to n8n.
