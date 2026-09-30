import { startServer } from "./http.js";

try {
  process.loadEnvFile();
} catch (error) {
  const missing = error instanceof Error && "code" in error && error.code === "ENOENT";
  if (!missing) throw error;
}

startServer().catch((error: unknown) => {
  const name = error instanceof Error ? error.name : "Error";
  console.error(`iris-alexa-mcp failed to listen name=${name}`);
  process.exit(1);
});
