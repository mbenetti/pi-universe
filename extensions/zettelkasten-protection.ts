import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";

const VAULT_PATH = "/Users/maurobenetti/Documents/Datascience/ZettleKasten_research";

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (isToolCallEventType("bash", event)) {
			const cmd = event.input.command || "";

			// Check if command is doing some form of deletion (rm, rmdir)
			if (cmd.match(/\brm\b|\brmdir\b/)) {
				// If the command is doing a deletion, enforce the moving to Archives first
				if (!cmd.includes("3-Archives")) {
					return {
						block: true,
						reason: "Zettelkasten Integrity Rule: Deletions are forbidden outside of the '3-Archives' folder. Please move items to '3-Archives' instead of running 'rm'. Data loss in the ZettelKasten research vault must be avoided.",
					};
				}
			}
		}

		return { block: false };
	});
}