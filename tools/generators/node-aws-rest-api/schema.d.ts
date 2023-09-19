export interface NodeAwsRestApiSchemaGenerator {
  directory: string;
  name: string;
  capacity: string;
  database?: string;
  cache?: boolean;
  cdn?: boolean;
  storage?: boolean;
  waf?: boolean;
  auth?: boolean;
}
