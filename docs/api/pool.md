# pool (getter)

Returns the `pg.Pool` connection pool instance for executing queries against PostgreSQL.

## Signature

```javascript
get pool()
```

## Return Value

| Type | Description |
|------|-------------|
| `pg.Pool` | The node-postgres connection pool (after connecting) |
| `false` | Before connection |

## Primary Use

The `pool` getter is the main entry point for all PostgreSQL operations. It returns the `pg.Pool` instance which manages a pool of connections and provides automatic connection checkout/return.

```javascript
let tmpPool = _Fable.MeadowPostgreSQLProvider.pool;
```

## Simple Query

```javascript
let tmpPool = _Fable.MeadowPostgreSQLProvider.pool;

tmpPool.query('SELECT * FROM "Animal" WHERE "Deleted" = false',
	(pError, pResult) =>
	{
		if (pError) { return console.error(pError); }
		console.log(pResult.rows);
	});
```

## Parameterized Query

PostgreSQL uses `$1, $2, $3, ...` for parameter placeholders:

```javascript
let tmpPool = _Fable.MeadowPostgreSQLProvider.pool;

tmpPool.query(
	'SELECT * FROM "Animal" WHERE "Age" > $1 AND "Deleted" = $2',
	[3, false],
	(pError, pResult) =>
	{
		if (pError) { return console.error(pError); }
		console.log(pResult.rows);
	});
```

## Insert with Returning

PostgreSQL supports `RETURNING` to get the inserted row:

```javascript
let tmpPool = _Fable.MeadowPostgreSQLProvider.pool;

tmpPool.query(
	'INSERT INTO "Animal" ("Name", "Age") VALUES ($1, $2) RETURNING "IDAnimal"',
	['Luna', 5],
	(pError, pResult) =>
	{
		if (pError) { return console.error(pError); }
		console.log('Inserted ID:', pResult.rows[0].IDAnimal);
	});
```

## Update

```javascript
let tmpPool = _Fable.MeadowPostgreSQLProvider.pool;

tmpPool.query(
	'UPDATE "Animal" SET "Name" = $1, "Age" = $2 WHERE "IDAnimal" = $3',
	['Luna Belle', 6, 1],
	(pError, pResult) =>
	{
		if (pError) { return console.error(pError); }
		console.log('Rows updated:', pResult.rowCount);
	});
```

## Promise-Based Query

The `pg.Pool` supports both callbacks and Promises:

```javascript
let tmpPool = _Fable.MeadowPostgreSQLProvider.pool;

tmpPool.query('SELECT * FROM "Animal" WHERE "IDAnimal" = $1', [1])
	.then((pResult) =>
	{
		console.log(pResult.rows[0]);
	})
	.catch((pError) =>
	{
		console.error(pError);
	});
```

## Client Checkout

For transactions or multiple queries on the same connection, check out a client:

```javascript
let tmpPool = _Fable.MeadowPostgreSQLProvider.pool;

tmpPool.connect((pError, pClient, pDone) =>
{
	if (pError) { return console.error(pError); }

	pClient.query('BEGIN');
	pClient.query('INSERT INTO "Animal" ("Name") VALUES ($1)', ['Fido']);
	pClient.query('UPDATE "Farm" SET "AnimalCount" = "AnimalCount" + 1 WHERE "IDFarm" = $1', [42]);
	pClient.query('COMMIT', (pCommitError) =>
	{
		pDone(); // Return client to pool
		if (pCommitError) { console.error(pCommitError); }
	});
});
```

## Pool Methods

| Method | Returns | Purpose |
|--------|---------|---------|
| `pool.query(sql, params, callback)` | `void` | Execute a query (auto-checkout) |
| `pool.query(sql, params)` | `Promise` | Execute a query (Promise) |
| `pool.connect(callback)` | `void` | Check out a client from the pool |
| `pool.end()` | `Promise` | Close all connections in the pool |
| `pool.on(event, handler)` | `Pool` | Listen for pool events |

## Pool Events

| Event | Description |
|-------|-------------|
| `'connect'` | Fired when a new client is created |
| `'acquire'` | Fired when a client is checked out from the pool |
| `'remove'` | Fired when a client is closed and removed |
| `'error'` | Fired on idle client error |

## Before Connection

Returns `false` before `connect()` or `connectAsync()` is called:

```javascript
let tmpPool = _Fable.MeadowPostgreSQLProvider.pool;
// tmpPool => false (not connected yet)
```

Always check `connected` before using `pool`:

```javascript
if (!_Fable.MeadowPostgreSQLProvider.connected)
{
	console.error('Not connected to PostgreSQL.');
	return;
}

let tmpPool = _Fable.MeadowPostgreSQLProvider.pool;
```

## Related

- [connectAsync](connectAsync.md) -- Establish the connection
- [connect](connect.md) -- Synchronous connection
