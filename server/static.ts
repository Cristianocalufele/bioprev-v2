import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname =
  typeof import.meta?.dirname === "string"
    ? import.meta.dirname
    : typeof import.meta?.url === "string" && import.meta.url
      ? path.dirname(fileURLToPath(import.meta.url))
      : path.resolve(process.cwd(), "server");

export function serveStatic(app: Express) {
  const distPath = fs.existsSync(path.resolve(__dirname, "..", "dist"))
    ? path.resolve(__dirname, "..", "dist")
    : path.resolve(process.cwd(), "dist");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
