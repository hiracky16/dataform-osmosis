import { refactoringFiles } from "../src/refactor";
import mockFs from "mock-fs";
import * as path from "path";
import * as fs from "fs";

describe("refactoringFiles", () => {
  afterEach(() => {
    mockFs.restore();
  });
  afterAll(() => {
    mockFs.restore();
  });

  it("should return the correct file path for a single sqlx file", () => {
    mockFs({
      "definitions/marts/test/test.sqlx": "content",
    });

    const result = refactoringFiles("marts/test/test.sqlx");
    expect(result).toEqual(["definitions/marts/test/test.sqlx"]);
  });

  it("should return all sqlx files in a directory", () => {
    mockFs({
      "definitions/marts/test": {
        "test1.sqlx": "content1",
        "test2.sqlx": "content2",
        "test3.txt": "not_sqlx",
      },
    });

    const result = refactoringFiles("marts/test");
    expect(result).toEqual(
      expect.arrayContaining([
        "definitions/marts/test/test1.sqlx",
        "definitions/marts/test/test2.sqlx",
      ])
    );
  });

  it('should prepend "definitions/" when directory is not provided', () => {
    mockFs({
      "definitions/marts/test/test.sqlx": "content",
    });

    const result = refactoringFiles("marts/test/test.sqlx");
    expect(result).toEqual(["definitions/marts/test/test.sqlx"]);
  });

  it("should throw an error if file or directory does not exist", () => {
    mockFs({
      "definitions/marts/test": {}, // 空のディレクトリ
    });

    expect(() => refactoringFiles("marts/test/nonexistent.sqlx")).toThrow(
      "File Not Found."
    );
  });

  it("should return all sqlx files when only a directory is provided", () => {
    mockFs({
      "definitions/marts/test": {
        "file1.sqlx": "content1",
        "file2.sqlx": "content2",
        "not_sqlx.txt": "not_sqlx",
      },
    });

    const result = refactoringFiles("marts/test");
    expect(result).toEqual(
      expect.arrayContaining([
        "definitions/marts/test/file1.sqlx",
        "definitions/marts/test/file2.sqlx",
      ])
    );
  });
});

it("should return .sqlx files from subdirectories recursively", () => {
  mockFs({
    "definitions/marts/test": {
      "test1.sqlx": "content1",
      subdir: {
        "test2.sqlx": "content2",
        "test3.sqlx": "content3",
      },
    },
  });

  const result = refactoringFiles("definitions/marts/test");
  expect(result).toEqual(
    expect.arrayContaining([
      "definitions/marts/test/test1.sqlx",
      "definitions/marts/test/subdir/test2.sqlx",
      "definitions/marts/test/subdir/test3.sqlx",
    ])
  );
});

