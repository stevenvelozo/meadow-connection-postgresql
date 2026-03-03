# createTable(pMeadowTableSchema, fCallback)

Generates and executes a PostgreSQL `CREATE TABLE IF NOT EXISTS` statement from a Meadow table schema. Handles existing tables gracefully.

## Signature

```javascript
createTable(pMeadowTableSchema, fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pMeadowTableSchema` | `object` | Meadow table schema with `TableName` and `Columns` array |
| `fCallback` | `function` | Callback receiving `(error)` |

## Return Value

Returns the result of the callback invocation.

## Behavior

1. Calls `generateCreateTableStatement(pMeadowTableSchema)` to produce the DDL string
2. Executes the DDL via `this._ConnectionPool.query(ddl, callback)`
3. On success: logs info, calls `fCallback()` with no error
4. On error code `42P07` (duplicate_table): logs a warning, calls `fCallback()` with no error
5. On other errors: logs the error, calls `fCallback(pError)`

## Basic Usage

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
		{ Column: 'Weight', DataType: 'Decimal', Size: '10,2' }
	]
};

_Fable.MeadowPostgreSQLProvider.createTable(tmpAnimalSchema,
	(pError) =>
	{
		if (pError)
		{
			console.error('Table creation failed:', pError);
			return;
		}
		console.log('Animal table ready!');
	});
```

## Idempotent Execution

Table creation is idempotent through two layers of protection:

1. **`CREATE TABLE IF NOT EXISTS`** in the generated SQL
2. **Error code 42P07 handling** -- if PostgreSQL returns `duplicate_table`, it is logged as a warning and does not produce an error in the callback

This makes `createTable()` safe to call during application startup:

```javascript
// Safe to call every time the app starts
_Fable.MeadowPostgreSQLProvider.createTable(tmpAnimalSchema,
	(pError) =>
	{
		// First run: table created
		// Subsequent runs: table already exists (warning logged)
	});
```

## Prerequisites

The connection must be established before calling `createTable()`:

```javascript
_Fable.MeadowPostgreSQLProvider.connectAsync(
	(pError) =>
	{
		if (pError) { return; }

		_Fable.MeadowPostgreSQLProvider.createTable(tmpAnimalSchema,
			(pCreateError) =>
			{
				if (pCreateError) { console.error(pCreateError); }
			});
	});
```

## Error Handling

Non-duplicate errors (e.g., syntax errors, permission denied) are passed to the callback:

```javascript
_Fable.MeadowPostgreSQLProvider.createTable(tmpBadSchema,
	(pError) =>
	{
		if (pError)
		{
			// pError.code might be '42601' (syntax error) or '42501' (insufficient privilege)
			console.error('DDL execution failed:', pError.message);
		}
	});
```

## Related

- [generateCreateTableStatement](generateCreateTableStatement.md) -- Generate DDL without executing
- [createTables](createTables.md) -- Create multiple tables sequentially
- [generateDropTableStatement](generateDropTableStatement.md) -- Generate DROP TABLE DDL
- [Schema & Column Types](../schema.md) -- Full type mapping reference
