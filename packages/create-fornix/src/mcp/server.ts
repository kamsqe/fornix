import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { listBlocks } from "./tools/list-blocks.js";
import { addBlock } from "./tools/add-block.js";
import { removeBlock } from "./tools/remove-block.js";
import { getContentSchema } from "./tools/get-content-schema.js";
import { validateContent } from "./tools/validate-content.js";
import { getProjectStatus } from "./tools/get-project-status.js";
import { scaffoldProject } from "./tools/scaffold-project.js";
import { FIXTURE_MANIFESTS } from "../cli/fixture-registry.js";
import { ok, err, type Result } from "../utils/result.js";

// ── Tool Metadata ───────────────────────────────────────────

interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: {
    readonly type: "object";
    readonly properties: Record<string, unknown>;
    readonly required?: ReadonlyArray<string>;
  };
}

const TOOL_DEFINITIONS: ReadonlyArray<ToolDefinition> = [
  {
    name: "list_blocks",
    description: "List available blocks from the Fornix registry",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Filter by block type (section, integration, feature, layout)" },
        category: { type: "string", description: "Filter by category" },
        search: { type: "string", description: "Search term to filter blocks" },
      },
    },
  },
  {
    name: "add_block",
    description: "Add a block to an existing Fornix project",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Block name to add" },
        variant: { type: "string", description: "Block variant (default: 'default')" },
        projectDirectory: { type: "string", description: "Path to the Fornix project directory" },
      },
      required: ["name", "projectDirectory"],
    },
  },
  {
    name: "remove_block",
    description: "Remove a block from an existing Fornix project",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Block name to remove" },
        force: { type: "boolean", description: "Force removal even if other blocks depend on it" },
        projectDirectory: { type: "string", description: "Path to the Fornix project directory" },
      },
      required: ["name", "projectDirectory"],
    },
  },
  {
    name: "get_content_schema",
    description: "Get the content slot schema for a block collection",
    inputSchema: {
      type: "object",
      properties: {
        collection: { type: "string", description: "Block/collection name" },
      },
      required: ["collection"],
    },
  },
  {
    name: "update_content",
    description: "Modify content entries for a block collection",
    inputSchema: {
      type: "object",
      properties: {
        collection: { type: "string", description: "Block/collection name" },
        entry: { type: "string", description: "Entry identifier" },
        data: { type: "object", description: "Content data to set" },
      },
      required: ["collection", "data"],
    },
  },
  {
    name: "validate_content",
    description: "Validate content data against a block's content schema",
    inputSchema: {
      type: "object",
      properties: {
        collection: { type: "string", description: "Block/collection name" },
        data: { type: "object", description: "Content data to validate" },
      },
      required: ["collection", "data"],
    },
  },
  {
    name: "get_project_status",
    description: "Get the current Fornix project configuration and installed blocks",
    inputSchema: {
      type: "object",
      properties: {
        projectDirectory: { type: "string", description: "Path to the Fornix project directory" },
      },
      required: ["projectDirectory"],
    },
  },
  {
    name: "scaffold_project",
    description: "Scaffold a complete Fornix project from a natural language description",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string", description: "Natural language description of the project" },
        projectDirectory: { type: "string", description: "Path to create the project in" },
        renderMode: { type: "string", description: "Render mode: static, hybrid, server" },
        deployTarget: { type: "string", description: "Deploy target: cloudflare, vercel, netlify, static" },
        blocks: { type: "array", items: { type: "string" }, description: "Block names to include" },
        locales: { type: "array", items: { type: "string" }, description: "Locale codes" },
      },
      required: ["description", "projectDirectory"],
    },
  },
];

// ── Server ──────────────────────────────────────────────────

