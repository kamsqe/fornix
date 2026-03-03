import { describe, it, expect } from "vitest";
import { validateProjectName, suggestProjectName } from "../../src/utils/project-name";

describe("project name validation", () => {
  describe("validateProjectName", () => {
    it("accepts lowercase kebab-case names", () => {
      const result = validateProjectName("my-project");
      expect(result.ok).toBe(true);
    });

    it("accepts single word names", () => {
      const result = validateProjectName("app");
      expect(result.ok).toBe(true);
    });

    it("accepts names with numbers", () => {
      const result = validateProjectName("my-app-2");
      expect(result.ok).toBe(true);
    });

    it("rejects names with uppercase letters", () => {
      const result = validateProjectName("MyProject");
      expect(result.ok).toBe(false);
    });

    it("rejects names with spaces", () => {
      const result = validateProjectName("my project");
      expect(result.ok).toBe(false);
    });

    it("rejects names with special characters", () => {
      const result = validateProjectName("my-app!");
      expect(result.ok).toBe(false);
    });

    it("rejects empty names", () => {
      const result = validateProjectName("");
      expect(result.ok).toBe(false);
    });

    it("rejects names starting with a dot", () => {
      const result = validateProjectName(".hidden");
      expect(result.ok).toBe(false);
    });

    it("rejects names starting with a hyphen", () => {
      const result = validateProjectName("-invalid");
      expect(result.ok).toBe(false);
    });
  });

  describe("suggestProjectName", () => {
    it("lowercases uppercase names", () => {
      expect(suggestProjectName("MyProject")).toBe("myproject");
    });

    it("replaces spaces with hyphens", () => {
      expect(suggestProjectName("my project")).toBe("my-project");
    });

    it("strips special characters", () => {
      expect(suggestProjectName("my-app!@#")).toBe("my-app");
    });

    it("replaces underscores with hyphens", () => {
      expect(suggestProjectName("my_project")).toBe("my-project");
    });

    it("collapses multiple hyphens", () => {
      expect(suggestProjectName("my--project")).toBe("my-project");
    });

    it("strips leading dots and hyphens", () => {
      expect(suggestProjectName(".my-project")).toBe("my-project");
    });

    it("returns 'my-project' for completely invalid input", () => {
      expect(suggestProjectName("!!!")).toBe("my-project");
    });
  });
});
