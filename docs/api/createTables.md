# createTables(pMeadowSchema, fCallback)

Creates multiple PostgreSQL tables sequentially from a Stricture schema object.

## Signature

```javascript
createTables(pMeadowSchema, fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pMeadowSchema` | `object` | Schema with a `Tables` array of Meadow table schemas |
| `fCallback` | `function` | Callback receiving `(error)` |

## Return Value

Returns the result of the callback invocation.

## Behavior

1. Iterates over `pMeadowSchema.Tables` using `fable.Utility.eachLimit` with concurrency of 1
2. Calls `this.createTable(table, callback)` for each table
3. On completion: logs info, calls `fCallback()` with no error
4. On error: logs the error, calls `fCallback(pError)`

## Basic Usage

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
				{ Column: 'Name', DataType: 'String', Size: 128 },
				{ Column: 'IDFarm', DataType: 'ForeignKey' }
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
		},
		{
			TableName: 'Veterinarian',
			Columns:
			[
				{ Column: 'IDVeterinarian', DataType: 'ID' },
				{ Column: 'GUIDVeterinarian', DataType: 'GUID', Size: 36 },
				{ Column: 'LastName', DataType: 'String', Size: 128 },
				{ Column: 'IDFarm', DataType: 'ForeignKey' }
			]
		}
	]
};

_Fable.MeadowPostgreSQLProvider.createTables(tmpSchema,
	(pError) =>
	{
		if (pError)
		{
			console.error('Schema creation failed:', pError);
			return;
		}
		console.log('All tables created!');
	});
```

## Sequential Processing

Tables are created one at a time (concurrency of 1) using `fable.Utility.eachLimit`. This ensures:

- Deterministic creation order (important for foreign key dependencies)
- Clear log output showing each table as it is created
- Predictable error reporting -- the first failure stops the sequence

## Error Handling

If any table creation fails (other than the expected `42P07` duplicate_table error), the error is passed to the callback and remaining tables are skipped:

```javascript
_Fable.MeadowPostgreSQLProvider.createTables(tmpSchema,
	(pError) =>
	{
		if (pError)
		{
			// Only the first error is reported
			console.error('Failed during schema creation:', pError);
		}
	});
```

## Application Startup Pattern

Since `createTable()` handles existing tables gracefully, `createTables()` is safe to call on every application startup:

```javascript
_Fable.MeadowPostgreSQLProvider.connectAsync(
	(pError) =>
	{
		if (pError) { return console.error(pError); }

		_Fable.MeadowPostgreSQLProvider.createTables(appSchema,
			(pSchemaError) =>
			{
				if (pSchemaError) { return console.error(pSchemaError); }
				console.log('Database ready -- starting application');
				startApp();
			});
	});
```

## Related

- [createTable](createTable.md) -- Create a single table
- [generateCreateTableStatement](generateCreateTableStatement.md) -- Generate DDL without executing
- [Schema & Column Types](../schema.md) -- Full type mapping reference
