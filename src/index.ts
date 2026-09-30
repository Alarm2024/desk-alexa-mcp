import { startServer } from "./http.js";

startServer().catch((error: unknown) => {
  const name = error instanceof Error ? error.name : "Error";
  console.error(`iris-alexa-mcp failed to listen name=${name}`);
  process.exit(1);
});
