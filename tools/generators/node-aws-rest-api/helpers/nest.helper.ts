import {
  generateFiles,
  joinPathFragments,
  readProjectConfiguration,
  Tree
} from '@nrwl/devkit';
import { libraryGenerator } from '@nrwl/nest';

export default class NestHelper {
  static async libraryCreate(
    name: string,
    tree: Tree,
    schema: any,
    basePath: string,
    isGenerateFiles: boolean = false
  ) {
    const libraryPath = (schema.directory ? schema.directory + '-' : '') + name;

    await libraryGenerator(tree, {
      name,
      directory: schema.directory,
      service: false,
      controller: false,
      buildable: true
    });
    const workspaceConfig = readProjectConfiguration(tree, libraryPath).sourceRoot || '';
    if (isGenerateFiles) {
      generateFiles(
        tree,
        joinPathFragments(basePath, `./files/libs/${name}/src`),
        workspaceConfig,
        schema
      );
    }
  }
}
