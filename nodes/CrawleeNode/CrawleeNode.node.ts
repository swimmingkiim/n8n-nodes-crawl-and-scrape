import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { CheerioCrawler } from 'crawlee';

export class CrawleeNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Crawlee',
		name: 'crawleeNode',
		group: ['transform'],
		version: 1,
		description: 'Crawl websites and extract data',
		defaults: {
			name: 'Crawlee',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				description: 'The URL to crawl or scrape',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Extract Links',
						value: 'extractLinks',
						description: 'Extract all links from the page',
						action: 'Extract all links from the page',
					},
					{
						name: 'Extract Text',
						value: 'extractText',
						description: 'Extract text content from the page',
						action: 'Extract text content from the page',
					},
					{
						name: 'Extract HTML',
						value: 'extractHtml',
						description: 'Extract raw HTML content from the page',
						action: 'Extract raw HTML content from the page',
					},
				],
				default: 'extractLinks',
			},
			{
				displayName: 'Max Depth',
				name: 'maxDepth',
				type: 'number',
				default: 1,
				required: true,
				displayOptions: {
					show: {
						operation: ['extractLinks'],
					},
				},
				description: 'Maximum depth of crawling',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const url = this.getNodeParameter('url', itemIndex, '') as string;
				const operation = this.getNodeParameter('operation', itemIndex, '') as string;

				if (operation === 'extractLinks') {
					const crawledData: any[] = [];

					const crawler = new CheerioCrawler({
						maxRequestsPerCrawl: 100,
						async requestHandler({ request, $, log }) {
							log.debug(`Crawling ${request.url}`);

							const links: string[] = [];
							$('a[href]').each((_, el: any) => {
								const href = $(el).attr('href');
								if (href) {
									try {
										links.push(new URL(href, request.url).href);
									} catch (error) {
										// Skip invalid URLs
									}
								}
							});

							crawledData.push({
								url: request.url,
								links,
							});
						},
					});

					await crawler.run([url]);
					const uniqueLinks = [...new Set(crawledData.flatMap(item => item.links))];
					returnData.push({
						json: {
							status: 'success',
							message: 'Crawling finished',
							data: {
								url,
								links: uniqueLinks,
							},
						},
					});
				} else if (operation === 'extractText') {
					const crawler = new CheerioCrawler({
						async requestHandler({ request, $, log }) {
							log.debug(`Extracting text from ${request.url}`);

							const text = $('body').text().trim();
							returnData.push({
								json: {
									status: 'success',
									message: 'Text extraction finished',
									data: {
										url: request.url,
										text,
									},
								},
							});
						},
					});

					await crawler.run([url]);
				} else if (operation === 'extractHtml') {
					const crawler = new CheerioCrawler({
						async requestHandler({ request, body, log }) {
							log.debug(`Extracting HTML from ${request.url}`);

							returnData.push({
								json: {
									status: 'success',
									message: 'HTML extraction finished',
									data: {
										url: request.url,
										html: body,
									},
								},
							});
						},
					});

					await crawler.run([url]);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
				} else {
					if (error.context) {
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return [returnData];
	}
}
