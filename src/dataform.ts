import { exec } from "child_process";
import util from "util";
import { DataformProject, WorkflowSettings } from "./types";
import yaml from "yaml";
import path from "path";
import fs from "fs";

const execAsync = util.promisify(exec);
const WORKFLOW_SETTINGS_PATH = path.resolve(
  __dirname,
  "workflow_settings.yaml"
);

export const checkDataformCli = async () => {
  const { stdout, stderr } = await execAsync("dataform --version");
  if (stderr) {
    console.error("🚫 Error: Dataform CLI is not working.", stderr);
    throw stderr;
  }

  try {
    loadWorkflowSettings()
  } catch (err) {
    console.error("🚫 Error: workflow_settings.yaml file not found.", err);
    throw err
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

export const loadWorkflowSettings = (): WorkflowSettings => {
  if (!fs.existsSync(WORKFLOW_SETTINGS_PATH)) {
    throw new Error("workflow_settings.yaml file not found.");
  }
  const fileContent = fs.readFileSync(WORKFLOW_SETTINGS_PATH, "utf8");
  const config = yaml.parse(fileContent) as WorkflowSettings;
  return config
};
