import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Ensure zero 'any'
export class FornixMCPServer {
  public server: Server;
  
  // Track registered mappings for unit testing
  private registeredTools: string[] = [];
  private registeredResources: string[] = [];

  constructor() {
    this.server = new Server(
      {
        name: "fornix-mcp",
        version: "0.0.1",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.registerTools();
    this.registerResources();
    this.setupHandlers();
  }

  private registerTools(): void {
    // The tools we need to expose
    const toolNames = [
      "list_blocks",
      "add_block",
      "remove_block",
      "get_content_schema",
      "update_content",
      "validate_content",
      "get_project_status",
      "scaffold_project"
    ];

    this.registeredTools = toolNames;
  }

  private registerResources(): void {
    const resourceNames = [
      "fornix://registry",
      "fornix://project/config"
    ];

    this.registeredResources = resourceNames;
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.registeredTools.map(name => ({
          name,
          description: `Fornix MCP Tool: ${name}`,
          inputSchema: { type: "object", properties: {} }
        }))
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.registeredTools.includes(request.params.name)) {
        throw new Error(`Unknown tool: ${request.params.name}`);
      }

      return {
        content: [
          {
            type: "text",
            text: `Tool ${request.params.name} executed successfully (mock)`
          }
        ]
      };
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: this.registeredResources.map(uri => ({
          uri,
          name: uri,
          description: `Fornix MCP Resource: ${uri}`
        }))
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      if (!this.registeredResources.includes(request.params.uri)) {
        throw new Error(`Unknown resource: ${request.params.uri}`);
      }

      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "application/json",
            text: "{}"
          }
        ]
      };
    });
  }

  // Exposed for TDD checks
  public getRegisteredTools(): string[] {
    return this.registeredTools;
  }

  public getRegisteredResources(): string[] {
    return this.registeredResources;
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
