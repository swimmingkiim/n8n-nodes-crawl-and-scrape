declare module 'cheerio' {
	export function load(html: string): CheerioAPI;
	export interface CheerioAPI {
		(selector: string): Cheerio;
		text(): string;
	}
	export interface Cheerio {
		each(callback: (index: number, element: Element) => void): Cheerio;
		attr(name: string): string | undefined;
		text(): string;
	}
	export interface Element {
		attribs: { [key: string]: string };
		attributes: { [key: string]: string };
		classList: string[];
		className: string;
		clientHeight: number;
		clientLeft: number;
		clientTop: number;
		clientWidth: number;
		innerHTML: string;
		outerHTML: string;
		scrollHeight: number;
		scrollLeft: number;
		scrollTop: number;
		scrollWidth: number;
		tagName: string;
	}
}
