import { exec } from "child_process";
import util from "util";
import { DataformProject, WorkflowSettings } from "./types";
import yaml from "yaml";
import path from "path";
import fs from "fs";

const execAsync = util.promisify(exec);
const WORKFLOW_SETTINGS_PATH = path.resolve(
  process.cwd(),
  "workflow_settings.yaml"
);
const WORKFLOW_SETTINGS_OLD_PATH = path.resolve(process.cwd(), "dataform.json");

export const checkDataformCli = async () => {
  const { stdout, stderr } = await execAsync("dataform --version");
  if (stderr) {
    console.error("🚫 Error: Dataform CLI is not working.", stderr);
    throw stderr;
  }

  try {
    loadWorkflowSettings();
  } catch (err) {
    console.log(WORKFLOW_SETTINGS_PATH);
    console.error("🚫 Error: ", err);
    throw err;
  }

  console.info("✅️ Dataform CLI working. version:", stdout);
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
  let config: WorkflowSettings;
  if (fs.existsSync(WORKFLOW_SETTINGS_PATH)) {
    const fileContent = fs.readFileSync(WORKFLOW_SETTINGS_PATH, "utf8");
    config = yaml.parse(fileContent) as WorkflowSettings;
  } else if (fs.existsSync(WORKFLOW_SETTINGS_OLD_PATH)) {
    const fileContent = fs.readFileSync(WORKFLOW_SETTINGS_OLD_PATH, "utf8");
    config = JSON.parse(fileContent) as WorkflowSettings;
  } else {
    throw new Error("workflow_settings.yaml file not found.");
  }
  return config;
};
