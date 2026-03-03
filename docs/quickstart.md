# Quickstart

Get a PostgreSQL connection running in five steps.

## Step 1: Install

```bash
npm install meadow-connection-postgresql fable
```

Requires a running PostgreSQL server (local or remote). The module uses the `pg` (node-postgres) driver v8.

## Step 2: Configure and Connect

```javascript
const libFable = require('fable');
const libMeadowConnectionPostgreSQL = require('meadow-connection-postgresql');

let _Fable = new libFable(
	{
		"PostgreSQL":
		{
			"Server": "localhost",
			"Port": 5432,
			"User": "postgres",
			"Password": "secret",
			"Database": "myapp",
			"ConnectionPoolLimit": 20
		}
	});

_Fable.serviceManager.addAndInstantiateServiceType(
	'MeadowPostgreSQLProvider', libMeadowConnectionPostgreSQL);

_Fable.MeadowPostgreSQLProvider.connectAsync(
	(pError, pPool) =>
	{
		if (pError)
		{
			console.error('Connection failed:', pError);
			return;
		}
		console.log('Connected to PostgreSQL!');
	});
```

## Step 3: Create a Table

Define a Meadow table schema and apply it. The `CREATE TABLE IF NOT EXISTS` clause ensures idempotent execution, and the connector also handles the PostgreSQL `42P07` (duplicate_table) error gracefully.

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

This generates and executes:

```sql
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

## Step 4: Use the Pool

Access the `pg.Pool` instance via the `pool` getter and run queries:

```javascript
let tmpPool = _Fable.MeadowPostgreSQLProvider.pool;

// Simple query
tmpPool.query('SELECT * FROM "Animal" WHERE "Deleted" = false',
	(pError, pResult) =>
	{
		if (pError) { return console.error(pError); }
		console.log('Animals:', pResult.rows);
	});

// Parameterized query
tmpPool.query('SELECT * FROM "Animal" WHERE "Age" > $1', [3],
	(pError, pResult) =>
	{
		if (pError) { return console.error(pError); }
		console.log('Animals older than 3:', pResult.rows);
	});
```

## Step 5: Use with Meadow

For full ORM capabilities, pair this connection with the Meadow data access layer:

```javascript
const libMeadow = require('meadow');

let tmpAnimalMeadow = libMeadow.new(_Fable, 'Animal')
	.setProvider('PostgreSQL')
	.setDefaultIdentifier('IDAnimal')
	.setSchema(
	[
		{ Column: 'IDAnimal', Type: 'AutoIdentity' },
		{ Column: 'GUIDAnimal', Type: 'AutoGUID' },
		{ Column: 'Name', Type: 'String', Size: 128 },
		{ Column: 'Age', Type: 'Number' },
		{ Column: 'Weight', Type: 'Number' },
		{ Column: 'Description', Type: 'String' },
		{ Column: 'CreateDate', Type: 'CreateDate' },
		{ Column: 'Deleted', Type: 'Deleted' }
	]);

// Meadow handles CRUD through FoxHound's query dialect
let tmpQuery = tmpAnimalMeadow.query.addRecord(
	{
		Name: 'Luna',
		Age: 5,
		Weight: 4.5
	});

tmpAnimalMeadow.doCreate(tmpQuery,
	(pQuery) =>
	{
		console.log('Created with ID:', pQuery.parameters.result.value);
	});
```

## Auto-Connect Mode

Skip the explicit `connectAsync()` call by enabling auto-connect:

```javascript
let _Fable = new libFable(
	{
		"PostgreSQL":
		{
			"Server": "localhost",
			"Port": 5432,
			"User": "postgres",
			"Password": "secret",
			"Database": "myapp"
		},
		"MeadowConnectionPostgreSQLAutoConnect": true
	});

_Fable.serviceManager.addAndInstantiateServiceType(
	'MeadowPostgreSQLProvider', libMeadowConnectionPostgreSQL);

// Already connected -- pool is ready
let tmpPool = _Fable.MeadowPostgreSQLProvider.pool;
```
