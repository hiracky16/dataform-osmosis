import { checkDataformCli, loadWorkflowSettings } from "./dataform";
import { checkBigQuery } from "./bigquery";

export const valid = async () => {
    await checkDataformCli();
    const config = loadWorkflowSettings()
    await checkBigQuery(config.defaultProject);
}
