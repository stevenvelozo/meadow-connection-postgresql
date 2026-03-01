/**
* Meadow PostgreSQL Provider Fable Service
* @author Steven Velozo <steven@velozo.com>
*/
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libPG = require('pg');

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

		if (this.options.MeadowConnectionPostgreSQLAutoConnect)
		{
			this.connect();
		}
	}

	generateDropTableStatement(pTableName)
	{
		return `DROP TABLE IF EXISTS "${pTableName}";`;
	}

	generateCreateTableStatement(pMeadowTableSchema)
	{
		this.log.info(`--> Building the table create string for ${pMeadowTableSchema} ...`);

		let tmpPrimaryKey = false;
		let tmpCreateTableStatement = `--   [ ${pMeadowTableSchema.TableName} ]`;

		tmpCreateTableStatement += `\nCREATE TABLE IF NOT EXISTS\n    "${pMeadowTableSchema.TableName}"\n    (`;
		for (let j = 0; j < pMeadowTableSchema.Columns.length; j++)
		{
			let tmpColumn = pMeadowTableSchema.Columns[j];

			// If we aren't the first column, append a comma.
			if (j > 0)
			{
				tmpCreateTableStatement += `,`;
			}

			tmpCreateTableStatement += `\n`;
			// Dump out each column......
			switch (tmpColumn.DataType)
			{
				case 'ID':
					tmpCreateTableStatement += `        "${tmpColumn.Column}" SERIAL PRIMARY KEY`;
					tmpPrimaryKey = tmpColumn.Column;
					break;
				case 'GUID':
					let tmpSize = tmpColumn.hasOwnProperty('Size') ? tmpColumn.Size : 36;
					if (isNaN(tmpSize))
					{
						// Use the old default if Size is improper
						tmpSize = 36;
					}
					tmpCreateTableStatement += `        "${tmpColumn.Column}" VARCHAR(${tmpSize}) DEFAULT '0xDe'`;
					break;
				case 'ForeignKey':
					tmpCreateTableStatement += `        "${tmpColumn.Column}" INTEGER NOT NULL DEFAULT 0`;
					break;
				case 'Numeric':
					tmpCreateTableStatement += `        "${tmpColumn.Column}" INTEGER NOT NULL DEFAULT 0`;
					break;
				case 'Decimal':
					tmpCreateTableStatement += `        "${tmpColumn.Column}" DECIMAL(${tmpColumn.Size})`;
					break;
				case 'String':
					tmpCreateTableStatement += `        "${tmpColumn.Column}" VARCHAR(${tmpColumn.Size}) NOT NULL DEFAULT ''`;
					break;
				case 'Text':
					tmpCreateTableStatement += `        "${tmpColumn.Column}" TEXT`;
					break;
				case 'DateTime':
					tmpCreateTableStatement += `        "${tmpColumn.Column}" TIMESTAMP`;
					break;
				case 'Boolean':
					tmpCreateTableStatement += `        "${tmpColumn.Column}" BOOLEAN NOT NULL DEFAULT false`;
					break;
				default:
					break;
			}
		}
		// PostgreSQL SERIAL PRIMARY KEY is declared inline; no separate PRIMARY KEY clause needed
		tmpCreateTableStatement += `\n    );`;

		return tmpCreateTableStatement;
	}

	createTables(pMeadowSchema, fCallback)
	{
		this.fable.Utility.eachLimit(pMeadowSchema.Tables, 1,
			(pTable, fCreateComplete) =>
			{
				return this.createTable(pTable, fCreateComplete);
			},
			(pCreateError) =>
			{
				if (pCreateError)
				{
					this.log.error(`Meadow-PostgreSQL Error creating tables from Schema: ${pCreateError}`, pCreateError);
				}
				this.log.info('Done creating tables!');
				return fCallback(pCreateError);
			});
	}

	createTable(pMeadowTableSchema, fCallback)
	{
		let tmpCreateTableStatement = this.generateCreateTableStatement(pMeadowTableSchema);
		this._ConnectionPool.query(tmpCreateTableStatement,
			(pError, pResult) =>
			{
				if (pError)
				{
					// Check for "already exists" type errors
					if (pError.code === '42P07')
					{
						// 42P07 = duplicate_table
						this.log.warn(`Meadow-PostgreSQL CREATE TABLE ${pMeadowTableSchema.TableName} executed but table already existed.`);
						return fCallback();
					}
					else
					{
						this.log.error(`Meadow-PostgreSQL CREATE TABLE ${pMeadowTableSchema.TableName} failed!`, pError);
						return fCallback(pError);
					}
				}
				else
				{
					this.log.info(`Meadow-PostgreSQL CREATE TABLE ${pMeadowTableSchema.TableName} executed successfully.`);
					return fCallback();
				}
			});
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
