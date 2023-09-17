import { exec } from 'child_process';
import { readProjectConfiguration } from '@nrwl/devkit';

export default class NxHelper {
  static async execCliCommand(command: string): Promise<any> {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(stderr);
        } else {
          console.log(stdout);
          resolve(stdout);
        }
      });
    });
  }

  static getDirectory(tree, projectName: string): string {
    const sourceRoot = readProjectConfiguration(tree, projectName).sourceRoot;
    const directories = sourceRoot?.replace(/(apps[/])|([/]src)/g, '').split('/');
    if(directories && directories.length > 1){
      return directories[0];
    }
    return '';
  }
}