export class FornixMCPServer {
  public server: Server;

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
      },
    );

    this.registerTools();
    this.registerResources();
    this.setupHandlers();
  }

  private registerTools(): void {
    this.registeredTools = TOOL_DEFINITIONS.map(
      (definition) => definition.name,
    );
  }

  private registerResources(): void {
    this.registeredResources = [
      "fornix://registry",
      "fornix://project/config",
    ];
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: TOOL_DEFINITIONS.map((definition) => ({
          name: definition.name,
          description: definition.description,
          inputSchema: definition.inputSchema,
        })),
      };
    });

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        const toolName = request.params.name;
        const args = (request.params.arguments ?? {}) as Record<
          string,
          unknown
        >;

        const result = await this.executeTool(toolName, args);

        if (!result.ok) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: result.error.message }),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: result.value,
            },
          ],
        };
      },
    );

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: this.registeredResources.map((uri) => ({
          uri,
          name: uri,
          description: `Fornix MCP Resource: ${uri}`,
        })),
      };
    });

    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const uri = request.params.uri;

        if (uri === "fornix://registry") {
          const blocks = Object.values(FIXTURE_MANIFESTS).map((manifest) => ({
            name: manifest.name,
            type: manifest.type,
            category: manifest.category,
            description: manifest.description,
          }));

          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(blocks, null, 2),
              },
            ],
          };
        }

        if (uri === "fornix://project/config") {
          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify({
                  message:
                    "Use get_project_status tool with a projectDirectory to read project config.",
                }),
              },
            ],
          };
        }

        throw new Error(`Unknown resource: ${uri}`);
      },
    );
  }

  /**
   * Execute a tool by name with the given arguments.
   * Exposed as a public method for testing without MCP transport.
   */
  public async callTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<Result<string, Error>> {
    return this.executeTool(toolName, args);
  }

  private async executeTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<Result<string, Error>> {
    switch (toolName) {
      case "list_blocks": {
        const result = listBlocks({
          type: args.type as string | undefined,
          category: args.category as string | undefined,
          search: args.search as string | undefined,
        });
        if (!result.ok) return err(result.error);
        return ok(JSON.stringify(result.value, null, 2));
      }

      case "add_block": {
        const result = addBlock({
          name: args.name as string,
          variant: args.variant as string | undefined,
          projectDirectory: args.projectDirectory as string,
        });
        if (!result.ok) return err(result.error);
        return ok(JSON.stringify(result.value, null, 2));
      }

      case "remove_block": {
        const result = removeBlock({
          name: args.name as string,
          force: args.force as boolean | undefined,
          projectDirectory: args.projectDirectory as string,
        });
        if (!result.ok) return err(result.error);
        return ok(JSON.stringify(result.value, null, 2));
      }

      case "get_content_schema": {
        const result = getContentSchema({
          collection: args.collection as string,
        });
        if (!result.ok) return err(result.error);
        return ok(JSON.stringify(result.value, null, 2));
      }

      case "update_content": {
        // update_content validates then returns the data as-is for now.
        // Full content update requires filesystem writes to content files,
        // which is deferred to a later phase.
        const validationResult = validateContent({
          collection: args.collection as string,
          data: args.data as Record<string, unknown>,
        });
        if (!validationResult.ok) return err(validationResult.error);
        if (!validationResult.value.valid) {
          return ok(
            JSON.stringify({
              updated: false,
              errors: validationResult.value.errors,
            }),
          );
        }
        return ok(
          JSON.stringify({
            updated: true,
            collection: args.collection,
            data: args.data,
          }),
        );
      }

      case "validate_content": {
        const result = validateContent({
          collection: args.collection as string,
          data: args.data as Record<string, unknown>,
        });
        if (!result.ok) return err(result.error);
        return ok(JSON.stringify(result.value, null, 2));
      }

      case "get_project_status": {
        const result = getProjectStatus({
          projectDirectory: args.projectDirectory as string,
        });
        if (!result.ok) return err(result.error);
        return ok(JSON.stringify(result.value, null, 2));
      }

      case "scaffold_project": {
        const result = scaffoldProject({
          description: args.description as string,
          projectDirectory: args.projectDirectory as string,
          renderMode: args.renderMode as
            | "static"
            | "hybrid"
            | "server"
            | undefined,
          deployTarget: args.deployTarget as
            | "cloudflare"
            | "vercel"
            | "netlify"
            | "static"
            | undefined,
          blocks: args.blocks as string[] | undefined,
          locales: args.locales as string[] | undefined,
        });
        if (!result.ok) return err(result.error);
        return ok(JSON.stringify(result.value, null, 2));
      }

      default:
        return err(new Error(`Unknown tool: ${toolName}`));
    }
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
