# API Reference

Complete reference for `meadow-connection-postgresql`.

## Service Information

| Property | Value |
|----------|-------|
| Service Type | `MeadowConnectionPostgreSQL` |
| Extends | `fable-serviceproviderbase` |
| Driver | `pg` ^8.13.0 |

## Connection Methods

### [connectAsync(fCallback)](connectAsync.md)

Callback-style connection method (recommended). Creates the `pg.Pool` instance. If already connected, returns the existing pool immediately.

```javascript
_Fable.MeadowPostgreSQLProvider.connectAsync(
	(pError, pPool) =>
	{
		if (pError) { return console.error(pError); }
		// pPool is the pg.Pool instance
	});
```

### [connect()](connect.md)

Synchronous connection method. Creates the `pg.Pool` from the resolved settings. Called automatically when `MeadowConnectionPostgreSQLAutoConnect` is `true`.

```javascript
_Fable.MeadowPostgreSQLProvider.connect();
```

## Accessors

### [pool](pool.md)

Getter that returns the `pg.Pool` instance. Provides access to queries, parameterized statements, and client checkout.

```javascript
let tmpPool = _Fable.MeadowPostgreSQLProvider.pool;
tmpPool.query('SELECT * FROM "Animal"', (pErr, pRes) =>
{
	console.log(pRes.rows);
});
```

## Schema Management

### [generateCreateTableStatement(pMeadowTableSchema)](generateCreateTableStatement.md)

Generates a PostgreSQL `CREATE TABLE IF NOT EXISTS` DDL string from a Meadow table schema. Returns the SQL string without executing it.

```javascript
let tmpDDL = _Fable.MeadowPostgreSQLProvider.generateCreateTableStatement(tmpSchema);
console.log(tmpDDL);
```

### [createTable(pMeadowTableSchema, fCallback)](createTable.md)

Generates and executes a `CREATE TABLE` statement via the pool. Handles duplicate table errors gracefully.

```javascript
_Fable.MeadowPostgreSQLProvider.createTable(tmpAnimalSchema,
	(pError) =>
	{
		if (pError) { console.error(pError); }
	});
```

### [createTables(pMeadowSchema, fCallback)](createTables.md)

Creates multiple tables sequentially from a Stricture schema object.

```javascript
_Fable.MeadowPostgreSQLProvider.createTables(tmpSchema,
	(pError) =>
	{
		if (pError) { console.error(pError); }
	});
```

### [generateDropTableStatement(pTableName)](generateDropTableStatement.md)

Generates a `DROP TABLE IF EXISTS` DDL string for the named table.

```javascript
let tmpDrop = _Fable.MeadowPostgreSQLProvider.generateDropTableStatement('Animal');
// => 'DROP TABLE IF EXISTS "Animal";'
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `connected` | `boolean` | `true` after successful connection |
| `serviceType` | `string` | Always `'MeadowConnectionPostgreSQL'` |
| `options.PostgreSQL` | `object` | Resolved connection settings |

## Method Summary

| Method | Returns | Description |
|--------|---------|-------------|
| `connect()` | `void` | Synchronous connection |
| `connectAsync(fCallback)` | `void` | Callback-style connection |
| `pool` | `pg.Pool` / `false` | Connection pool instance |
| `generateCreateTableStatement(schema)` | `string` | SQL DDL for CREATE TABLE |
| `createTable(schema, fCallback)` | `void` | Execute CREATE TABLE |
| `createTables(schema, fCallback)` | `void` | Create multiple tables |
| `generateDropTableStatement(name)` | `string` | SQL DDL for DROP TABLE |
