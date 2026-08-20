import { describe, it, expect } from 'vitest';
import {
	appendTimestampToUrl,
	parseRawHeaders,
	parseCookiesFromString,
	processHeaders,
} from '../nodes/CrawleeNode/CrawleeNode.node';

describe('appendTimestampToUrl', () => {
	it('appends timestamp parameter to a URL without query string', () => {
		const result = appendTimestampToUrl('https://example.com');
		expect(result).toMatch(/^https:\/\/example\.com\?_=\d+$/);
	});

	it('appends timestamp parameter to a URL with existing query string', () => {
		const result = appendTimestampToUrl('https://example.com?page=1');
		expect(result).toMatch(/^https:\/\/example\.com\?page=1&_=\d+$/);
	});

	it('handles URLs with hash fragments', () => {
		const result = appendTimestampToUrl('https://example.com#section');
		expect(result).toMatch(/^https:\/\/example\.com#section\?_=\d+$/);
	});
});

describe('parseRawHeaders', () => {
	it('parses "Key: Value" format headers', () => {
		const raw = 'User-Agent: Mozilla/5.0\nAccept: text/html';
		const result = parseRawHeaders(raw);
		expect(result).toEqual({
			'User-Agent': 'Mozilla/5.0',
			'Accept': 'text/html',
		});
	});

	it('parses alternating line format headers', () => {
		const raw = 'User-Agent\nMozilla/5.0\nAccept\ntext/html';
		const result = parseRawHeaders(raw);
		expect(result).toEqual({
			'User-Agent': 'Mozilla/5.0',
			'Accept': 'text/html',
		});
	});

	it('strips quotes from header keys', () => {
		const raw = '"User-Agent": Mozilla/5.0';
		const result = parseRawHeaders(raw);
		expect(result).toEqual({ 'User-Agent': 'Mozilla/5.0' });
	});

	it('skips pseudo-headers starting with colon', () => {
		const raw = ':authority: example.com\nUser-Agent: Mozilla/5.0';
		const result = parseRawHeaders(raw);
		expect(result).toEqual({ 'User-Agent': 'Mozilla/5.0' });
	});

	it('skips keys with spaces', () => {
		const raw = 'Invalid Key: value\nUser-Agent: Mozilla/5.0';
		const result = parseRawHeaders(raw);
		expect(result).toEqual({ 'User-Agent': 'Mozilla/5.0' });
	});

	it('handles empty input', () => {
		const result = parseRawHeaders('');
		expect(result).toEqual({});
	});

	it('handles values containing colons', () => {
		const raw = 'Authorization: Bearer token:with:colons';
		const result = parseRawHeaders(raw);
		expect(result).toEqual({ 'Authorization': 'Bearer token:with:colons' });
	});
});

describe('parseCookiesFromString', () => {
	it('parses a standard cookie string', () => {
		const raw = 'session=abc123; theme=dark';
		const result = parseCookiesFromString(raw);
		expect(result).toEqual({ session: 'abc123', theme: 'dark' });
	});

	it('handles cookies with = in value', () => {
		const raw = 'token=abc=def=ghi';
		const result = parseCookiesFromString(raw);
		expect(result).toEqual({ token: 'abc=def=ghi' });
	});

	it('trims whitespace around cookie entries', () => {
		const raw = '  session=abc123 ;  theme=dark  ';
		const result = parseCookiesFromString(raw);
		expect(result).toEqual({ session: 'abc123', theme: 'dark' });
	});

	it('handles empty input', () => {
		const result = parseCookiesFromString('');
		expect(result).toEqual({});
	});

	it('filters out entries without =', () => {
		const raw = 'session=abc123; invalid; theme=dark';
		const result = parseCookiesFromString(raw);
		expect(result).toEqual({ session: 'abc123', theme: 'dark' });
	});
});

describe('processHeaders', () => {
	it('extracts Cookie header into cookies object and removes it from headers', () => {
		const headers = { 'Cookie': 'session=abc', 'User-Agent': 'Mozilla/5.0' };
		const cookies: Record<string, string> = {};
		const result = processHeaders(headers, cookies);
		expect(result).toEqual({ 'User-Agent': 'Mozilla/5.0' });
		expect(cookies).toEqual({ session: 'abc' });
	});

	it('removes accept-encoding header', () => {
		const headers = { 'Accept-Encoding': 'gzip', 'User-Agent': 'Mozilla/5.0' };
		const cookies: Record<string, string> = {};
		const result = processHeaders(headers, cookies);
		expect(result).toEqual({ 'User-Agent': 'Mozilla/5.0' });
	});

	it('handles case-insensitive header matching', () => {
		const headers = { 'cookie': 'a=1', 'ACCEPT-ENCODING': 'br' };
		const cookies: Record<string, string> = {};
		const result = processHeaders(headers, cookies);
		expect(result).toEqual({});
		expect(cookies).toEqual({ a: '1' });
	});

	it('does not mutate the original headers object', () => {
		const headers = { 'Cookie': 'a=1', 'User-Agent': 'test' };
		const cookies: Record<string, string> = {};
		processHeaders(headers, cookies);
		expect(headers).toEqual({ 'Cookie': 'a=1', 'User-Agent': 'test' });
	});

	it('passes through headers with no Cookie or accept-encoding', () => {
		const headers = { 'User-Agent': 'test', 'Accept': 'text/html' };
		const cookies: Record<string, string> = {};
		const result = processHeaders(headers, cookies);
		expect(result).toEqual({ 'User-Agent': 'test', 'Accept': 'text/html' });
		expect(cookies).toEqual({});
	});
});
