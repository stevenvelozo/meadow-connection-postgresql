# meadow-connection-postgresql

PostgreSQL connection service for the Meadow data access layer. This module provides connection pool management, SQL DDL generation, and table creation for applications using PostgreSQL as their persistence store.

## Quick Start

```javascript
const libFable = require('fable');
const libMeadowConnectionPostgreSQL = require('meadow-connection-postgresql');

// 1. Create a Fable instance with PostgreSQL settings
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

// 2. Register and instantiate the service
_Fable.serviceManager.addAndInstantiateServiceType(
	'MeadowPostgreSQLProvider', libMeadowConnectionPostgreSQL);

// 3. Connect
_Fable.MeadowPostgreSQLProvider.connectAsync(
	(pError, pPool) =>
	{
		if (pError) { return console.error(pError); }

		// 4. Use the pool
		let tmpPool = _Fable.MeadowPostgreSQLProvider.pool;
		tmpPool.query('SELECT NOW()', (pErr, pRes) =>
		{
			console.log('Server time:', pRes.rows[0].now);
		});
	});
```

## Configuration

Settings are read from `fable.settings.PostgreSQL`. Both Meadow-style names and native `pg` driver names are supported:

| Setting | Alias | Description |
|---------|-------|-------------|
| `Server` | `host` | PostgreSQL hostname or IP |
| `Port` | `port` | PostgreSQL port |
| `User` | `user` | Authentication username |
| `Password` | `password` | Authentication password |
| `Database` | `database` | Target database name |
| `ConnectionPoolLimit` | `max` | Maximum connections in the pool |

## How It Fits

```
Application
    |
    v
 Meadow (ORM)
    |
    v
 FoxHound (Query Dialect)
    |
    v
 meadow-connection-postgresql  <-- this module
    |
    v
 pg (node-postgres)
    |
    v
 PostgreSQL Server
```

## Learn More

- [Quickstart Guide](quickstart.md) -- step-by-step setup
- [Architecture](architecture.md) -- connection lifecycle and design diagrams
- [Schema & Column Types](schema.md) -- DDL generation and type mapping
- [API Reference](api/reference.md) -- complete method documentation

## Companion Modules

| Module | Purpose |
|--------|---------|
| [meadow](https://github.com/stevenvelozo/meadow) | Data access layer and ORM |
| [foxhound](https://github.com/stevenvelozo/foxhound) | Query generation DSL |
| [stricture](https://github.com/stevenvelozo/stricture) | Schema definition and DDL tools |
| [meadow-connection-mysql](https://github.com/stevenvelozo/meadow-connection-mysql) | MySQL / MariaDB connector |
| [meadow-connection-mssql](https://github.com/stevenvelozo/meadow-connection-mssql) | Microsoft SQL Server connector |
| [meadow-connection-sqlite](https://github.com/stevenvelozo/meadow-connection-sqlite) | SQLite connector |
| [meadow-connection-mongodb](https://github.com/stevenvelozo/meadow-connection-mongodb) | MongoDB connector |
| [meadow-connection-rocksdb](https://github.com/stevenvelozo/meadow-connection-rocksdb) | RocksDB key-value connector |
