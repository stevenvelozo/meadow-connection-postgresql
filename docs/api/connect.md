# connect()

Synchronous method that creates the `pg.Pool` connection pool instance.

## Signature

```javascript
connect()
```

## Parameters

None.

## Return Value

None.

## Behavior

1. Builds connection settings from `this.options.PostgreSQL` (host, port, user, password, database, max)
2. If already connected (`this._ConnectionPool` exists), logs an error with masked password and returns
3. Otherwise, logs the connection details and creates a new `pg.Pool`
4. Sets `this.connected = true`

## Usage

```javascript
_Fable.MeadowPostgreSQLProvider.connect();

if (_Fable.MeadowPostgreSQLProvider.connected)
{
	let tmpPool = _Fable.MeadowPostgreSQLProvider.pool;
	// Use the pool
}
```

## Why Both connect() and connectAsync()?

The `pg.Pool` constructor is synchronous -- it does not open actual TCP connections until a query is issued. The `connect()` method works reliably for immediate use. However, `connectAsync()` is preferred because:

- It follows the Fable service provider convention
- It provides error handling via the callback
- It guards against missing callbacks with a warning about race conditions
- It is consistent with other Meadow connector APIs

## Double-Connect Protection

If `connect()` is called when already connected, it logs an error with the settings (password masked) and returns without action:

```javascript
_Fable.MeadowPostgreSQLProvider.connect();
_Fable.MeadowPostgreSQLProvider.connect();
// Logs: "Meadow-Connection-PostgreSQL trying to connect but is already
//        connected - skipping the generation of extra connections."
// Settings logged with password: '*****************'
```

## Auto-Connect

The `connect()` method is called automatically during construction if `MeadowConnectionPostgreSQLAutoConnect` is `true`:

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

## Pool Settings

The `pg.Pool` is created with these settings from `options.PostgreSQL`:

| Setting | pg Option | Description |
|---------|-----------|-------------|
| `host` | `host` | Server hostname |
| `port` | `port` | Server port |
| `user` | `user` | Authentication user |
| `password` | `password` | Authentication password |
| `database` | `database` | Target database |
| `max` | `max` | Maximum pool connections |

## Related

- [connectAsync](connectAsync.md) -- Callback-style connection (recommended)
- [pool](pool.md) -- Access the pool after connecting
