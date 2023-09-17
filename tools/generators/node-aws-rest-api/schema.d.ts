export interface NodeAwsRestApiSchemaGenerator {
  name: string;
  dominio: string;
  capacity: string;
  database?: string;
  cache?: boolean;
  cdn?: boolean;
  storage?: boolean;
  waf?: boolean;
  auth?: boolean;
}
