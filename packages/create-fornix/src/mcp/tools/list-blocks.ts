import { fetchRegistryIndex } from "../../registry/registry-fetcher.js";
import { isOk } from "../../utils/result.js";

export async function listBlocksHandler(args: unknown) {
  const result = await fetchRegistryIndex();
  if (!isOk(result)) {
    throw new Error(`Failed to fetch block registry: ${result.error.message}`);
  }
  const manifests = result.value.blocks;
  const typedArgs = args as { category?: string; type?: string };

  let blocks = Object.values(manifests);

  if (typedArgs?.type) {
    blocks = blocks.filter((b) => b.type === typedArgs.type);
  }

  if (typedArgs?.category) {
    blocks = blocks.filter((b) => b.category === typedArgs.category);
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          blocks.map((b) => ({
            name: b.name,
            description: b.description,
            type: b.type,
            category: b.category,
            requiredMode: b.requiredMode,
            requires: b.requires,
            conflicts: b.conflicts,
            envVars: b.envVars,
          })),
          null,
          2,
        ),
      },
    ],
  };
}
