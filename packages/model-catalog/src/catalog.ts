export type BillingMode = "per_token" | "per_call" | "per_second";
export type ModelCategory = "text" | "image" | "video";

export interface CatalogModel {
  id: string;
  name: string;
  category: ModelCategory;
  billingMode: BillingMode;
}

export interface ModelCatalog {
  textModels: CatalogModel[];
  imageModels: CatalogModel[];
  videoModels: CatalogModel[];
  models: CatalogModel[];
}

function cleanCell(cell: string): string {
  return cell.trim().replace(/^`|`$/g, "").trim();
}

function parseRow(line: string): string[] | null {
  if (!line.trim().startsWith("|")) return null;
  const parts = line.split("|").slice(1, -1).map((p) => p.trim());
  if (parts.length < 2) return null;
  if (parts.every((p) => /^-+$/.test(p.replace(/:/g, "")))) return null;
  return parts;
}

export function parseModelsMarkdown(markdown: string): ModelCatalog {
  const textModels: CatalogModel[] = [];
  const imageModels: CatalogModel[] = [];
  const videoModels: CatalogModel[] = [];

  let section: ModelCategory | null = null;
  let videoBillingMode: BillingMode = "per_call";

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line.includes("## 文本模型")) {
      section = "text";
      continue;
    }
    if (line.includes("## 图像模型")) {
      section = "image";
      continue;
    }
    if (line.includes("## 视频模型")) {
      section = "video";
      continue;
    }
    if (line.startsWith("### per_second")) {
      videoBillingMode = "per_second";
      continue;
    }
    if (line.startsWith("### per_call")) {
      videoBillingMode = "per_call";
      continue;
    }

    const row = parseRow(line);
    if (!row) continue;

    const first = cleanCell(row[0] ?? "");
    const second = cleanCell(row[1] ?? "");

    if (!first || first === "模型 ID") continue;

    if (section === "text") {
      textModels.push({ id: first, name: second, category: "text", billingMode: "per_token" });
      continue;
    }
    if (section === "image") {
      imageModels.push({ id: first, name: second, category: "image", billingMode: "per_call" });
      continue;
    }
    if (section === "video") {
      videoModels.push({ id: first, name: second, category: "video", billingMode: videoBillingMode });
      continue;
    }
  }

  return {
    textModels,
    imageModels,
    videoModels,
    models: [...textModels, ...imageModels, ...videoModels],
  };
}

export function loadCatalogFromMarkdown(markdown: string): ModelCatalog {
  return parseModelsMarkdown(markdown);
}
