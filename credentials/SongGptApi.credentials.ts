import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class SongGptApi implements ICredentialType {
	name = 'songGptApi';

	displayName = 'SongGPT API';

	documentationUrl = 'https://www.songgpt.ai/open-api/docs';

	icon: Icon = {
		light: 'file:../nodes/SongGpt/songgpt.svg',
		dark: 'file:../nodes/SongGpt/songgpt.dark.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'API key starting with sk_api_, created in your SongGPT account',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials?.apiKey}}',
			},
		},
	};

	// The task status endpoint has no additional charge, so it is used to validate the API key.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://www.songgpt.ai/openapi/v1',
			url: '/music/tasks/status',
			method: 'POST',
			body: { unique_ids: ['mst_credential_test'] },
		},
	};
}
