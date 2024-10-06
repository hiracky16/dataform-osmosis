import { readSqlx, compileDataform, checkDataformCli } from "./dataform";
import { listTablesAndColumns, checkBigQuery } from "./bigquery";
import { DataformProject, BigQueryTable } from "./dataformTypes";
import path from "path";
import fs from "fs";
import Sqlx from "./Sqlx";

export const refactoringFiles = (filePath: string): string[] => {
  // definitions/ を省略したディレクトリ指定への対応
  if (!filePath.startsWith("definitions")) {
    filePath = path.join("definitions", filePath);
  }

  if (!fs.existsSync(filePath)) {
    throw new Error("File Not Found.");
  }

  // 再帰的に .sqlx ファイルを探索
  const getAllSqlxFiles = (dir: string): string[] => {
    let results: string[] = [];
    const list = fs.readdirSync(dir);

    list.forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat && stat.isDirectory()) {
        // サブディレクトリの場合は再帰的に探索
        results = results.concat(getAllSqlxFiles(fullPath));
      } else if (file.endsWith(".sqlx")) {
        // .sqlx ファイルの場合は結果に追加
        results.push(fullPath);
      }
    });

    return results;
  };

  if (fs.statSync(filePath).isDirectory()) {
    return getAllSqlxFiles(filePath); // ディレクトリの場合は再帰的に .sqlx ファイルを探索
  } else {
    // 単一のファイルの場合
    return [filePath];
  }
};

// トポロジカルソート関数
const topoSortRefactoringFiles = (
  refactoringFiles: string[],
  dataformProject: DataformProject
): string[] => {
  // 依存関係グラフの作成
  const graph: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};

  // refactoringFiles に対して初期化
  refactoringFiles.forEach((file) => {
    graph[file] = [];
    inDegree[file] = 0;
  });

  // declarations の処理
  dataformProject.declarations.forEach((declaration) => {
    const fileName = declaration.fileName;
    if (refactoringFiles.includes(fileName)) {
      // declarations は依存関係を持たないので最初に処理される
      inDegree[fileName] = 0;
    }
  });

  // DataformProject の tables について依存関係を構築
  dataformProject.tables.forEach((table) => {
    const fileName = table.fileName;
    if (refactoringFiles.includes(fileName)) {
      // dependencyTargets が null の場合も考慮して処理
      if (table.dependencyTargets && table.dependencyTargets.length > 0) {
        table.dependencyTargets.forEach((dependency) => {
          // tables と declarations 両方から依存ファイルを探す
          const depFile =
            dataformProject.tables.find(
              (t) =>
                t.target.name === dependency.name &&
                t.target.schema === dependency.schema
            )?.fileName ||
            dataformProject.declarations.find(
              (d) =>
                d.target.name === dependency.name &&
                d.target.schema === dependency.schema
            )?.fileName;

          if (depFile && refactoringFiles.includes(depFile)) {
            graph[depFile].push(fileName); // 依存元 -> 依存先
            inDegree[fileName] += 1; // 依存されるファイルの入次数を増やす
          }
        });
      } else {
        // dependencyTargets が null の場合は最初に処理するため入次数を 0 に設定
        inDegree[fileName] = 0;
      }
    }
  });

  // トポロジカルソートの実施
  const sorted: string[] = [];
  const queue: string[] = [];

  // 入次数が 0 のファイルをキューに追加
  Object.keys(inDegree).forEach((file) => {
    if (inDegree[file] === 0) {
      queue.push(file);
    }
  });

  while (queue.length > 0) {
    const file = queue.shift()!;
    sorted.push(file);

    // 依存ファイルの入次数を減らす
    graph[file].forEach((depFile) => {
      inDegree[depFile] -= 1;
      if (inDegree[depFile] === 0) {
        queue.push(depFile);
      }
    });
  }

  // サイクルが存在する場合、ソートがすべてのファイルに適用されない
  if (sorted.length !== refactoringFiles.length) {
    throw new Error("There is a circular dependency in the sqlx files.");
  }

  return sorted;
};

export const refactor = async (filePath: string) => {
  const files = refactoringFiles(filePath);
  console.log("files: ", files);

  const result = await compileDataform();
  const sortedFiles = topoSortRefactoringFiles(files, result);
  console.log("sorted files: ", sortedFiles);

  const bigqueryTables: BigQueryTable[] = [];
  const datasetIds = Array.from(
    new Set(
      result.declarations
        .concat(result.tables)
        .map((table) => table.target.schema)
    )
  );
  for (const dataset of datasetIds) {
    const bqTables = await listTablesAndColumns(dataset);
    bigqueryTables.push(...bqTables);
  }
  sortedFiles.forEach((file) => {
    const sqlx = new Sqlx(file);
    // DataformProject から対応するテーブルを取得（ファイル名ではなく target 情報を使用）
    const dataformTable =
      result.tables.find((table) => table.fileName === file) ||
      result.declarations.find((table) => table.fileName === file);

    if (dataformTable) {
      const { schema, name } = dataformTable.target;

      // DataformProject のテーブル情報を基に BigQueryTable を探す
      const bigQueryTable = bigqueryTables.find(
        (table) => table.dataset === schema && table.table === name
      );

      if (bigQueryTable) {
        // BigQuery からカラムを追加
        sqlx.addColumnsFromBigQuery(bigQueryTable);

        // カラムを BigQuery の順序に並び替え
        // sqlx.reorderColumns(bigQueryTable);

        // 更新をファイルに保存
        sqlx.save();
      } else {
        console.log(`No BigQuery table found for ${file}`);
      }
    }
  });
};
