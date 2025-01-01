import { loadWorkflowSettings } from './../src/dataform'
import fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { WorkflowSettings } from './../src/types'; // Replace with the actual path to your types file

jest.mock('fs');

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