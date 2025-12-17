import { NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { CheerioCrawler, PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import * as cheerio from 'cheerio';

function appendTimestampToUrl(url: string): string {
	const separator = url.includes('?') ? '&' : '?';
	return `${url}${separator}_=${Date.now()}`;
}

export class CrawleeNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Crawl and Scrape',
		name: 'crawleeNode',
		icon: 'file:crawl-and-scrape-logo.svg',
		group: ['transform'],
		version: 1,
		description: 'Crawl websites and extract data',
		defaults: {
			name: 'Crawl and Scrape',
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
			{
				displayName: 'Proxy URLs',
				name: 'proxyUrls',
				type: 'string',
				default: '',
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						operation: ['extractLinks', 'extractText', 'extractHtml'],
					},
				},
				description:
					'A list of proxy URLs to use, one per line. For example: http://user:password@proxy.example.com:8080.',
			},
			{
				displayName: 'Use Browser (Playwright)',
				name: 'useBrowser',
				type: 'boolean',
				default: false,
				description: 'Whether to use a headless browser (Playwright) for crawling. Useful for sites that require JavaScript.',
			},
			{
				displayName: 'Header Input Type',
				name: 'headerInputType',
				type: 'options',
				options: [
					{
						name: 'JSON',
						value: 'json',
					},
					{
						name: 'Raw String',
						value: 'string',
					},
				],
				default: 'json',
				description: 'How to provide headers: as a JSON object or a raw string',
			},
			{
				displayName: 'Custom Headers (JSON)',
				name: 'jsonHeaders',
				type: 'json',
				default: '{}',
				displayOptions: {
					show: {
						headerInputType: ['json'],
					},
				},
				description: 'JSON object of custom headers to send with requests',
			},
			{
				displayName: 'Custom Headers (Raw String)',
				name: 'rawHeaderString',
				type: 'string',
				default: '',
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						headerInputType: ['string'],
					},
				},
				description: 'Raw header string. Supports "Key: Value" format or alternating lines (Key on one line, Value on the next). Automatically strips quotes and ignores pseudo-headers (starting with :).',
			},
			{
				displayName: 'Cookies Input Type',
				name: 'cookieInputType',
				type: 'options',
				options: [
					{
						name: 'JSON',
						value: 'json',
					},
					{
						name: 'Raw String',
						value: 'string',
					},
				],
				default: 'json',
				description: 'How to provide cookies: as a JSON object or a raw string',
			},
			{
				displayName: 'Cookies (JSON)',
				name: 'jsonCookies',
				type: 'json',
				default: '{}',
				displayOptions: {
					show: {
						cookieInputType: ['json'],
					},
				},
				description: 'JSON object of cookies to send with requests',
			},
			{
				displayName: 'Cookies (Raw String)',
				name: 'rawCookieString',
				type: 'string',
				default: '',
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						cookieInputType: ['string'],
					},
				},
				description: 'Raw cookie string (e.g. key=value; key2=value2)',
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
				const useBrowser = this.getNodeParameter('useBrowser', itemIndex, false) as boolean;
				const proxyUrlsRaw = this.getNodeParameter('proxyUrls', itemIndex, '') as string;

				const headerInputType = this.getNodeParameter('headerInputType', itemIndex, 'json') as string;
				let jsonHeaders: Record<string, string> = {};

				const parseRawHeaders = (raw: string): Record<string, string> => {
					const lines = raw.split('\n').map(l => l.trim()).filter(l => l);
					const headers: Record<string, string> = {};

					// Strategy 1: Check for "Key: Value" lines
					const hasColons = lines.some(l => l.includes(':'));

					if (hasColons) {
						for (const line of lines) {
							const separatorIndex = line.indexOf(':');
							if (separatorIndex === -1) continue;

							let key = line.slice(0, separatorIndex).trim();
							const value = line.slice(separatorIndex + 1).trim();

							// Clean Key: remove quotes, internal spaces check
							key = key.replace(/['"]/g, '');

							// Header keys cannot contain spaces
							if (key.includes(' ')) continue;

							// Skip protocol headers and empty keys
							if (key.startsWith(':') || !key) continue;

							headers[key] = value;
						}
					} else {
						// Strategy 2: Alternating lines (Key \n Value)
						// This assumes even number of relevant lines or Key followed by Value
						for (let i = 0; i < lines.length; i += 2) {
							if (i + 1 >= lines.length) break;

							let key = lines[i].trim();
							const value = lines[i + 1].trim();

							// Clean Key
							key = key.replace(/['"]/g, '');

							// Validation
							if (key.includes(' ') || key.startsWith(':') || !key) continue;

							headers[key] = value;
						}
					}
					return headers;
				};

				if (headerInputType === 'json') {
					jsonHeaders = this.getNodeParameter('jsonHeaders', itemIndex, {}) as Record<string, string>;
				} else {
					const rawHeaderString = this.getNodeParameter('rawHeaderString', itemIndex, '') as string;
					if (rawHeaderString) {
						jsonHeaders = parseRawHeaders(rawHeaderString);
					}
				}


				const cookieInputType = this.getNodeParameter('cookieInputType', itemIndex, 'json') as string;
				let cookiesObj: Record<string, string> = {};

				if (cookieInputType === 'json') {
					cookiesObj = this.getNodeParameter('jsonCookies', itemIndex, {}) as Record<string, string>;
				} else {
					const rawString = this.getNodeParameter('rawCookieString', itemIndex, '') as string;
					if (rawString) {
						cookiesObj = rawString
							.split(';')
							.map((c) => c.trim())
							.filter((c) => c)
							.reduce((acc, curr) => {
								const separatorIndex = curr.indexOf('=');
								if (separatorIndex === -1) return acc;
								const key = curr.slice(0, separatorIndex);
								const value = curr.slice(separatorIndex + 1);
								acc[key] = value;
								return acc;
							}, {} as Record<string, string>);
					}
				}

				const proxyUrls = proxyUrlsRaw
					.split('\n')
					.map((url) => url.trim())
					.filter((url) => url);

				let proxyConfiguration: ProxyConfiguration | undefined;
				if (proxyUrls.length > 0) {
					proxyConfiguration = new ProxyConfiguration({ proxyUrls });
				}

				const processHeaders = (headers: Record<string, string>, cookies: Record<string, string>) => {
					const processedHeaders = { ...headers };
					const cookieKey = Object.keys(processedHeaders).find((k) => k.toLowerCase() === 'cookie');
					if (cookieKey) {
						const rawCookie = processedHeaders[cookieKey];
						const extractedCookies = rawCookie
							.split(';')
							.map((c) => c.trim())
							.filter((c) => c)
							.reduce((acc, curr) => {
								const separatorIndex = curr.indexOf('=');
								if (separatorIndex === -1) return acc;
								const key = curr.slice(0, separatorIndex);
								const value = curr.slice(separatorIndex + 1);
								acc[key] = value;
								return acc;
							}, {} as Record<string, string>);
						Object.assign(cookies, extractedCookies);
						delete processedHeaders[cookieKey];
					}

					// Remove accept-encoding to let the browser/client handle decompression
					const encodingKey = Object.keys(processedHeaders).find((k) => k.toLowerCase() === 'accept-encoding');
					if (encodingKey) {
						delete processedHeaders[encodingKey];
					}

					return processedHeaders;
				};

				if (operation === 'extractLinks') {
					const crawledData: any[] = [];
					const originalUrl = url;




					if (useBrowser) {
						const browserCrawler = new PlaywrightCrawler({
							proxyConfiguration,
							maxRequestsPerCrawl: 100,
							requestHandlerTimeoutSecs: 60,
							useSessionPool: false,
							headless: true,
							preNavigationHooks: [
								async ({ page }, gotoOptions) => {
									const saneHeaders = processHeaders(jsonHeaders, cookiesObj);

									if (Object.keys(saneHeaders).length > 0) {
										await page.setExtraHTTPHeaders(saneHeaders);

										// Sync navigator.userAgent with the User-Agent header if provided
										const uaKey = Object.keys(saneHeaders).find((k) => k.toLowerCase() === 'user-agent');
										if (uaKey) {
											const userAgent = saneHeaders[uaKey];
											await page.addInitScript((ua) => {
												Object.defineProperty(navigator, 'userAgent', { get: () => ua });
											}, userAgent);
										}
									}

									// Set realistic viewport
									await page.setViewportSize({ width: 1920, height: 1080 });

									if (Object.keys(cookiesObj).length > 0) {
										const cookies = Object.entries(cookiesObj).map(([name, value]) => ({
											name,
											value,
											url: originalUrl, // Cookies need a URL to be associated with
										}));
										await page.context().addCookies(cookies);
									}
								},
							],
							async requestHandler({ request, page, log }) {
								log.debug(`Crawling ${request.url}`);

								await page.waitForLoadState('networkidle');

								const links: string[] = [];
								const hrefs = await page.$$eval('a[href]', (els) => els.map((el) => el.getAttribute('href')));

								for (const href of hrefs) {
									if (href) {
										try {
											links.push(new URL(href, request.url).href);
										} catch (error) {
											// Skip invalid URLs
										}
									}
								}

								crawledData.push({
									url: originalUrl,
									links,
								});
							},
						});
						await browserCrawler.run([appendTimestampToUrl(url)]);
					} else {
						const crawler = new CheerioCrawler({
							proxyConfiguration,
							maxRequestsPerCrawl: 100,
							requestHandlerTimeoutSecs: 30,
							useSessionPool: false,
							preNavigationHooks: [
								async ({ request, log }) => {
									const saneHeaders = processHeaders(jsonHeaders, cookiesObj);

									if (Object.keys(saneHeaders).length > 0) {
										request.headers = { ...request.headers, ...saneHeaders };
									}
									if (Object.keys(cookiesObj).length > 0) {
										const cookieString = Object.entries(cookiesObj)
											.map(([key, value]) => `${key}=${value}`)
											.join('; ');
										request.headers = { ...request.headers, Cookie: cookieString };
									}
								},
							],
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
									url: originalUrl,
									links,
								});
							},
						});

						await crawler.run([appendTimestampToUrl(url)]);
					}
					const uniqueLinks = [...new Set(crawledData.flatMap((item) => item.links))];
					returnData.push({
						json: {
							status: 'success',
							message: 'Crawling finished',
							data: {
								url: originalUrl,
								links: uniqueLinks,
							},
						},
					});
				} else if (operation === 'extractText') {
					const originalUrl = url;



					if (useBrowser) {
						const browserCrawler = new PlaywrightCrawler({
							proxyConfiguration,
							requestHandlerTimeoutSecs: 60,
							useSessionPool: false,
							headless: true,
							preNavigationHooks: [
								async ({ page }, gotoOptions) => {
									const saneHeaders = processHeaders(jsonHeaders, cookiesObj);

									if (Object.keys(saneHeaders).length > 0) {
										await page.setExtraHTTPHeaders(saneHeaders);

										// Sync navigator.userAgent with the User-Agent header if provided
										const uaKey = Object.keys(saneHeaders).find((k) => k.toLowerCase() === 'user-agent');
										if (uaKey) {
											const userAgent = saneHeaders[uaKey];
											await page.addInitScript((ua) => {
												Object.defineProperty(navigator, 'userAgent', { get: () => ua });
											}, userAgent);
										}
									}

									// Set realistic viewport
									await page.setViewportSize({ width: 1920, height: 1080 });

									if (Object.keys(cookiesObj).length > 0) {
										const cookies = Object.entries(cookiesObj).map(([name, value]) => ({
											name,
											value: value as string,
											url: originalUrl,
										}));
										await page.context().addCookies(cookies);
									}
								},
							],
							async requestHandler({ request, page, log }) {
								log.debug(`Extracting text from ${request.url}`);
								await page.waitForLoadState('networkidle');

								const text = await page.evaluate(() => document.body.innerText.trim());
								const title = await page.title();
								const description = await page.$eval('meta[name="description"]', (el) => el.getAttribute('content')).catch(() => null);

								returnData.push({
									json: {
										status: 'success',
										message: 'Text extraction finished',
										data: {
											url: originalUrl,
											text,
											title,
											description,
										},
									},
								});
							},
						});
						await browserCrawler.run([appendTimestampToUrl(url)]);
					} else {
						const crawler = new CheerioCrawler({
							proxyConfiguration,
							requestHandlerTimeoutSecs: 30,
							useSessionPool: false,
							preNavigationHooks: [
								async ({ request, log }) => {
									const saneHeaders = processHeaders(jsonHeaders, cookiesObj);

									if (Object.keys(saneHeaders).length > 0) {
										request.headers = { ...request.headers, ...saneHeaders };
									}
									if (Object.keys(cookiesObj).length > 0) {
										const cookieString = Object.entries(cookiesObj)
											.map(([key, value]) => `${key}=${value}`)
											.join('; ');
										request.headers = { ...request.headers, Cookie: cookieString };
									}
								},
							],
							async requestHandler({ request, $, log }) {
								log.debug(`Extracting text from ${request.url}`);

								const text = $('body').text().trim();
								const title = $('title').text() || null;
								const description = $('meta[name="description"]').attr('content') || null;

								returnData.push({
									json: {
										status: 'success',
										message: 'Text extraction finished',
										data: {
											url: originalUrl,
											text,
											title,
											description,
										},
									},
								});
							},
						});

						await crawler.run([appendTimestampToUrl(url)]);
					}
				} else if (operation === 'extractHtml') {
					const originalUrl = url;



					if (useBrowser) {
						const browserCrawler = new PlaywrightCrawler({
							proxyConfiguration,
							requestHandlerTimeoutSecs: 60,
							useSessionPool: false,
							headless: true,
							preNavigationHooks: [
								async ({ page }, gotoOptions) => {
									const saneHeaders = processHeaders(jsonHeaders, cookiesObj);

									if (Object.keys(saneHeaders).length > 0) {
										await page.setExtraHTTPHeaders(saneHeaders);

										// Sync navigator.userAgent with the User-Agent header if provided
										const uaKey = Object.keys(saneHeaders).find((k) => k.toLowerCase() === 'user-agent');
										if (uaKey) {
											const userAgent = saneHeaders[uaKey];
											await page.addInitScript((ua) => {
												Object.defineProperty(navigator, 'userAgent', { get: () => ua });
											}, userAgent);
										}
									}

									// Set realistic viewport
									await page.setViewportSize({ width: 1920, height: 1080 });

									if (Object.keys(cookiesObj).length > 0) {
										const cookies = Object.entries(cookiesObj).map(([name, value]) => ({
											name,
											value: value as string,
											url: originalUrl, // Cookies need a URL to be associated with
										}));
										await page.context().addCookies(cookies);
									}
								},
							],
							async requestHandler({ request, page, log }) {
								log.debug(`Extracting HTML from ${request.url}`);
								await page.waitForLoadState('networkidle');

								const html = await page.content();
								const title = await page.title();
								const description = await page.$eval('meta[name="description"]', (el) => el.getAttribute('content')).catch(() => null);

								returnData.push({
									json: {
										status: 'success',
										message: 'HTML extraction finished',
										data: {
											url: originalUrl,
											html,
											title,
											description,
										},
									},
								});
							},
						});
						await browserCrawler.run([appendTimestampToUrl(url)]);
					} else {
						const crawler = new CheerioCrawler({
							proxyConfiguration,
							requestHandlerTimeoutSecs: 30,
							useSessionPool: false,
							preNavigationHooks: [
								async ({ request, log }) => {
									const saneHeaders = processHeaders(jsonHeaders, cookiesObj);

									if (Object.keys(saneHeaders).length > 0) {
										request.headers = { ...request.headers, ...saneHeaders };
									}
									if (Object.keys(cookiesObj).length > 0) {
										const cookieString = Object.entries(cookiesObj)
											.map(([key, value]) => `${key}=${value}`)
											.join('; ');
										request.headers = { ...request.headers, Cookie: cookieString };
									}
								},
							],
							async requestHandler({ request, body, log }) {
								log.debug(`Extracting HTML from ${request.url}`);
								const $ = cheerio.load(body.toString());
								const title = $('title').text() || null;
								const description = $('meta[name="description"]').attr('content') || null;

								returnData.push({
									json: {
										status: 'success',
										message: 'HTML extraction finished',
										data: {
											url: originalUrl,
											html: body,
											title: title,
											description: description,
										},
									},
								});
							},
						});

						await crawler.run([appendTimestampToUrl(url)]);
					}
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
