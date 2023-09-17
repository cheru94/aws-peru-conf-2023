import { Tree } from '@nrwl/devkit';
import { tsquery } from '@phenomnomnominal/tsquery';

export default class FileHelper {
  /**
   * TODO: check if the imports already exists
   */
  static addImport(tree: Tree, filePath: string, importStatement: string) {
    const contents = tree.read(filePath).toString();

    if (contents.includes(importStatement)) {
      return;
    }

    const contentToSave = contents.replace(';', ';\n' + importStatement);
    tree.write(filePath, contentToSave);
  }

  static addElementToModule(
    tree: Tree,
    filePath: string,
    elementName: string,
    section: string,
    separator = ''
  ) {
    const contents = tree.read(filePath).toString();
    let contentToReplace;

    if (contents.indexOf(`${section}: []`) > 0) {
      contentToReplace = `${section}: [` + elementName;
    } else {
      contentToReplace = `${section}: [` + elementName + `, ${separator}`;
    }

    const foundExpression = this.findAssignment(section, elementName, contents);

    if(foundExpression) {
      return;
    }

    const contentToSave = contents.replace(`${section}: [`, contentToReplace);

    return tree.write(filePath, contentToSave);
  }

  static replaceExportsIndex(tree: Tree, filePath: string, data: string) {
    const contents = tree.read(filePath).toString();

    if (contents.includes(data)) {
      return;
    }

    const contentToSave = contents.replace(';', '; \n' + data);
    tree.write(filePath, contentToSave);
  }

  static addEnvVariable(tree, name, value) {
    const filePath = '/env/.env';
    const contents = tree.read(filePath).toString();
    return tree.write(filePath, contents.concat(`\n${name}=${value}`));
  }

  static findAssignment(section, elementName, stringContent) {
    const astContent = tsquery.ast(stringContent);
    const nodes = tsquery(astContent, `[name=${section}]`);

    return (nodes[0].parent as any).initializer.elements.find((item) => {
      if (item.escapedText === elementName) {
        return true;
      }
    });
  }

  static modifyEnvironments(tree, sourceRoot, property, content?) {
    const envFolder = `${sourceRoot}/environments`;
    if (!tree.exists(envFolder)) {
      return () => {
        console.error('Environments folder not found');
      };
    }

    // Modificar environments
    for (const envFile of tree.children(envFolder)) {
      const path = `${envFolder}/${envFile}`;
      let env = tree.read(path).toString();
      const match = env.match(/{[^;]*/g);
      if (match.length) {
        const json = eval('(' + match[0] + ')');

        // Limpiar propiedad del archivo
        if (Object.keys(json).includes(property))
          delete json[property];

        if (content){
          // Agregar nuevo contenido a la propiedad
          json[property] = content;
        }

        env = env.replace(/{[^;]*/g, JSON.stringify(json));
      }
      // Escribir archivo
      tree.write(path, env);
    }
  }
}
