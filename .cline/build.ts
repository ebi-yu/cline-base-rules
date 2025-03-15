import path from "path";
import * as fs from "fs/promises";
import yaml from "js-yaml";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const RULES_DIR = path.resolve(process.cwd(), ".cline/rules");
const ROO_MODES_DIR = path.resolve(process.cwd(), ".cline/roomodes");
const OUTPUT_FILE = path.resolve(process.cwd(), "./.clinerules");
const ROOMODES_FILE = path.resolve(process.cwd(), "./.roomodes");

type RooMode = {
  slug: string;
  name: string;
  roleDefinition: string;
  groups?: string[];
  source?: string;
  __filename: string;
};

/**
 * FrontMatter(YAML)を解析し、本文と分離する
 */
function parseFrontMatter(content: string) {
  const frontMatter = content.match(/^---\n([\s\S]+?)\n---\n/);
  if (!frontMatter) return [{}, content];
  return [yaml.load(frontMatter[1]), content.replace(frontMatter[0], "")];
}

/**
 * roomodesディレクトリからモード定義を読み込む
 */
async function loadRoomodes(): Promise<{ customModes: RooMode[] }> {
  const roomodes: { customModes: RooMode[] } = { customModes: [] };
  try {
    const modeFiles = await fs.readdir(ROO_MODES_DIR);
    roomodes.customModes = await Promise.all(
      modeFiles
        .filter((file) => file.toLowerCase().endsWith(".md"))
        .map(async (file) => {
          const filePath = path.join(ROO_MODES_DIR, file);
          const content = await fs.readFile(filePath, "utf-8");
          const slug = file.replace(".md", "");
          const [frontMatter, body] = parseFrontMatter(content);
          return {
            ...frontMatter,
            slug,
            roleDefinition: body,
            __filename: filePath,
          };
        })
    );
  } catch (error) {
    console.warn("Warning: Could not load roomodes", (error as Error).message);
  }
  return roomodes;
}

/**
 * rulesディレクトリからプロンプトを読み込む
 */
async function loadPrompts(): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await fs.readdir(RULES_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(entry.name);
      }
    }
    files.sort();
    return await Promise.all(
      files.map((file) => fs.readFile(path.join(RULES_DIR, file), "utf-8"))
    );
  } catch (error) {
    console.error("Error loading prompts:", (error as Error).message);
    return [];
  }
}

/**
 * .roomodes と .clinerules を出力する
 */
async function writeOutput(
  roomodes: { customModes: RooMode[] },
  prompts: string[]
) {
  let result = prompts.join("\n\n");
  if (roomodes.customModes.length > 0) {
    result += "\n\nこのプロジェクトには以下のモードが定義されています:";
    for (const mode of roomodes.customModes) {
      result += `\n- ${mode.slug} ${mode.name} at ${path.relative(
        process.cwd(),
        mode.__filename
      )}`;
    }
  }
  await fs.writeFile(ROOMODES_FILE, JSON.stringify(roomodes, null, 2));
  console.log(
    `Generated .roomodes from ${roomodes.customModes.length} mode files`
  );
  await fs.writeFile(OUTPUT_FILE, result, { flag: "w" });
  console.log(`Generated ${OUTPUT_FILE} from ${prompts.length} prompt files`);
}

/**
 * メイン処理: roomodes と prompts を読み込み、出力する
 */
async function main() {
  try {
    const [roomodes, prompts] = await Promise.all([
      loadRoomodes(),
      loadPrompts(),
    ]);
    await writeOutput(roomodes, prompts);
  } catch (error) {
    console.error("Error:", (error as Error).message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${__filename}`) main();
