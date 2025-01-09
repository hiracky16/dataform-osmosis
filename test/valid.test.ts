import { valid } from "../src/valid";
import { checkDataformCli, loadWorkflowSettings } from "../src/dataform";
import { checkBigQuery } from "../src/bigquery";

// モック関数の設定
jest.mock("../src/dataform", () => ({
  checkDataformCli: jest.fn(),
  loadWorkflowSettings: jest.fn(),
}));

jest.mock("../src/bigquery", () => ({
  checkBigQuery: jest.fn(),
}));

describe("valid function", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call checkDataformCli, loadWorkflowSettings, and checkBigQuery in sequence", async () => {
    // モックの戻り値を設定
    const mockConfig = { defaultProject: "test-project" };
    (loadWorkflowSettings as jest.Mock).mockReturnValue(mockConfig);

    // 関数の実行
    await valid();

    // モック関数が正しく呼び出されたかを検証
    expect(checkDataformCli).toHaveBeenCalledTimes(1);
    expect(loadWorkflowSettings).toHaveBeenCalledTimes(1);
    expect(checkBigQuery).toHaveBeenCalledTimes(1);
    expect(checkBigQuery).toHaveBeenCalledWith("test-project");
  });

  it("should throw an error if checkDataformCli fails", async () => {
    // モック関数がエラーをスローするように設定
    (checkDataformCli as jest.Mock).mockRejectedValue(new Error("CLI check failed"));

    await expect(valid()).rejects.toThrow("CLI check failed");

    expect(checkDataformCli).toHaveBeenCalledTimes(1);
    expect(loadWorkflowSettings).not.toHaveBeenCalled();
    expect(checkBigQuery).not.toHaveBeenCalled();
  });

  it("should throw an error if checkBigQuery fails", async () => {
    // モックの戻り値を設定
    const mockConfig = { defaultProject: "test-project" };
    (checkDataformCli as jest.Mock).mockResolvedValue(undefined);
    (loadWorkflowSettings as jest.Mock).mockReturnValue(mockConfig);

    // checkBigQuery をエラーに設定
    (checkBigQuery as jest.Mock).mockRejectedValue(new Error("BigQuery check failed"));

    await expect(valid()).rejects.toThrow("BigQuery check failed");

    expect(checkDataformCli).toHaveBeenCalledTimes(1);
    expect(loadWorkflowSettings).toHaveBeenCalledTimes(1);
    expect(checkBigQuery).toHaveBeenCalledTimes(1);
  });
});
