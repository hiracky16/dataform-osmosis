import * as fs from "fs";
import Sqlx from "../src/Sqlx";
import { BigQueryTable, DataformProject, DataformTable } from "../src/types";

// fs モジュールをモック
jest.mock("fs");

describe("Sqlx", () => {
  const mockFilePath = "definitions/table1.sqlx";
  let mockConfigContent = `
    config {
      type: "table",
      columns: {
        id: "id",
        name: {
          description: "name description",
          bigqueryPolicyTags: ["projects/example/taxonomies/123456/policyTags/123"]
        }
      }
    }
  `;

  const mockDataformTable: DataformTable = {
    type: "table",
    target: {
      name: "table1",
      schema: "dataform",
      database: "project",
    },
    fileName: mockFilePath,
    query: "SELECT id, name FROM table0",
    disabled: false,
    dependencyTargets: [
      {
        name: "table0",
        schema: "dataform",
        database: "project",
      },
    ],
    actionDescriptor: {
      columns: [
        {
          description: "id",
          path: ["id"],
        },
      ],
    },
    canonicalTarget: {
      name: "table1",
      schema: "dataform",
      database: "project",
    },
    enumType: "TABLE",
  };

  const mockDataformProject: DataformProject = {
    tables: [
      mockDataformTable,
      {
        type: "table",
        target: {
          name: "table0",
          schema: "dataform",
          database: "project",
        },
        fileName: "definitions/table0.sqlx",
        query: "SELECT id FROM somewhere",
        disabled: false,
        dependencyTargets: [],
        actionDescriptor: {
          columns: [
            {
              description: "id",
              path: ["id"],
            },
          ],
        },
        canonicalTarget: {
          name: "table0",
          schema: "dataform",
          database: "project",
        },
        enumType: "TABLE",
      },
    ],
    declarations: [],
    operations: [],
    projectConfig: {
      warehouse: "bigquery",
      defaultSchema: "dataform",
      assertionSchema: "dataform_assertions",
      defaultDatabase: "project",
      defaultLocation: "asia-northeast1",
    },
    graphErrors: {},
    dataformCoreVersion: "1.0.0",
    targets: [],
  };

  beforeEach(() => {
    // fs.readFileSync のモック
    (fs.readFileSync as jest.Mock).mockReturnValue(mockConfigContent);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor and loadConfig", () => {
    it("should correctly load and parse the SQLX config", () => {
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);

      expect(fs.readFileSync).toHaveBeenCalledWith(mockFilePath, "utf-8");
      expect(sqlx["config"].type).toBe("table");
      expect(sqlx["config"].columns).toHaveProperty("id", {
        description: "id",
      });
      expect(sqlx["config"].columns).toHaveProperty("name");
    });

    it("should set empty config value if no config block is found", () => {
      (fs.readFileSync as jest.Mock).mockReturnValue("select 1");
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);
      expect(sqlx["config"]).toHaveProperty("type");
    });
  });

  describe("addDependency", () => {
    it("should add a dependency", () => {
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);
      const dependencySqlx = new Sqlx(mockFilePath, mockDataformTable);

      sqlx.addDependency(dependencySqlx);

      expect(sqlx.dependencies.length).toBe(1);
      expect(sqlx.dependencies[0]).toBe(dependencySqlx);
    });
  });

  describe("inheritColumnsFromDependencies", () => {
    it("should correctly inherit columns from dependency", () => {
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);
      sqlx.inheritColumnsFromDependencies(mockDataformProject);

      if (sqlx["config"].columns) {
        expect(sqlx["config"].columns["id"]).toStrictEqual({
          description: "id",
        });
      }
    });

    it("should not overwrite existing columns", () => {
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);
      const dependencySqlx = new Sqlx(
        "definitions/table0.sqlx",
        mockDataformProject.tables[1]
      );

      if (dependencySqlx["config"].columns) {
        dependencySqlx["config"].columns["id"] = {
          description: "new-id-description",
        };
      }

      sqlx.addDependency(dependencySqlx);
      sqlx.inheritColumnsFromDependencies(mockDataformProject);

      // sqlx 側の id カラムにはすでに description があるので、引き継がない
      if (sqlx["config"].columns) {
        expect(sqlx["config"].columns["id"]).toStrictEqual({
          description: "id",
        });
      }
    });

    it("should inherit missing bigqueryPolicyTags", () => {
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);
      const dependencySqlx = new Sqlx(
        "definitions/table0.sqlx",
        mockDataformProject.tables[1]
      );

      if (dependencySqlx["config"].columns) {
        dependencySqlx["config"].columns["id"] = {
          description: "new-id-description",
          bigqueryPolicyTags: ["policy-tag-1"],
        };
      }

      sqlx.addDependency(dependencySqlx);
      sqlx.inheritColumnsFromDependencies(mockDataformProject);

      // sqlx 側の id カラムには policyTags がないので、引き継ぐ
      if (sqlx["config"].columns) {
        expect(sqlx["config"].columns["id"]).toStrictEqual({
          description: "id",
          bigqueryPolicyTags: ["policy-tag-1"],
        });
      }
    });
  });

  describe("addColumnsFromBigQuery", () => {
    it("should add columns from BigQuery", () => {
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);

      const bigQueryTable: BigQueryTable = {
        dataset: "dataform",
        table: "table1",
        fields: [
          { name: "age", description: "age description" },
          { name: "id", description: "id description" },
        ],
      };

      sqlx.addColumnsFromBigQuery(bigQueryTable);

      expect(sqlx["config"].columns).toHaveProperty("age");
      if (sqlx["config"].columns) {
        expect(sqlx["config"].columns["age"]).toStrictEqual({
          description: "age description",
        });
      }
    });
  });

  describe("save", () => {
    it("should save the updated SQLX config", () => {
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);
      sqlx.save();

      const expectedNewConfig = `config ${JSON.stringify(
        sqlx["config"],
        null,
        2
      )}`;
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockFilePath,
        expect.stringContaining(expectedNewConfig),
        "utf-8"
      );
    });
  });
});
