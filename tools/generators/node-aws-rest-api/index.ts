import { ProjectConfiguration, Tree, addDependenciesToPackageJson, formatFiles, generateFiles, installPackagesTask, joinPathFragments, readProjectConfiguration, readWorkspaceConfiguration, updateProjectConfiguration } from '@nrwl/devkit';
import { libraryGenerator } from '@nrwl/workspace/generators';
import { applicationGenerator } from '@nrwl/nest';
import FileHelper from './helpers/file.helper';
import NxHelper from './helpers/nx.helper';
import NestHelper from './helpers/NEST.helper';


/// ----------------------------------------------------------------------------
/// ----------------------------------------------------------------------------
export default async function (tree: Tree, schema: any) {

  schema.tsExtension = 'ts';
  schema.npmScope = readWorkspaceConfiguration(tree).npmScope;
  schema.directoryImports = schema.directory ? schema.directory + '/' : '';
  schema.directoryFile = schema.directory ? schema.directory + '-' : '';
  schema.directory = schema.directory ? schema.directory : '';
  schema.directoryName =
    schema.directory?.replace(/^./, (it) => it.toUpperCase()) || '';

  await formatFiles(tree);
  await build(tree, schema);
  return () => {
    installPackagesTask(tree);
  };
}

/// ----------------------------------------------------------------------------
/// ----------------------------------------------------------------------------
// BUILDER 

const build = async (tree, schema) => {

  const projectName =
    (schema.directory ? schema.directory + '-' : '') + schema.name;
  const directory = schema.directory;

  // create the boilerplate for NestJS API
  await bootstrapSoftware(tree, schema, projectName, directory);

  // create the dockerfiles for the API
  await dockerizeSoftware(tree, schema, projectName, directory);

  // choose the underlying infrastructure for running the REST API's
  // https://aws.amazon.com/es/getting-started/decision-guides/containers-on-aws-how-to-choose/
  await bootstrapInfrastructure(tree, schema, projectName);

  // create the AWS pipelines
  await createPipelines(tree, schema);
}

// INFRA AWS
const bootstrapInfrastructure = async (tree, schema, projectName) => {
  const { capacity, orchestration } = paramCheck(tree, schema);
  await bootInfrastructure(tree, schema, projectName);
  await buildInfrastructure(tree, schema);
}


/// ----------------------------------------------------------------------------
/// ----------------------------------------------------------------------------
// check section
const paramCheck = (tree, schema) => {
  const capacity = capacityCheck(tree, schema);
  const orchestration = orchestrationCheck(tree, schema);

  return { capacity, orchestration };
}

const capacityCheck = (tree, schema) => {
  let capacity;
  if (schema.capacity === 'AWS Fargate') { }
  if (schema.capacity === 'AWS EC2') { }
}


const orchestrationCheck = (tree, schema) => {
  let orchestration;
  if (schema.orchestration === 'AWS Fargate') { }
  if (schema.orchestration === 'AWS EC2') { }
  return;
}


/// ----------------------------------------------------------------------------
/// ----------------------------------------------------------------------------


// boot the infra lib
const bootInfrastructure = async (tree, schema, projectName) => {
  let liftUpPulumiProjectCommand = `npx nx generate @wanews/nx-pulumi:init-standalone infra-${schema.directory} --no-interactive`;
  let addDependenciesCommand = 'npm i @wanews/nx-pulumi@^0.26.0 dotenv@^16.0.2';

  if (isDryRun()) {
    liftUpPulumiProjectCommand += ' --dry-run';
    addDependenciesCommand += ' --dry-run';
    addDependenciesCommand += ' --verbose';
    liftUpPulumiProjectCommand += ' --verbose';
  }

  console.debug('Adding pulumi dependencies...');
  await NxHelper.execCliCommand(addDependenciesCommand);

  console.debug('Running pulumi generator...');
  await NxHelper.execCliCommand(liftUpPulumiProjectCommand);

  addDependenciesToPackageJson(
    tree,
    {
      "@pulumi/aws": "^5.23.0",
      "@pulumi/awsx": "1.0.5",
      "@pulumi/pulumi": "^3.48.0",
    },
    {}
  );


  const actualProjectConfig: any = readProjectConfiguration(tree, projectName) || '';
  const latestProjectConfig: ProjectConfiguration = {
    ...actualProjectConfig,
    targets: {
      ...actualProjectConfig.targets,
      build: {
        ...actualProjectConfig.targets.build,
        options: {
          ...actualProjectConfig.targets.build.options,
          generatePackageJson: true,
        },
      },
      "destroy:pulumi": {
        executor: "@nrwl/workspace:run-commands",
        options: {
          commands: [
            `pulumi destroy -C ./apps/${schema.directory}/ --yes`
          ],
          parallel: false
        }
      },
      'preview:pulumi': {
        executor: '@nrwl/workspace:run-commands',
        options: {
          commands: [
            `pulumi preview -C ./apps/${schema.directory}/`,
          ],
          parallel: false,
        },
      },
      'deploy:pulumi': {
        executor: '@nrwl/workspace:run-commands',
        options: {
          commands: [
            `pulumi up -C ./apps/${schema.directory}/ --yes`,
          ],
          parallel: false,
        },
      },
    },
  };

  updateProjectConfiguration(tree, projectName, latestProjectConfig);
}


// build infrastructure
const buildInfrastructure = async (tree, schema) => {
  console.debug('Generating infra files...');


  // add initial files for ECS
  generateFiles(
    tree,
    joinPathFragments(__dirname, './files/infra/ecs'),
    `./apps/infra-${schema.directory}`,
    schema
  );
}

