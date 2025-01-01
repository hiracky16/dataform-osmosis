import { loadWorkflowSettings, checkDataformCli } from './../src/dataform'
import fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { WorkflowSettings } from './../src/types';
import util from 'util';

jest.mock('fs');
jest.mock('child_process');

describe('loadWorkflowSettings', () => {
  const mockReadFileSync = fs.readFileSync as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should load settings from workflow_settings.yaml', () => {
    const mockYamlContent = `
      defaultProject: 'project_id'
      defaultLocation: 'US'
      defaultDataset: 'dataform'
      defaultAssertionDataset: 'dataform_assertion'
    `;
    (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
    mockReadFileSync.mockReturnValueOnce(mockYamlContent);

    const expectedConfig: WorkflowSettings = {
      defaultProject: 'project_id',
      defaultLocation: 'US',
      defaultDataset: 'dataform',
      defaultAssertionDataset: 'dataform_assertion'
    };

    const result = loadWorkflowSettings();

    expect(result).toEqual(expectedConfig);
    expect(fs.existsSync).toHaveBeenCalledWith(path.resolve(process.cwd(), 'workflow_settings.yaml'));
    expect(fs.readFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), 'workflow_settings.yaml'), 'utf8');
  });

  it('should load settings from dataform.json', () => {
    const mockJsonContent = JSON.stringify({
      defaultProject: 'project_id',
      defaultLocation: 'US',
      defaultDataset: 'dataform',
      defaultAssertionDataset: 'dataform_assertion'
    });
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
    (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
    mockReadFileSync.mockReturnValueOnce(mockJsonContent);

    const expectedConfig: WorkflowSettings = {
      defaultProject: 'project_id',
      defaultLocation: 'US',
      defaultDataset: 'dataform',
      defaultAssertionDataset: 'dataform_assertion'
    };

    const result = loadWorkflowSettings();

    expect(result).toEqual(expectedConfig);
    expect(fs.existsSync).toHaveBeenNthCalledWith(1, path.resolve(process.cwd(), 'workflow_settings.yaml'));
    expect(fs.existsSync).toHaveBeenNthCalledWith(2, path.resolve(process.cwd(), 'dataform.json'));
    expect(fs.readFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), 'dataform.json'), 'utf8');
  });

  it('should throw an error if no settings file is found', () => {
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

    expect(loadWorkflowSettings).toThrow('🚫 workflow_settings.yaml file not found.');
  });
});

describe('checkDataformCli', () => {
  const mockExecAsync = util.promisify(jest.fn()) as jest.Mock;
  const mockLoadWorkflowSettings = loadWorkflowSettings as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call execAsync with dataform --version and log success', async () => {
    const mockStdout = 'dataform version 1.2.3';
    mockExecAsync.mockResolvedValueOnce({ stdout: mockStdout, stderr: '' });

    await checkDataformCli();

    expect(mockExecAsync).toHaveBeenCalledWith('dataform --version');
    expect(console.info).toHaveBeenCalledWith('✅️ Dataform CLI working. version:', mockStdout);
  });

  it('should throw error if dataform command fails', async () => {
    const mockStderr = 'dataform: command not found';
    mockExecAsync.mockRejectedValueOnce(new Error(mockStderr));

    await expect(checkDataformCli()).rejects.toThrow(mockStderr);
    expect(console.error).toHaveBeenCalledWith('🚫 Error: Dataform CLI is not working.', mockStderr);
  });

  it('should call loadWorkflowSettings after successful dataform check', async () => {
    const mockStdout = 'dataform version 1.2.3';
    mockExecAsync.mockResolvedValueOnce({ stdout: mockStdout, stderr: '' });

    await checkDataformCli();

    expect(mockLoadWorkflowSettings).toHaveBeenCalledTimes(1);
  });

  it('should re-throw error from loadWorkflowSettings', async () => {
    const mockStderr = 'dataform: command not found';
    mockExecAsync.mockResolvedValueOnce({ stdout: 'dataform version 1.2.3', stderr: '' });
    mockLoadWorkflowSettings.mockImplementationOnce(() => { throw new Error(mockStderr); });

    await expect(checkDataformCli()).rejects.toThrow(mockStderr);
    expect(console.error).toHaveBeenCalledWith('🚫 Error: ', mockStderr);
  });
});
