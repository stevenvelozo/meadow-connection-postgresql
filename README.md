# meadow-connection-postgresql

PostgreSQL connection service for the Meadow data access layer.

[![Coverage Status](https://coveralls.io/repos/github/stevenvelozo/meadow-connection-postgresql/badge.svg?branch=main)](https://coveralls.io/github/stevenvelozo/meadow-connection-postgresql?branch=main)
[![Build Status](https://github.com/stevenvelozo/meadow-connection-postgresql/workflows/Tests/badge.svg)](https://github.com/stevenvelozo/meadow-connection-postgresql/actions)
[![npm version](https://badge.fury.io/js/meadow-connection-postgresql.svg)](https://www.npmjs.com/package/meadow-connection-postgresql)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Fable Service Provider** -- integrates with the Fable dependency injection ecosystem
- **Connection Pooling** -- managed pool via the `pg` driver's `Pool` class
- **SQL DDL Generation** -- produces PostgreSQL-native `CREATE TABLE` and `DROP TABLE` statements
- **Meadow-Compatible Settings** -- accepts both Meadow-style (`Server`, `Port`) and native `pg` property names
- **Quoted Identifiers** -- double-quoted table and column names for safe handling of reserved words
- **Auto-Connect Mode** -- optionally connect during service construction
- **Idempotent Schema** -- `CREATE TABLE IF NOT EXISTS` and graceful handling of duplicate table errors

## Installation

```shell
npm install meadow-connection-postgresql
```

## Quick Start

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
			"Database": "myapp"
		}
	});

_Fable.serviceManager.addAndInstantiateServiceType(
	'MeadowPostgreSQLProvider', libMeadowConnectionPostgreSQL);

_Fable.MeadowPostgreSQLProvider.connectAsync(
	(pError, pPool) =>
	{
		if (pError) { return console.error(pError); }

		let tmpPool = _Fable.MeadowPostgreSQLProvider.pool;
		tmpPool.query('SELECT NOW()', (pErr, pRes) =>
		{
			console.log('Server time:', pRes.rows[0].now);
		});
	});
```

## Configuration

Settings are read from `fable.settings.PostgreSQL`:

| Setting | Alias | Default | Description |
|---------|-------|---------|-------------|
| `Server` | `host` | -- | PostgreSQL host |
| `Port` | `port` | -- | PostgreSQL port |
| `User` | `user` | -- | Authentication username |
| `Password` | `password` | -- | Authentication password |
| `Database` | `database` | -- | Target database name |
| `ConnectionPoolLimit` | `max` | -- | Maximum connections in the pool |

## API

| Method | Description |
|--------|-------------|
| `connect()` | Synchronous -- create `pg.Pool` instance |
| `connectAsync(fCallback)` | Callback-style connection (recommended) |
| `pool` | Getter -- returns the `pg.Pool` instance |
| `generateCreateTableStatement(schema)` | Generate a `CREATE TABLE` DDL string |
| `createTable(schema, fCallback)` | Execute `CREATE TABLE` via the pool |
| `createTables(schema, fCallback)` | Create multiple tables sequentially |
| `generateDropTableStatement(name)` | Generate a `DROP TABLE IF EXISTS` DDL string |

## Column Type Mapping

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

## Part of the Retold Framework

This module is a Meadow connector that plugs into the Retold application framework. It provides the PostgreSQL persistence layer for the Meadow data access abstraction.

## Testing

```shell
npm test
```

Coverage:

```shell
npm run coverage
```

## Related Packages

- [meadow](https://github.com/stevenvelozo/meadow) -- Data access layer and ORM
- [fable](https://github.com/stevenvelozo/fable) -- Application framework and service manager
- [foxhound](https://github.com/stevenvelozo/foxhound) -- Query generation DSL
- [stricture](https://github.com/stevenvelozo/stricture) -- Schema definition and DDL tools
- [meadow-endpoints](https://github.com/stevenvelozo/meadow-endpoints) -- RESTful endpoint generation
- [meadow-connection-mysql](https://github.com/stevenvelozo/meadow-connection-mysql) -- MySQL / MariaDB connector
- [meadow-connection-mssql](https://github.com/stevenvelozo/meadow-connection-mssql) -- Microsoft SQL Server connector
- [meadow-connection-sqlite](https://github.com/stevenvelozo/meadow-connection-sqlite) -- SQLite connector
- [meadow-connection-mongodb](https://github.com/stevenvelozo/meadow-connection-mongodb) -- MongoDB connector

## License

MIT

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
