import fs from "fs";
import { exec } from "child_process";
import util from "util";
import { DataformProject, Sqlx } from "./dataformTypes";

const execAsync = util.promisify(exec);

export const checkDataformCli = async () => {
  const { stdout, stderr } = await execAsync("dataform --version");
  if (stderr) {
    console.error("🚫 Error: Dataform CLI is not working.", stderr);
    throw stderr;
  }
  console.log("✅️ Dataform CLI working. version:", stdout);
};

/**
 * compile dataform project
 * @returns result of compiling dataform by json
 */
export const compileDataform = async (): Promise<DataformProject> => {
  const { stdout, stderr } = await execAsync("dataform compile --json");
  if (stderr) {
    console.error(`Error: ${stderr}`);
    throw stderr;
  }
  return JSON.parse(stdout) as DataformProject;
};

export const readSqlx = (sqlxPath: string) => {
  const content = fs.readFileSync(sqlxPath, "utf8");
  const sqlx = parseSqlxConfig(content);
  sqlx.content = content;
  sqlx.path = sqlxPath;
  return sqlx;
};

export const parseSqlxConfig = (content: string): Sqlx => {
  const configRegex = /config\s*\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/;
  const configMatch = content.match(configRegex);

  if (!configMatch) {
    throw Error("No config in Sqlx file.");
  }
  const configJson = configMatch[0]
    .replace(/config\s*/, "")
    .replace(/(\w+):/g, '"$1":')
    .replace(/'/g, '"');

  return JSON.parse(configJson);
};
