from sqlalchemy import Column, DateTime, MetaData, String, Table

metadata = MetaData()

schema_migrations = Table(
    "schema_migrations",
    metadata,
    Column("version", String, primary_key=True),
    Column("name", String, nullable=False),
    Column("applied_at", DateTime),
)
