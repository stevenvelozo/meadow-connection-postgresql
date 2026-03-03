# Architecture

## System Overview

The PostgreSQL connector bridges Meadow's data access abstraction with the `pg` (node-postgres) driver. It follows the Fable service provider pattern, providing connection pool management and SQL DDL generation.

```mermaid
graph TB
	subgraph Application Layer
		APP[Application Code]
		MEA[Meadow ORM]
		FH[FoxHound Query Dialect]
	end
	subgraph Connection Layer
		MCP["meadow-connection-postgresql<br/>(MeadowConnectionPostgreSQL)"]
		POOL[pg.Pool]
	end
	subgraph PostgreSQL Server
		PG[(PostgreSQL)]
	end
	APP --> MEA
	MEA --> FH
	FH --> MCP
	MCP --> POOL
	POOL --> PG
```

## Connection Lifecycle

```mermaid
sequenceDiagram
	participant App as Application
	participant Fable as Fable
	participant MCP as MeadowConnectionPostgreSQL
	participant PG as pg.Pool
	participant Server as PostgreSQL Server

	App->>Fable: new libFable(settings)
	App->>Fable: addAndInstantiateServiceType()
	Fable->>MCP: constructor(fable, options)
	MCP->>MCP: Read PostgreSQL config
	MCP->>MCP: Normalize property names
	Note over MCP: Server→host, Port→port, etc.

	alt Auto-Connect Enabled
		MCP->>MCP: connect()
	end

	App->>MCP: connectAsync(callback)

	alt Already Connected
		MCP-->>App: callback(null, pool)
	else Not Connected
		MCP->>PG: new pg.Pool(settings)
		PG->>Server: Establish Connection Pool
		MCP->>MCP: connected = true
		MCP-->>App: callback(null, pool)
	end

	App->>MCP: pool (getter)
	MCP-->>App: pg.Pool instance
	App->>PG: pool.query(sql, params, callback)
	PG->>Server: Execute query
	Server-->>PG: Result rows
	PG-->>App: callback(error, result)
```

## Service Provider Model

`MeadowConnectionPostgreSQL` extends `fable-serviceproviderbase`, providing standard lifecycle integration with the Fable ecosystem.

```mermaid
classDiagram
	class FableServiceProviderBase {
		+fable
		+options
		+log
		+serviceType
	}
	class MeadowConnectionPostgreSQL {
		+serviceType: "MeadowConnectionPostgreSQL"
		+connected: boolean
		-_ConnectionPool: pg.Pool
		+connect()
		+connectAsync(fCallback)
		+pool: pg.Pool
		+createTable(schema, fCallback)
		+createTables(schema, fCallback)
		+generateCreateTableStatement(schema)
		+generateDropTableStatement(name)
	}
	FableServiceProviderBase <|-- MeadowConnectionPostgreSQL
```

## Settings Flow

The connector normalizes Meadow-style property names to the native `pg` driver format:

```mermaid
flowchart LR
	subgraph Input Sources
		OPT[Constructor Options]
		SET[fable.settings.PostgreSQL]
	end
	subgraph Normalization
		NORM["Property Mapping<br/>Server → host<br/>Port → port<br/>User → user<br/>Password → password<br/>Database → database<br/>ConnectionPoolLimit → max"]
	end
	subgraph Output
		PGPOOL["pg.Pool Config<br/>{ host, port, user,<br/>  password, database, max }"]
	end
	OPT --> NORM
	SET --> NORM
	NORM --> PGPOOL
```

## DDL Generation Pipeline

```mermaid
flowchart TD
	A[Meadow Table Schema] --> B[generateCreateTableStatement]
	B --> C["SQL DDL String<br/>CREATE TABLE IF NOT EXISTS..."]
	C --> D{createTable called?}
	D -->|Yes| E[pool.query executes DDL]
	E --> F{Result?}
	F -->|Success| G[Callback - no error]
	F -->|Error 42P07| H[Log warning - table exists]
	H --> G
	F -->|Other Error| I[Callback with error]
	D -->|No| J[Return DDL string for inspection]
```

## Connection Safety

The connector includes several safety mechanisms:

```mermaid
flowchart TD
	A[connect called] --> B{Already connected?}
	B -->|Yes| C[Log error with masked password]
	C --> D[Return without action]
	B -->|No| E[Log connection info]
	E --> F[Create pg.Pool]
	F --> G[Set connected = true]
```

Key safety features:

| Feature | Implementation |
|---------|---------------|
| Double-connect guard | Logs error and returns if `_ConnectionPool` already exists |
| Password masking | Cleansed settings logged on double-connect attempt |
| Missing callback guard | `connectAsync()` provides a no-op callback if none given |
| Idempotent tables | `CREATE TABLE IF NOT EXISTS` + error code 42P07 handling |
| Quoted identifiers | Double-quoted table and column names in DDL |

## Connector Comparison

| Feature | PostgreSQL | MySQL | MSSQL | SQLite |
|---------|-----------|-------|-------|--------|
| Driver | `pg` | `mysql2` | `mssql` | `better-sqlite3` |
| Connection | `pg.Pool` | MySQL Pool | MSSQL Pool | File path |
| Schema | SQL DDL | SQL DDL | SQL DDL | SQL DDL |
| `pool` returns | `pg.Pool` | MySQL Pool | MSSQL Pool | SQLite Database |
| Auto-increment | `SERIAL` | `AUTO_INCREMENT` | `IDENTITY` | `INTEGER PRIMARY KEY` |
| Parameterized | `$1, $2, $3` | `?, ?, ?` | `@p1, @p2, @p3` | `?, ?, ?` |
| Boolean type | `BOOLEAN` | `TINYINT(1)` | `BIT` | `INTEGER` |
| Idempotent DDL | `IF NOT EXISTS` + 42P07 | `IF NOT EXISTS` | `IF NOT EXISTS` | `IF NOT EXISTS` |
| Identifiers | Double-quoted `"col"` | Backtick-quoted `` `col` `` | Bracket-quoted `[col]` | Double-quoted `"col"` |
