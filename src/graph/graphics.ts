import { createWriteStream } from "fs";
import https from "https";

const VISUALIZATION_BASE_URL = "https://mermaid.ink/img/";

/**
 * Encode and compress a graph diagram to a string.
 * @param graph Graph diagram instance to encode.
 * @returns Compressed graph diagram as a string.
 */
export function encodeGraph(graph: string): string {
  return Buffer.from(graph)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Generate a URL to the graph diagram.
 *
 * @param graph Graph diagram instance to generate URL for.
 * @returns A URL to the graph diagram.
 */
export function generateVisualizationURL(graph: string): string {
  const encoded = encodeGraph(graph);
  return `${VISUALIZATION_BASE_URL}${encoded}`;
}

export async function saveGraphImage(
  graph: string,
  filename: string
): Promise<void> {
  const graphURL = generateVisualizationURL(graph);
  await new Promise<void>((resolve, reject) => {
    const req = https.get(graphURL, (res) => {
      const stream = createWriteStream(filename);
      res.pipe(stream);
      stream.on("finish", () => {
        stream.close();
        resolve();
      });
    });
    req.on("error", reject);
  });
}

export function getGraphImageUrl(graph: string): string {
  const graphURL = generateVisualizationURL(graph);
  return graphURL.replace("/img/", "/svg/");
}