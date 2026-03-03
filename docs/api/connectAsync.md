# connectAsync(fCallback)

Callback-style connection method. Creates the `pg.Pool` instance, or returns the existing pool if already connected.

## Signature

```javascript
connectAsync(fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `fCallback` | `function` | Callback receiving `(error, pool)` |

## Return Value

Returns the result of the callback invocation.

## Behavior

1. If no callback is provided, logs an error and substitutes a no-op function
2. If already connected (`this._ConnectionPool` exists), calls `fCallback(null, this._ConnectionPool)` immediately
3. Otherwise, calls `this.connect()` to create the pool
4. On success: calls `fCallback(null, this._ConnectionPool)`
5. On error: logs the error, calls `fCallback(pError)`

## Basic Usage

```javascript
_Fable.MeadowPostgreSQLProvider.connectAsync(
	(pError, pPool) =>
	{
		if (pError)
		{
			console.error('Connection failed:', pError);
			return;
		}
		console.log('Connected! Pool ready.');
	});
```

## Idempotent Calls

Calling `connectAsync()` multiple times is safe. If already connected, the existing pool is returned without creating a new one:

```javascript
// First call -- creates the pool
_Fable.MeadowPostgreSQLProvider.connectAsync(
	(pError, pPool) =>
	{
		// pPool is the pg.Pool instance

		// Second call -- reuses the existing pool
		_Fable.MeadowPostgreSQLProvider.connectAsync(
			(pError2, pPool2) =>
			{
				// pPool2 === pPool (same pool)
			});
	});
```

## Missing Callback

If called without a callback, a warning is logged and a no-op function is used:

```javascript
// Logs: "Meadow PostgreSQL connectAsync() called without a callback;
//        this could lead to connection race conditions."
_Fable.MeadowPostgreSQLProvider.connectAsync();
```

## Error Handling

If `connect()` throws, the error is caught and passed to the callback:

```javascript
_Fable.MeadowPostgreSQLProvider.connectAsync(
	(pError) =>
	{
		if (pError)
		{
			console.error('PostgreSQL connection error:', pError.message);
		}
	});
```

## Related

- [connect()](connect.md) -- Synchronous connection method
- [pool](pool.md) -- Access the pool after connecting
