import { cpSync } from "fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts"],
  format: ["esm"],
  outDir: "dist",
  outExtension: () => ({ js: ".mjs" }),
  target: "node22",
  platform: "node",
  splitting: false,
  clean: true,
  bundle: true,
  sourcemap: false,
  onSuccess: async () => {
    // Copy package assets (metadata, icons, symbols) into dist for the Logi Plugin Service
    cpSync("package", "dist", { recursive: true });
    // Copy @logitech/plugin-sdk into dist/node_modules so the Logi Plugin Service runtime can resolve it
    cpSync("node_modules/@logitech", "dist/node_modules/@logitech", { recursive: true });
  },
});
