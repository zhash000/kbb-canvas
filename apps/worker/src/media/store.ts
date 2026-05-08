import fs from "node:fs";
import path from "node:path";
import { ensureDir } from "./pathing.js";
import crypto from "node:crypto";

export async function sha256File(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  const stream = fs.createReadStream(filePath);
  return await new Promise((resolve, reject) => {
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

export async function saveBufferToFile(args: {
  targetPath: string;
  data: Buffer;
}): Promise<{ sizeBytes: number; sha256: string }> {
  const dir = path.dirname(args.targetPath);
  ensureDir(dir);

  await fs.promises.writeFile(args.targetPath, args.data);
  const sha256 = await sha256File(args.targetPath);
  const stat = await fs.promises.stat(args.targetPath);
  return { sizeBytes: stat.size, sha256 };
}
