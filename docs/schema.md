# Schema & Column Types

## Overview

The PostgreSQL connector generates standard SQL DDL (`CREATE TABLE`, `DROP TABLE`) from Meadow table schemas. Unlike MongoDB or Dgraph connectors that produce descriptor objects, this connector generates SQL strings that are executed directly via `pool.query()`.

## Column Type Mapping

| Meadow DataType | PostgreSQL Type | Constraints | Size Used |
|-----------------|-----------------|-------------|-----------|
| `ID` | `SERIAL` | `PRIMARY KEY` | No |
| `GUID` | `VARCHAR(Size)` | `DEFAULT '0xDe'` | Yes (default 36) |
| `ForeignKey` | `INTEGER` | `NOT NULL DEFAULT 0` | No |
| `Numeric` | `INTEGER` | `NOT NULL DEFAULT 0` | No |
| `Decimal` | `DECIMAL(Size)` | -- | Yes (e.g. `10,2`) |
| `String` | `VARCHAR(Size)` | `NOT NULL DEFAULT ''` | Yes |
| `Text` | `TEXT` | -- | No |
| `DateTime` | `TIMESTAMP` | -- | No |
| `Boolean` | `BOOLEAN` | `NOT NULL DEFAULT false` | No |

### Key Behaviors

- **`ID`** -- uses PostgreSQL's `SERIAL` type which auto-creates a sequence and sets `NOT NULL DEFAULT nextval(...)`. The `PRIMARY KEY` constraint is declared inline.
- **`GUID`** -- defaults to `VARCHAR(36)` if no `Size` is provided or if the `Size` value is not a number.
- **`Boolean`** -- uses PostgreSQL's native `BOOLEAN` type (not `TINYINT` like MySQL).
- **`Decimal`** -- the `Size` property is passed directly (e.g. `'10,2'` becomes `DECIMAL(10,2)`).
- **Quoted identifiers** -- all table and column names are wrapped in double quotes (`"Name"`) to safely handle PostgreSQL reserved words.

## Generated DDL Example

Given this Meadow table schema:

```javascript
let tmpAnimalSchema =
{
	TableName: 'Animal',
	Columns:
	[
		{ Column: 'IDAnimal', DataType: 'ID' },
		{ Column: 'GUIDAnimal', DataType: 'GUID', Size: 36 },
		{ Column: 'Name', DataType: 'String', Size: 128 },
		{ Column: 'Age', DataType: 'Numeric' },
		{ Column: 'Weight', DataType: 'Decimal', Size: '10,2' },
		{ Column: 'Description', DataType: 'Text' },
		{ Column: 'CreateDate', DataType: 'DateTime' },
		{ Column: 'Deleted', DataType: 'Boolean' }
	]
};
```

The generated DDL:

```sql
--   [ Animal ]
CREATE TABLE IF NOT EXISTS
    "Animal"
    (
        "IDAnimal" SERIAL PRIMARY KEY,
        "GUIDAnimal" VARCHAR(36) DEFAULT '0xDe',
        "Name" VARCHAR(128) NOT NULL DEFAULT '',
        "Age" INTEGER NOT NULL DEFAULT 0,
        "Weight" DECIMAL(10,2),
        "Description" TEXT,
        "CreateDate" TIMESTAMP,
        "Deleted" BOOLEAN NOT NULL DEFAULT false
    );
```

## Drop Table Statement

The `generateDropTableStatement(name)` method generates a `DROP TABLE IF EXISTS` statement:

```javascript
let tmpDrop = _Fable.MeadowPostgreSQLProvider.generateDropTableStatement('Animal');
// => 'DROP TABLE IF EXISTS "Animal";'
```

## Multiple Tables

Use `createTables()` to create multiple tables from a Stricture schema:

```javascript
let tmpSchema =
{
	Tables:
	[
		{
			TableName: 'Animal',
			Columns:
			[
				{ Column: 'IDAnimal', DataType: 'ID' },
				{ Column: 'GUIDAnimal', DataType: 'GUID', Size: 36 },
				{ Column: 'Name', DataType: 'String', Size: 128 }
			]
		},
		{
			TableName: 'Farm',
			Columns:
			[
				{ Column: 'IDFarm', DataType: 'ID' },
				{ Column: 'GUIDFarm', DataType: 'GUID', Size: 36 },
				{ Column: 'FarmName', DataType: 'String', Size: 256 }
			]
		}
	]
};

_Fable.MeadowPostgreSQLProvider.createTables(tmpSchema,
	(pError) =>
	{
		if (pError) { console.error(pError); return; }
		console.log('All tables created!');
	});
```

Tables are created sequentially (concurrency of 1) to ensure deterministic ordering.

## PostgreSQL vs MySQL Type Mapping

| Meadow DataType | PostgreSQL | MySQL |
|-----------------|-----------|-------|
| `ID` | `SERIAL PRIMARY KEY` | `INT UNSIGNED NOT NULL AUTO_INCREMENT` |
| `GUID` | `VARCHAR(36)` | `CHAR(36)` |
| `ForeignKey` | `INTEGER NOT NULL DEFAULT 0` | `INT UNSIGNED NOT NULL DEFAULT 0` |
| `Numeric` | `INTEGER NOT NULL DEFAULT 0` | `INT NOT NULL DEFAULT 0` |
| `Decimal` | `DECIMAL(Size)` | `DECIMAL(Size)` |
| `String` | `VARCHAR(Size) NOT NULL DEFAULT ''` | `VARCHAR(Size) NOT NULL DEFAULT ''` |
| `Text` | `TEXT` | `TEXT` |
| `DateTime` | `TIMESTAMP` | `DATETIME` |
| `Boolean` | `BOOLEAN NOT NULL DEFAULT false` | `TINYINT NOT NULL DEFAULT 0` |

### Notable Differences

- **Auto-increment**: PostgreSQL uses `SERIAL` (sequence-backed); MySQL uses `AUTO_INCREMENT`
- **Boolean**: PostgreSQL has a native `BOOLEAN` type; MySQL uses `TINYINT`
- **DateTime**: PostgreSQL uses `TIMESTAMP`; MySQL uses `DATETIME`
- **Integer signing**: PostgreSQL integers are always signed; MySQL supports `UNSIGNED`
- **GUID default**: PostgreSQL uses `DEFAULT '0xDe'`; this placeholder is replaced at insertion time by Meadow's auto-GUID mechanism
- **Identifiers**: PostgreSQL uses double quotes (`"Name"`); MySQL uses backticks (`` `Name` ``)

## Idempotent Schema

Table creation is idempotent through two mechanisms:

1. **`CREATE TABLE IF NOT EXISTS`** -- PostgreSQL skips creation if the table exists
2. **Error code 42P07** -- the connector catches `duplicate_table` errors and logs a warning instead of failing

This makes `createTable()` and `createTables()` safe to call during application startup.
