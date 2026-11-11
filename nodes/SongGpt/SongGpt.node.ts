import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const API_BASE_URL = 'https://www.songgpt.ai/openapi/v1';

type Operation = 'generate' | 'extend' | 'cover' | 'replace' | 'taskStatus';

interface SongGptEnvelope {
	code: number;
	message?: string;
	data?: IDataObject;
}

export class SongGpt implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SongGPT',
		name: 'songGpt',
		icon: { light: 'file:songgpt.svg', dark: 'file:songgpt.dark.svg' },
		group: ['transform'],
		version: [1],
		subtitle: '={{$parameter["operation"]}}',
		description: 'Generate and edit music with the SongGPT API.',
		defaults: { name: 'SongGPT' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'songGptApi', required: true }],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Cover Song',
						value: 'cover',
						description: 'Re-record a song in a new style while keeping its melody',
						action: 'Create a cover in a new style while keeping the melody',
					},
					{
						name: 'Extend Song',
						value: 'extend',
						description: 'Continue a song from a selected point',
						action: 'Continue a song from a selected point',
					},
					{
						name: 'Generate Music',
						value: 'generate',
						description: 'Create songs from a description or your own lyrics',
						action: 'Create songs from a description or your own lyrics',
					},
					{
						name: 'Get Task Status',
						value: 'taskStatus',
						description: 'Read task progress and completed song audio',
						action: 'Read task progress and completed song audio',
					},
					{
						name: 'Replace Section',
						value: 'replace',
						description: 'Replace a selected section using new lyrics and style',
						action: 'Replace a selected section using new lyrics and style',
					},
				],
				default: 'generate',
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{ name: 'Custom', value: 'custom' },
					{ name: 'Simple', value: 'simple' },
				],
				default: 'simple',
				required: true,
				displayOptions: { show: { operation: ['cover', 'extend', 'generate'] } },
				description: 'Simple describes the music; custom supplies lyrics and style',
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				options: [{ name: 'SongGPT V1', value: 'songgpt-v1' }],
				default: 'songgpt-v1',
				displayOptions: { show: { operation: ['cover', 'extend', 'generate', 'replace'] } },
				description: 'Model identifier. songgpt-v1 is currently the only available value.',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				placeholder: 'A warm acoustic folk song about a journey',
				displayOptions: { show: { operation: ['cover', 'extend', 'generate'] } },
				description: 'Description in simple mode or lyrics in custom mode. Requiredness and length limits depend on the mode and operation.',
			},
			{
				displayName: 'Instrumental',
				name: 'instrumental',
				type: 'boolean',
				default: false,
				displayOptions: { show: { operation: ['cover', 'extend', 'generate'] } },
				description: 'Whether to create music without vocals',
			},
			{
				displayName: 'Style',
				name: 'style',
				type: 'string',
				default: '',
				placeholder: 'Acoustic folk, warm guitar, gentle drums',
				displayOptions: { show: { operation: ['cover', 'extend', 'generate', 'replace'] } },
				description: 'Style description, required in custom mode. Maximum 1,000 characters.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				placeholder: 'Journey Home',
				displayOptions: { show: { operation: ['cover', 'extend', 'generate', 'replace'] } },
				description: 'Song title, required in custom mode. The API allows up to 80 characters for generate, 100 for extend and cover, and 255 for replace.',
			},
			{
				displayName: 'Vocal Gender',
				name: 'vocalGender',
				type: 'options',
				options: [
					{ name: 'Female', value: 'f' },
					{ name: 'Male', value: 'm' },
					{ name: 'No Preference', value: '' },
				],
				default: '',
				displayOptions: { show: { operation: ['cover', 'extend', 'generate'] } },
				description: 'Optional vocal style hint used in custom mode',
			},
			{
				displayName: 'Style Weight',
				name: 'styleWeight',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 1 },
				default: 0,
				displayOptions: { show: { operation: ['cover', 'extend', 'generate'] } },
				description: 'Optional weight from 0 to 1, used in custom mode. A value of 0 is omitted so the API can apply its default.',
			},
			{
				displayName: 'Weirdness',
				name: 'weirdness',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 1 },
				default: 0,
				displayOptions: { show: { operation: ['cover', 'extend', 'generate'] } },
				description: 'Optional creativity level from 0 to 1, used in custom mode. A value of 0 is omitted so the API can apply its default.',
			},
			{
				displayName: 'Audio Weight',
				name: 'audioWeight',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 1 },
				default: 0,
				displayOptions: { show: { operation: ['cover', 'extend'] } },
				description: 'Optional source-audio influence from 0 to 1, used for custom extensions and covers. A value of 0 is omitted.',
			},
			{
				displayName: 'Negative Tags',
				name: 'negativeTags',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['generate', 'replace'] } },
				description: 'Styles to exclude. Maximum 500 characters for generate and 1,000 for replace.',
			},
			{
				displayName: 'Duration (Seconds)',
				name: 'duration',
				type: 'number',
				default: 0,
				displayOptions: { show: { operation: ['generate'] } },
				description: 'Optional target duration from 10 to 360 seconds, only in custom mode. Leave at 0 to omit.',
			},
			{
				displayName: 'Duration (Milliseconds)',
				name: 'durationMs',
				type: 'number',
				default: 0,
				displayOptions: { show: { operation: ['generate'] } },
				description:
					'Optional duration from 3,000 to 600,000 milliseconds. Use this or Duration (Seconds), not both. Leave at 0 to omit',
			},
			{
				displayName: 'Number of Songs',
				name: 'n',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 3 },
				default: 0,
				displayOptions: { show: { operation: ['generate'] } },
				description:
					'Number of results from 1 to 3. Sent only for non-instrumental simple generation. Leave at 0 to omit',
			},
			{
				displayName: 'Source Type',
				name: 'sourceType',
				type: 'options',
				options: [
					{ name: 'Library Song', value: 'library' },
					{ name: 'Uploaded Audio', value: 'upload' },
				],
				default: 'library',
				required: true,
				displayOptions: { show: { operation: ['cover', 'extend'] } },
				description: 'Choose which SongGPT source identifier to send',
			},
			{
				displayName: 'Source ID',
				name: 'sourceId',
				type: 'string',
				required: true,
				default: '',
				placeholder: '123456789',
				displayOptions: { show: { operation: ['cover', 'extend'] } },
				description: 'Numeric library song ID or upload ID, matching Source Type. This API release does not include an upload operation, so upload IDs must come from an existing website upload.',
			},
			{
				displayName: 'Continue At (Seconds)',
				name: 'continueAt',
				type: 'number',
				typeOptions: { minValue: 0.01 },
				required: true,
				default: 30,
				displayOptions: { show: { operation: ['extend'] } },
				description: 'Position in seconds from which to extend the source song. Must be greater than 0.',
			},
			{
				displayName: 'Extend Type',
				name: 'extendType',
				type: 'options',
				options: [
					{ name: 'Head', value: 'head' },
					{ name: 'Tail', value: 'tail' },
				],
				default: 'tail',
				displayOptions: { show: { operation: ['extend'] } },
				description: 'Whether the new section extends the end or the beginning',
			},
			{
				displayName: 'Source Song ID',
				name: 'sourceSongId',
				type: 'string',
				required: true,
				default: '',
				placeholder: '123456789',
				displayOptions: { show: { operation: ['replace'] } },
				description: 'Numeric library song ID from the songs array in task results, not a task ID',
			},
			{
				displayName: 'Full Lyrics',
				name: 'fullLyrics',
				type: 'string',
				typeOptions: { rows: 5 },
				required: true,
				default: '',
				displayOptions: { show: { operation: ['replace'] } },
				description: 'The complete edited lyrics, not just the replacement section',
			},
			{
				displayName: 'Replace From (Seconds)',
				name: 'infillStartS',
				type: 'number',
				typeOptions: { minValue: 0 },
				required: true,
				default: 0,
				displayOptions: { show: { operation: ['replace'] } },
				description: 'Start time of the section to replace',
			},
			{
				displayName: 'Replace Until (Seconds)',
				name: 'infillEndS',
				type: 'number',
				typeOptions: { minValue: 0.01 },
				required: true,
				default: 15,
				displayOptions: { show: { operation: ['replace'] } },
				description: 'End time of the section to replace. The section must span 10-60 seconds, cover no more than 50% of the source, and end within the source duration.',
			},
			{
				displayName: 'Task IDs',
				name: 'uniqueIds',
				type: 'string',
				required: true,
				default: '={{$json.unique_id}}',
				placeholder: 'mst_example',
				displayOptions: { show: { operation: ['taskStatus'] } },
				description: 'One to 20 unique_id values returned by a creation request, separated by commas. Connect this operation after a Wait node to poll an async creation task.',
			},
			{
				displayName: 'Workspace ID',
				name: 'workspaceId',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['cover', 'extend', 'generate', 'replace'] } },
				description: 'Optional workspace unique_id starting with mws_. Omit to use the default workspace.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const inputItems = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < inputItems.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as Operation;
				const body: IDataObject = {};
				const addOptional = (key: string, value: unknown): void => {
					if (value !== undefined && value !== null && value !== '') {
						body[key] = value as never;
					}
				};
				const addString = (parameter: string, key = parameter): void => {
					addOptional(key, this.getNodeParameter(parameter, itemIndex, '') as string);
				};
				const addNumberWhenPositive = (parameter: string, key = parameter): number => {
					const value = this.getNodeParameter(parameter, itemIndex, 0) as number;
					if (value > 0) addOptional(key, value);
					return value;
				};
				const parsePositiveInteger = (parameter: string, label: string): number => {
					const raw = String(this.getNodeParameter(parameter, itemIndex, '')).trim();
					if (!/^[1-9]\d*$/.test(raw)) {
						throw new NodeOperationError(this.getNode(), `${label} must be a positive integer.`, {
							itemIndex,
						});
					}
					return Number(raw);
				};

				let endpoint: string;
				if (operation === 'generate') {
					endpoint = '/music/generate';
					const mode = this.getNodeParameter('mode', itemIndex, 'simple') as string;
					const instrumental = this.getNodeParameter('instrumental', itemIndex, false) as boolean;
					body.mode = mode;
					addString('model');
					addString('prompt');
					body.instrumental = instrumental;
					addString('style');
					addString('title');
					addString('vocalGender', 'vocal_gender');
					addNumberWhenPositive('styleWeight', 'style_weight');
					addNumberWhenPositive('weirdness');
					addString('negativeTags', 'negative_tags');
					const duration = addNumberWhenPositive('duration');
					const durationMs = addNumberWhenPositive('durationMs', 'duration_ms');
					if (duration > 0 && (duration < 10 || duration > 360)) {
						throw new NodeOperationError(
							this.getNode(),
							'Duration (Seconds) must be between 10 and 360.',
							{ itemIndex },
						);
					}
					if (durationMs > 0 && (durationMs < 3000 || durationMs > 600000)) {
						throw new NodeOperationError(
							this.getNode(),
							'Duration (Milliseconds) must be between 3,000 and 600,000.',
							{ itemIndex },
						);
					}
					if (duration > 0 && durationMs > 0) {
						throw new NodeOperationError(
							this.getNode(),
							'Use Duration (Seconds) or Duration (Milliseconds), not both.',
							{ itemIndex },
						);
					}
					const songCount = this.getNodeParameter('n', itemIndex, 0) as number;
					if (songCount !== 0) {
						if (!Number.isInteger(songCount) || songCount < 1 || songCount > 3) {
							throw new NodeOperationError(
								this.getNode(),
								'Number of Songs must be between 1 and 3, or 0 to omit.',
								{ itemIndex },
							);
						}
						if (mode === 'simple' && !instrumental) {
							body.n = songCount;
						}
					}
					addString('workspaceId', 'workspace_id');
				} else if (operation === 'extend' || operation === 'cover') {
					endpoint = operation === 'extend' ? '/music/extend' : '/music/remix';
					body.mode = this.getNodeParameter('mode', itemIndex, 'simple') as string;
					addString('model');
					const sourceType = this.getNodeParameter('sourceType', itemIndex, 'library') as string;
					if (sourceType !== 'library' && sourceType !== 'upload') {
						throw new NodeOperationError(
							this.getNode(),
							'Source Type must be Library Song or Uploaded Audio.',
							{ itemIndex },
						);
					}
					const sourceId = parsePositiveInteger('sourceId', 'Source ID');
					body.source =
						sourceType === 'library'
							? ({ type: 'library', song_id: sourceId } as never)
							: ({ type: 'upload', upload_id: sourceId } as never);
					addString('prompt');
					body.instrumental = this.getNodeParameter('instrumental', itemIndex, false) as boolean;
					addString('style');
					addString('title');
					addString('vocalGender', 'vocal_gender');
					addNumberWhenPositive('styleWeight', 'style_weight');
					addNumberWhenPositive('weirdness');
					addNumberWhenPositive('audioWeight', 'audio_weight');
					addString('workspaceId', 'workspace_id');
					if (operation === 'extend') {
						const continueAt = this.getNodeParameter('continueAt', itemIndex, 30) as number;
						if (continueAt <= 0) {
							throw new NodeOperationError(
								this.getNode(),
								'Continue At must be greater than zero.',
								{ itemIndex },
							);
						}
						body.continue_at = continueAt;
						body.extend_type = this.getNodeParameter('extendType', itemIndex, 'tail') as string;
					}
				} else if (operation === 'replace') {
					endpoint = '/music/replace';
					addString('model');
					body.source_song_id = parsePositiveInteger('sourceSongId', 'Source Song ID');
					addString('fullLyrics', 'full_lyrics');
					addString('style');
					addString('title');
					body.infill_start_s = this.getNodeParameter('infillStartS', itemIndex, 0) as number;
					body.infill_end_s = this.getNodeParameter('infillEndS', itemIndex, 15) as number;
					if ((body.infill_end_s as number) <= (body.infill_start_s as number)) {
						throw new NodeOperationError(
							this.getNode(),
							'Replace Until must be greater than Replace From.',
							{ itemIndex },
						);
					}
					addString('negativeTags', 'negative_tags');
					addString('workspaceId', 'workspace_id');
				} else {
					endpoint = '/music/tasks/status';
					const rawIds = this.getNodeParameter('uniqueIds', itemIndex, '') as string;
					const uniqueIds = rawIds
						.split(/[\s,]+/)
						.map((id) => id.trim())
						.filter(Boolean);
					if (
						uniqueIds.length < 1 ||
						uniqueIds.length > 20 ||
						uniqueIds.some((id) => id.length > 50)
					) {
						throw new NodeOperationError(
							this.getNode(),
							'Enter between 1 and 20 task unique_id values (each up to 50 characters), separated by commas.',
							{ itemIndex },
						);
					}
					body.unique_ids = uniqueIds as never;
				}

				const requestOptions: IHttpRequestOptions = {
					method: 'POST',
					url: `${API_BASE_URL}${endpoint}`,
					body,
					json: true,
					ignoreHttpStatusErrors: true,
				};
				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'songGptApi',
					requestOptions,
				)) as SongGptEnvelope;

				if (response.code !== 0) {
					throw new NodeOperationError(
						this.getNode(),
						response.message || 'SongGPT API returned an unsuccessful response.',
						{ itemIndex },
					);
				}
				const responseData = response.data ?? {};
				if (operation === 'taskStatus' && Array.isArray(responseData.tasks)) {
					for (const task of responseData.tasks) {
						if (typeof task === 'object' && task !== null && !Array.isArray(task)) {
							returnData.push({ json: task as IDataObject, pairedItem: { item: itemIndex } });
						}
					}
					if (responseData.tasks.length === 0) {
						returnData.push({ json: { tasks: [] }, pairedItem: { item: itemIndex } });
					}
				} else {
					returnData.push({ json: responseData, pairedItem: { item: itemIndex } });
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				if (this.continueOnFail()) {
					returnData.push({
						json: { ...inputItems[itemIndex].json, error: errorMessage },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), errorMessage, { itemIndex });
			}
		}

		return [returnData];
	}
}
