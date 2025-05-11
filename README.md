# n8n-nodes-crawl-and-scrape

This is an n8n community node. It lets you use crawl and scrape websites in your n8n workflows.

I used [crawlee](https://github.com/apify/crawlee) for this project.
Crawlee is a powerful web scraping and crawling library that helps you extract data from websites efficiently and reliably.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Resources](#resources)  
[Version history](#version-history)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

The node supports the following operations:

- **Extract Links**: Crawls a website and extracts all links found on the page
- **Extract Text**: Extracts all text content from a webpage
- **Extract HTML**: Retrieves the raw HTML content of a webpage

## Credentials

No credentials are required to use this node.

## Compatibility

This node is compatible with n8n version 1.0.0 and above.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Crawlee Documentation](https://crawlee.dev/)

## Version history

### 0.1.0
- Initial release
- Added support for basic web scraping operations:
  - Extract Links
  - Extract Text
  - Extract HTML