function isDryRun() {
  return process.env.npm_lifecycle_script?.includes('--dry-run');
}



/// ----------------------------------------------------------------------------
/// ----------------------------------------------------------------------------

// SOFTWARE TIME

const bootstrapSoftware = async (tree, schema, projectName, directory) => {
  await addBaseProject(tree, schema, projectName);
  await addHealthCheck(tree, schema, projectName, directory)
}


async function addBaseProject(tree: any, schema: any, projectName: string) {

  await applicationGenerator(tree, {
    name: schema.name,
    directory: schema.directory,
  });


  const workspaceConfig = readProjectConfiguration(tree, projectName).sourceRoot || '';

  generateFiles(
    tree,
    joinPathFragments(__dirname, './files/apps/src'),
    workspaceConfig,
    schema
  );

  addDependenciesToPackageJson(
    tree,
    {
      '@nestjs/common': '^8.0.0',
      '@nestjs/config': '^2.0.0',
      '@nestjs/core': '^8.0.0',
      '@nestjs/platform-express': '^8.0.0',
      '@nestjs/swagger': '^5.2.1',
      'class-transformer': '^0.5.1',
      'class-validator': '^0.13.2',
      'core-js': '^3.6.5',
      dayjs: '^1.11.0',
      'reflect-metadata': '^0.1.13',
      tslib: '^2.0.0',
      'swagger-ui-express': '^4.4.0',
    },
    {}
  );

  await addBaseLibraries(tree, schema);

}

async function addBaseLibraries(tree, schema) {
  await NestHelper.libraryCreate('services', tree, schema, __dirname, true);
}


function addHealthCheck(tree, schema, projectName, directory) {
  const root = readProjectConfiguration(tree, projectName).sourceRoot || '';

  addDependenciesToPackageJson(
    tree,
    {
      '@nestjs/axios': '^0.0.7',
      '@nestjs/terminus': '^8.0.6',
    },
    {}
  );

  generateFiles(
    tree,
    joinPathFragments(__dirname, './files/apps/health-check/apps/src'),
    root,
    schema
  );

  generateFiles(
    tree,
    joinPathFragments(__dirname, './files/apps/health-check/libs'),
    `/libs/${directory}`,
    schema
  );

  FileHelper.replaceExportsIndex(
    tree,
    `libs/${directory}/services/src/index.ts`,
    `export * from './lib/health/health.service';`
  );

  FileHelper.addImport(
    tree,
    `${root}/app/app.module.ts`,
    `import { HealthController } from './health/health.controller';`
  );

  FileHelper.addElementToModule(
    tree,
    `${root}/app/app.module.ts`,
    'HealthController',
    'controllers',
    '\r'
  );

  // ${directory}-services.module

  FileHelper.addImport(
    tree,
    `libs/${directory}/services/src/lib/${schema.directory}-services.module.ts`,
    `import { HealthCheckService } from './health/health.service';`
  );

  FileHelper.addImport(
    tree,
    `libs/${directory}/services/src/lib/${schema.directory}-services.module.ts`,
    `import { TerminusModule } from '@nestjs/terminus';`
  );

  FileHelper.addImport(
    tree,
    `libs/${directory}/services/src/lib/${schema.directory}-services.module.ts`,
    `import { HttpModule } from '@nestjs/axios';`
  );

  FileHelper.addElementToModule(
    tree,
    `libs/${directory}/services/src/lib/${schema.directory}-services.module.ts`,
    'TerminusModule',
    'imports',
    '\r'
  );

  FileHelper.addElementToModule(
    tree,
    `libs/${directory}/services/src/lib/${schema.directory}-services.module.ts`,
    'HttpModule',
    'imports',
    '\r'
  );

  FileHelper.addElementToModule(
    tree,
    `libs/${directory}/services/src/lib/${schema.directory}-services.module.ts`,
    'HealthCheckService',
    'providers'
  );

  FileHelper.addElementToModule(
    tree,
    `libs/${directory}/services/src/lib/${schema.directory}-services.module.ts`,
    'HealthCheckService',
    'exports'
  );
}

function dockerizeSoftware(tree, schema, projectName, directory) {
  console.debug('Generating dockers files...');

  generateFiles(
    tree,
    joinPathFragments(__dirname, `./files/docker/`),
    `apps/${schema.directory}/${schema.name}/`,
    schema
  );

  const actualProjectConfig: any = readProjectConfiguration(tree, projectName) || '';
  const latestProjectConfig: ProjectConfiguration = {
    ...actualProjectConfig,
    targets: {
      ...actualProjectConfig.targets,
      build: {
        ...actualProjectConfig.targets.build,
        options: {
          ...actualProjectConfig.targets.build.options,
          generatePackageJson: true,
        },
      },
      'build:docker': {
        executor: '@nrwl/workspace:run-commands',
        options: {
          commands: [
            `docker build -f ./apps/${schema.directory}/${schema.name}/Dockerfile . -t ${schema.directory}-${schema.name} --build-arg appName=${schema.directory} --build-arg serviceName=${schema.name} --no-cache`,
          ],
          parallel: false,
        },
      },
      'serve:docker': {
        executor: '@nrwl/workspace:run-commands',
        options: {
          commands: [
            `docker run -p 3333:3333 ${schema.directory}-${schema.name}:latest`,
          ],
          parallel: false,
        },
      },
    },
  };

  console.debug('Adding docker commands to project configuration...');

  updateProjectConfiguration(tree, projectName, latestProjectConfig);
}


/// ----------------------------------------------------------------------------
/// ----------------------------------------------------------------------------

// CI/CD



const createPipelines = async (tree, schema) => {
  return;
}
