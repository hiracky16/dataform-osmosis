import { BigQuery } from "@google-cloud/bigquery";
import { BigQueryTable } from "./dataformTypes";

const PROJECT_ID = process.env.PROJECT_ID || "";

const bigquery = new BigQuery({
  projectId: PROJECT_ID,
});

export const checkBigQuery = async () => {
  try {
    await bigquery.getProjectId();
    console.log(`BigQuery client is working.`);
  } catch (err) {
    console.error("Error: BigQuery client is not working.", err);
  }
};

export const listTablesAndColumns = async (
  datasetId: string
): Promise<BigQueryTable[]> => {
  const dataset = bigquery.dataset(datasetId);
  const bigqueryTables = [];
  try {
    const [tables] = await dataset.getTables();
    for (const table of tables) {
      if (!table || !table.id) {
        continue;
      }

      const [metadata] = await table.getMetadata();
      const schemaFields = metadata.schema.fields;
      const bigqueryTable: BigQueryTable = {
        dataset: dataset.id || datasetId,
        table: table.id,
        fields: schemaFields.map(
          (schema: { name: string; description?: string }) => {
            return {
              name: schema.name,
              description: schema.description || "",
            };
          }
        ),
      };
      bigqueryTables.push(bigqueryTable);
    }
  } catch (error) {
    console.error("Error:", error);
  }
  return bigqueryTables;
};
