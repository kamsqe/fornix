import { describe, it, expect, beforeEach } from "vitest";
import { FornixMCPServer } from "../../src/mcp/server.js";

describe("FornixMCPServer", () => {
  let mcpAuth: FornixMCPServer;

  beforeEach(() => {
    mcpAuth = new FornixMCPServer();
  });

  it("instantiates an MCP Server", () => {
    expect(mcpAuth.server).toBeDefined();
    expect(typeof mcpAuth.server.connect).toBe("function");
    expect(typeof mcpAuth.server.request).toBe("function");
  });

  it("registers required tools", () => {
    const registeredTools = mcpAuth.getRegisteredTools();
    
    expect(registeredTools).toContain("list_blocks");
    expect(registeredTools).toContain("add_block");
    expect(registeredTools).toContain("remove_block");
    expect(registeredTools).toContain("get_content_schema");
    expect(registeredTools).toContain("update_content");
    expect(registeredTools).toContain("validate_content");
    expect(registeredTools).toContain("get_project_status");
    expect(registeredTools).toContain("scaffold_project");
  });

  it("registers required resources", () => {
    const registeredResources = mcpAuth.getRegisteredResources();
    expect(registeredResources).toContain("fornix://registry");
    expect(registeredResources).toContain("fornix://project/config");
  });
});
