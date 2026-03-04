import { fetchRegistryIndex } from "../../registry/registry-fetcher.js";
import { isOk } from "../../utils/result.js";

export async function getContentSchemaHandler(args: unknown) {
  const typedArgs = args as { block: string };
  if (!typedArgs?.block) {
    throw new Error("Missing required argument: block");
  }

  const result = await fetchRegistryIndex();
  if (!isOk(result)) {
    throw new Error(`Failed to fetch block registry: ${result.error.message}`);
  }
  const manifests = result.value.blocks;

  const manifest = manifests[typedArgs.block];
  if (!manifest) {
    throw new Error(`Block '${typedArgs.block}' not found in registry`);
  }

  const slots = manifest.ai?.contentSlots ?? {};
  if (Object.keys(slots).length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `Block '${typedArgs.block}' does not have any AI-configurable content slots.`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(slots, null, 2),
      },
    ],
  };
}
