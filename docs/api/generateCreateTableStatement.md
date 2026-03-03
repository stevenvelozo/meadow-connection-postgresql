# generateCreateTableStatement(pMeadowTableSchema)

Generates a PostgreSQL `CREATE TABLE IF NOT EXISTS` DDL string from a Meadow table schema. Returns the SQL string without executing it.

## Signature

```javascript
generateCreateTableStatement(pMeadowTableSchema)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pMeadowTableSchema` | `object` | Meadow table schema with `TableName` and `Columns` array |

## Return Value

| Type | Description |
|------|-------------|
| `string` | The complete `CREATE TABLE IF NOT EXISTS` SQL statement |

## Schema Object Format

```javascript
let tmpSchema =
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

## Basic Usage

```javascript
let tmpDDL = _Fable.MeadowPostgreSQLProvider.generateCreateTableStatement(tmpSchema);
console.log(tmpDDL);
```

Output:

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

## Type Mapping

| Meadow DataType | PostgreSQL Type | Constraints |
|-----------------|-----------------|-------------|
| `ID` | `SERIAL` | `PRIMARY KEY` |
| `GUID` | `VARCHAR(Size)` | `DEFAULT '0xDe'` |
| `ForeignKey` | `INTEGER` | `NOT NULL DEFAULT 0` |
| `Numeric` | `INTEGER` | `NOT NULL DEFAULT 0` |
| `Decimal` | `DECIMAL(Size)` | -- |
| `String` | `VARCHAR(Size)` | `NOT NULL DEFAULT ''` |
| `Text` | `TEXT` | -- |
| `DateTime` | `TIMESTAMP` | -- |
| `Boolean` | `BOOLEAN` | `NOT NULL DEFAULT false` |

## DDL Structure

The generated DDL has these parts:

1. **Comment line** -- `--   [ TableName ]`
2. **CREATE TABLE IF NOT EXISTS** -- idempotent creation
3. **Quoted table name** -- double-quoted for reserved word safety
4. **Column definitions** -- each column on its own line, comma-separated
5. **Closing parenthesis and semicolon**

### Quoted Identifiers

All table and column names are wrapped in double quotes (`"Name"`). This ensures safe handling of PostgreSQL reserved words (e.g., `"User"`, `"Order"`, `"Group"`).

## GUID Size Handling

The `GUID` type defaults to `VARCHAR(36)` if no `Size` is specified. If the `Size` value is `NaN`, it also falls back to 36:

```javascript
// Explicit size
{ Column: 'GUIDAnimal', DataType: 'GUID', Size: 36 }
// => "GUIDAnimal" VARCHAR(36) DEFAULT '0xDe'

// No size -- defaults to 36
{ Column: 'GUIDAnimal', DataType: 'GUID' }
// => "GUIDAnimal" VARCHAR(36) DEFAULT '0xDe'
```

## Inspecting Without Executing

Use this method to preview the DDL without applying it to the database:

```javascript
let tmpDDL = _Fable.MeadowPostgreSQLProvider.generateCreateTableStatement(tmpSchema);
console.log('Would execute:');
console.log(tmpDDL);
```

## Differences from MySQL DDL

| Feature | PostgreSQL | MySQL |
|---------|-----------|-------|
| Auto-increment | `SERIAL PRIMARY KEY` | `INT UNSIGNED NOT NULL AUTO_INCREMENT` |
| Boolean | `BOOLEAN NOT NULL DEFAULT false` | `TINYINT NOT NULL DEFAULT 0` |
| DateTime | `TIMESTAMP` | `DATETIME` |
| Identifier quoting | `"column"` | `` `column` `` |
| Integer signing | Signed only | `UNSIGNED` support |
| Character set | Inherited from database | Per-table `CHARSET`/`COLLATE` |

## Related

- [createTable](createTable.md) -- Generate and execute the DDL
- [createTables](createTables.md) -- Create multiple tables
- [generateDropTableStatement](generateDropTableStatement.md) -- Generate DROP TABLE DDL
- [Schema & Column Types](../schema.md) -- Full type mapping reference
