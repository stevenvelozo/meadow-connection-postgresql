/**
* Meadow PostgreSQL Provider Fable Service
* @author Steven Velozo <steven@velozo.com>
*/
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libPG = require('pg');

const libMeadowSchemaPostgreSQL = require('./Meadow-Schema-PostgreSQL.js');

class MeadowConnectionPostgreSQL extends libFableServiceProviderBase
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

		this.serviceType = 'MeadowConnectionPostgreSQL';

		// See if the user passed in a PostgreSQL object already
		if (typeof(this.options.PostgreSQL) == 'object')
		{
			// Test if this needs property coercion from the old format to the raw
			if (!this.options.PostgreSQL.hasOwnProperty('max') && this.options.PostgreSQL.hasOwnProperty('ConnectionPoolLimit'))
			{
				this.options.PostgreSQL.max = this.options.PostgreSQL.ConnectionPoolLimit;
			}
			if (!this.options.PostgreSQL.hasOwnProperty('host') && this.options.PostgreSQL.hasOwnProperty('Server'))
			{
				this.options.PostgreSQL.host = this.options.PostgreSQL.Server;
			}
			if (!this.options.PostgreSQL.hasOwnProperty('port') && this.options.PostgreSQL.hasOwnProperty('Port'))
			{
				this.options.PostgreSQL.port = this.options.PostgreSQL.Port;
			}
			if (!this.options.PostgreSQL.hasOwnProperty('user') && this.options.PostgreSQL.hasOwnProperty('User'))
			{
				this.options.PostgreSQL.user = this.options.PostgreSQL.User;
			}
			if (!this.options.PostgreSQL.hasOwnProperty('password') && this.options.PostgreSQL.hasOwnProperty('Password'))
			{
				this.options.PostgreSQL.password = this.options.PostgreSQL.Password;
			}
			if (!this.options.PostgreSQL.hasOwnProperty('database') && this.options.PostgreSQL.hasOwnProperty('Database'))
			{
				this.options.PostgreSQL.database = this.options.PostgreSQL.Database;
			}
		}
		else if (typeof(this.fable.settings.PostgreSQL) == 'object')
		{
			this.options.PostgreSQL = (
				{
					max: this.fable.settings.PostgreSQL.ConnectionPoolLimit,
					host: this.fable.settings.PostgreSQL.Server,
					port: this.fable.settings.PostgreSQL.Port,
					user: this.fable.settings.PostgreSQL.User,
					password: this.fable.settings.PostgreSQL.Password,
					database: this.fable.settings.PostgreSQL.Database
				});
		}

		if (!this.options.MeadowConnectionPostgreSQLAutoConnect)
		{
			// See if there is a global autoconnect
			this.options.MeadowConnectionPostgreSQLAutoConnect = this.fable.settings.MeadowConnectionPostgreSQLAutoConnect;
		}

		this.serviceType = 'MeadowConnectionPostgreSQL';
		this._ConnectionPool = false;
		this.connected = false;

		// Schema provider handles DDL operations (create, drop, index, etc.)
		this._SchemaProvider = new libMeadowSchemaPostgreSQL(this.fable, this.options, `${this.Hash}-Schema`);

		if (this.options.MeadowConnectionPostgreSQLAutoConnect)
		{
			this.connect();
		}
	}

	get schemaProvider()
	{
		return this._SchemaProvider;
	}

	generateDropTableStatement(pTableName)
	{
		return this._SchemaProvider.generateDropTableStatement(pTableName);
	}

	generateCreateTableStatement(pMeadowTableSchema)
	{
		return this._SchemaProvider.generateCreateTableStatement(pMeadowTableSchema);
	}

	createTables(pMeadowSchema, fCallback)
	{
		return this._SchemaProvider.createTables(pMeadowSchema, fCallback);
	}

	createTable(pMeadowTableSchema, fCallback)
	{
		return this._SchemaProvider.createTable(pMeadowTableSchema, fCallback);
	}

	getIndexDefinitionsFromSchema(pMeadowTableSchema)
	{
		return this._SchemaProvider.getIndexDefinitionsFromSchema(pMeadowTableSchema);
	}

	generateCreateIndexScript(pMeadowTableSchema)
	{
		return this._SchemaProvider.generateCreateIndexScript(pMeadowTableSchema);
	}

	generateCreateIndexStatements(pMeadowTableSchema)
	{
		return this._SchemaProvider.generateCreateIndexStatements(pMeadowTableSchema);
	}

	createIndex(pIndexStatement, fCallback)
	{
		return this._SchemaProvider.createIndex(pIndexStatement, fCallback);
	}

	createIndices(pMeadowTableSchema, fCallback)
	{
		return this._SchemaProvider.createIndices(pMeadowTableSchema, fCallback);
	}

	createAllIndices(pMeadowSchema, fCallback)
	{
		return this._SchemaProvider.createAllIndices(pMeadowSchema, fCallback);
	}

	// Database Introspection delegation

	listTables(fCallback)
	{
		return this._SchemaProvider.listTables(fCallback);
	}

	introspectTableColumns(pTableName, fCallback)
	{
		return this._SchemaProvider.introspectTableColumns(pTableName, fCallback);
	}

	introspectTableIndices(pTableName, fCallback)
	{
		return this._SchemaProvider.introspectTableIndices(pTableName, fCallback);
	}

	introspectTableForeignKeys(pTableName, fCallback)
	{
		return this._SchemaProvider.introspectTableForeignKeys(pTableName, fCallback);
	}

	introspectTableSchema(pTableName, fCallback)
	{
		return this._SchemaProvider.introspectTableSchema(pTableName, fCallback);
	}

	introspectDatabaseSchema(fCallback)
	{
		return this._SchemaProvider.introspectDatabaseSchema(fCallback);
	}

	generateMeadowPackageFromTable(pTableName, fCallback)
	{
		return this._SchemaProvider.generateMeadowPackageFromTable(pTableName, fCallback);
	}

	connect()
	{
		let tmpConnectionSettings = (
			{
				max: this.options.PostgreSQL.max,
				host: this.options.PostgreSQL.host,
				port: this.options.PostgreSQL.port,
				user: this.options.PostgreSQL.user,
				password: this.options.PostgreSQL.password,
				database: this.options.PostgreSQL.database
			});
		if (this._ConnectionPool)
		{
			let tmpCleansedLogSettings = JSON.parse(JSON.stringify(tmpConnectionSettings));
			// No leaking passwords!
			tmpCleansedLogSettings.password = '*****************';
			this.log.error(`Meadow-Connection-PostgreSQL trying to connect but is already connected - skipping the generation of extra connections.`, tmpCleansedLogSettings);
		}
		else
		{
			this.fable.log.info(`Meadow-Connection-PostgreSQL connecting to [${this.options.PostgreSQL.host} : ${this.options.PostgreSQL.port}] as ${this.options.PostgreSQL.user} for database ${this.options.PostgreSQL.database} at a pool limit of ${this.options.PostgreSQL.max}`);
			this._ConnectionPool = new libPG.Pool(tmpConnectionSettings);
			this._SchemaProvider.setConnectionPool(this._ConnectionPool);
			this.connected = true;
		}
	}

	connectAsync(fCallback)
	{
		let tmpCallback = fCallback;
		if (typeof (tmpCallback) !== 'function')
		{
			this.log.error(`Meadow PostgreSQL connectAsync() called without a callback; this could lead to connection race conditions.`);
			tmpCallback = () => { };
		}

		try
		{
			// Create the pool if it doesn't exist
			if (this._ConnectionPool)
			{
				return tmpCallback(null, this._ConnectionPool);
			}
			else
			{
				this.connect();
				return tmpCallback(null, this._ConnectionPool);
			}
		}
		catch(pError)
		{
			this.log.error(`Meadow PostgreSQL connectAsync() trapped an error trying to connect to server: ${pError}`, pError);
			return tmpCallback(pError);
		}
	}

	get pool()
	{
		return this._ConnectionPool;
	}
}

module.exports = MeadowConnectionPostgreSQL;
