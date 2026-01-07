import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CreateProductDTO, MCPServerConfig } from '@agentic-commerce/shared-types';
import { MCPServerConfigRepository } from '../repositories/mcp-config.repository';
import { AppError } from '../middleware/errorHandler';

interface MCPClientInstance {
  client: Client;
  transport: StdioClientTransport;
  config: MCPServerConfig;
}

export class MCPService {
  private clients: Map<string, MCPClientInstance> = new Map();
  private configRepository: MCPServerConfigRepository;

  constructor() {
    this.configRepository = new MCPServerConfigRepository();
  }

  async connectToServer(serverName: string): Promise<void> {
    if (this.clients.has(serverName)) {
      return; // Already connected
    }

    const config = await this.configRepository.findByName(serverName);
    if (!config || !config.isActive) {
      throw new AppError(
        404,
        `MCP server '${serverName}' not found or inactive`,
        'MCP_SERVER_NOT_FOUND'
      );
    }

    try {
      const transport = new StdioClientTransport({
        command: config.config.command,
        args: config.config.args || [],
        env: { ...process.env, ...config.config.env },
      });

      const client = new Client({
        name: 'agentic-commerce-client',
        version: '1.0.0',
      }, {
        capabilities: {},
      });

      await client.connect(transport);

      this.clients.set(serverName, { client, transport, config });
      console.log(`✅ Connected to MCP server: ${serverName}`);
    } catch (error: any) {
      console.error(`Failed to connect to MCP server '${serverName}':`, error);
      throw new AppError(
        500,
        `Failed to connect to MCP server: ${error.message}`,
        'MCP_CONNECTION_ERROR'
      );
    }
  }

  async searchProducts(query: string, serverName?: string): Promise<CreateProductDTO[]> {
    const servers = serverName
      ? [serverName]
      : Array.from(this.clients.keys());

    if (servers.length === 0) {
      // Try to connect to all active servers
      const activeServers = await this.configRepository.findAllActive();
      for (const server of activeServers) {
        try {
          await this.connectToServer(server.name);
        } catch (error) {
          console.error(`Failed to connect to ${server.name}:`, error);
        }
      }
    }

    const results = await Promise.allSettled(
      servers.map(name => this.searchOnServer(name, query))
    );

    const products: CreateProductDTO[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        products.push(...result.value);
      } else {
        console.error(`MCP search failed on ${servers[index]}:`, result.reason);
      }
    });

    return products;
  }

  private async searchOnServer(serverName: string, query: string): Promise<CreateProductDTO[]> {
    try {
      await this.connectToServer(serverName);

      const instance = this.clients.get(serverName);
      if (!instance) {
        return [];
      }

      const { client, config } = instance;

      // List available tools
      const tools = await client.listTools();

      // Find a search tool (adapt based on actual MCP server capabilities)
      const searchTool = tools.tools.find(t =>
        t.name.toLowerCase().includes('search') ||
        t.name.toLowerCase().includes('query') ||
        t.name.toLowerCase().includes('product')
      );

      if (!searchTool) {
        console.warn(`No search tool found on server '${serverName}'`);
        return [];
      }

      // Call the search tool
      const response = await client.callTool({
        name: searchTool.name,
        arguments: { query },
      });

      // Parse and normalize response
      return this.normalizeResponse(response, serverName);
    } catch (error: any) {
      console.error(`Search error on MCP server '${serverName}':`, error);
      return []; // Don't block other servers
    }
  }

  private normalizeResponse(response: any, source: string): CreateProductDTO[] {
    try {
      if (!response.content || response.content.length === 0) {
        return [];
      }

      const content = response.content[0];
      let data: any;

      if (typeof content === 'string') {
        data = JSON.parse(content);
      } else if (content.type === 'text') {
        data = JSON.parse(content.text);
      } else {
        data = content;
      }

      if (!Array.isArray(data)) {
        data = [data];
      }

      return data.map((item: any) => ({
        userId: '', // Will be set by ProductService
        name: item.name || item.title || 'Unknown Product',
        description: item.description || item.snippet,
        price: item.price ? parseFloat(item.price) : undefined,
        currency: item.currency || 'USD',
        imageUrl: item.image_url || item.imageUrl || item.image,
        productUrl: item.url || item.link || '',
        source: `mcp:${source}`,
        rawData: item,
        aiExtracted: false,
      }));
    } catch (error: any) {
      console.error('Failed to normalize MCP response:', error);
      return [];
    }
  }

  async listAvailableServers(): Promise<MCPServerConfig[]> {
    return this.configRepository.findAllActive();
  }

  async disconnect(serverName: string): Promise<void> {
    const instance = this.clients.get(serverName);
    if (instance) {
      try {
        await instance.client.close();
        console.log(`Disconnected from MCP server: ${serverName}`);
      } catch (error) {
        console.error(`Error disconnecting from ${serverName}:`, error);
      }
      this.clients.delete(serverName);
    }
  }

  async disconnectAll(): Promise<void> {
    const serverNames = Array.from(this.clients.keys());
    await Promise.all(serverNames.map(name => this.disconnect(name)));
  }

  getConnectionStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    this.clients.forEach((_, name) => {
      status[name] = true;
    });
    return status;
  }
}
