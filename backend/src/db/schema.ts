export interface DatabaseSchema {
  schema_migrations: {
    version: string;
    name: string;
    applied_at: Date;
  };
}
