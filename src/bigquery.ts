import { BigQuery } from "@google-cloud/bigquery";

const PROJECT_ID = process.env.PROJECT_ID || ''

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
) => {
  // データセットからテーブル一覧を取得
  const dataset = bigquery.dataset(datasetId);

  try {
    const [tables] = await dataset.getTables();

    // 各テーブルのカラム名を取得
    for (const table of tables) {
      console.log(`Table: ${table.id}`);

      // テーブルのスキーマを取得
      const [metadata] = await table.getMetadata();
      const schemaFields = metadata.schema.fields;

      console.log("Columns:");
      schemaFields.forEach((field: { name: string; type: string }) => {
        console.log(field);
      });

      console.log(""); // 空行を出力
    }
  } catch (error) {
    console.error("Error:", error);
  }
};
