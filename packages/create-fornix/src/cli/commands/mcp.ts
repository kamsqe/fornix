import { defineCommand } from "citty";
import { FornixMCPServer } from "../../mcp/server.js";

const serveCommand = defineCommand({
  meta: {
    name: "serve",
    description: "Start the Fornix MCP Server over stdio",
  },
  async run() {
    console.error("Starting Fornix MCP Server...");
    const mcpServer = new FornixMCPServer();
    await mcpServer.start();
    console.error("Fornix MCP Server running on stdio.");
  },
});

export const mcpCommand = defineCommand({
  meta: {
    name: "mcp",
    description: "Manage and run the Model Context Protocol (MCP) server",
  },
  subCommands: {
    serve: serveCommand,
  },
});
