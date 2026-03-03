# generateDropTableStatement(pTableName)

Generates a PostgreSQL `DROP TABLE IF EXISTS` DDL string for the named table.

## Signature

```javascript
generateDropTableStatement(pTableName)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pTableName` | `string` | The name of the table to drop |

## Return Value

| Type | Description |
|------|-------------|
| `string` | The `DROP TABLE IF EXISTS` SQL statement |

## Basic Usage

```javascript
let tmpDrop = _Fable.MeadowPostgreSQLProvider.generateDropTableStatement('Animal');
console.log(tmpDrop);
// => 'DROP TABLE IF EXISTS "Animal";'
```

## DDL Format

The generated statement uses:

- **`IF EXISTS`** -- prevents errors when the table does not exist
- **Quoted identifier** -- double-quoted table name for reserved word safety

## Executing the Drop

The method only generates the SQL string. To execute it, use the `pool` getter:

```javascript
let tmpDrop = _Fable.MeadowPostgreSQLProvider.generateDropTableStatement('Animal');
let tmpPool = _Fable.MeadowPostgreSQLProvider.pool;

tmpPool.query(tmpDrop,
	(pError, pResult) =>
	{
		if (pError) { return console.error(pError); }
		console.log('Table dropped.');
	});
```

## Cascading Drops

The generated statement does not include `CASCADE`. If the table has dependent objects (foreign keys, views), add `CASCADE` manually:

```javascript
let tmpDrop = _Fable.MeadowPostgreSQLProvider.generateDropTableStatement('Farm');
// => 'DROP TABLE IF EXISTS "Farm";'

// To cascade:
let tmpCascadeDrop = tmpDrop.replace(';', ' CASCADE;');
// => 'DROP TABLE IF EXISTS "Farm" CASCADE;'
```

## Related

- [generateCreateTableStatement](generateCreateTableStatement.md) -- Generate CREATE TABLE DDL
- [createTable](createTable.md) -- Create a table
- [Schema & Column Types](../schema.md) -- Full type mapping reference
