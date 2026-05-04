/**
* Meadow PostgreSQL Schema Provider
*
* Handles table creation, dropping, and DDL generation for PostgreSQL.
* Separated from the connection provider to allow independent extension
* for indexing, foreign keys, and other schema operations.
*
* @author Steven Velozo <steven@velozo.com>
*/
const libFableServiceProviderBase = require('fable-serviceproviderbase');

class MeadowSchemaPostgreSQL extends libFableServiceProviderBase
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.serviceType = 'MeadowSchemaPostgreSQL';

		// Reference to the connection pool, set by the connection provider
		this._ConnectionPool = false;
	}

	/**
	 * Set the connection pool reference for executing DDL statements.
	 * @param {object} pConnectionPool - PostgreSQL connection pool
	 * @returns {MeadowSchemaPostgreSQL} this (for chaining)
	 */
	setConnectionPool(pConnectionPool)
	{
		this._ConnectionPool = pConnectionPool;
		return this;
	}

	generateDropTableStatement(pTableName)
	{
		return `DROP TABLE IF EXISTS "${pTableName}";`;
	}

	generateCreateTableStatement(pMeadowTableSchema)
	{
		this.log.info(`--> Building the table create string for ${pMeadowTableSchema && pMeadowTableSchema.TableName ? pMeadowTableSchema.TableName : '(unknown)'} ...`);

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
					// Default GUID column width is 255 — UUIDs need 36 but
					// composite GUIDs from integration adapters (meadow-
					// integration's prefix + entity + external GUID) often
					// exceed 36. Wider default avoids silent truncation
					// when the descriptor doesn't pin a Size.
					let tmpSize = tmpColumn.hasOwnProperty('Size') ? tmpColumn.Size : 255;
					if (isNaN(tmpSize))
					{
						tmpSize = 255;
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
				case 'JSON':
					tmpCreateTableStatement += `        "${tmpColumn.Column}" TEXT`;
					break;
				case 'JSONProxy':
					tmpCreateTableStatement += `        "${tmpColumn.StorageColumn}" TEXT`;
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

	// ========================================================================
	// Index Generation
	// ========================================================================

	/**
	 * Derive index definitions from a Meadow table schema.
	 *
	 * Automatically generates indices for:
	 *   - GUID columns      -> unique index  AK_M_{Column}
	 *   - ForeignKey columns -> regular index IX_M_{Column}
	 *
	 * Column-level Indexed property:
	 *   - Indexed: true     -> regular index IX_M_T_{Table}_C_{Column}
	 *   - Indexed: 'unique' -> unique index  AK_M_T_{Table}_C_{Column}
	 *   - IndexName overrides the auto-generated name (for round-trip fidelity)
	 *
	 * Also includes any explicit entries from pMeadowTableSchema.Indices[]
	 * (for multi-column composite indices).
	 *
	 * Each index definition is:
	 *   { Name, TableName, Columns[], Unique, Strategy }
	 *
	 * @param {object} pMeadowTableSchema - Meadow table schema object
	 * @returns {Array} Array of index definition objects
	 */
	getIndexDefinitionsFromSchema(pMeadowTableSchema)
	{
		let tmpIndices = [];
		let tmpTableName = pMeadowTableSchema.TableName;

		// Auto-detect from column types
		for (let j = 0; j < pMeadowTableSchema.Columns.length; j++)
		{
			let tmpColumn = pMeadowTableSchema.Columns[j];

			switch (tmpColumn.DataType)
			{
				case 'GUID':
					tmpIndices.push(
						{
							Name: `AK_M_${tmpColumn.Column}`,
							TableName: tmpTableName,
							Columns: [tmpColumn.Column],
							Unique: true,
							Strategy: ''
						});
					break;
				case 'ForeignKey':
					tmpIndices.push(
						{
							Name: `IX_M_${tmpColumn.Column}`,
							TableName: tmpTableName,
							Columns: [tmpColumn.Column],
							Unique: false,
							Strategy: ''
						});
					break;
				default:
					// Column-level Indexed property: generates a single-column index
					// with a consistent naming convention.
					//   Indexed: true     -> IX_M_T_{Table}_C_{Column}  (regular)
					//   Indexed: 'unique' -> AK_M_T_{Table}_C_{Column}  (unique)
					// Optional IndexName property overrides the auto-generated name.
					if (tmpColumn.Indexed)
					{
						let tmpIsUnique = (tmpColumn.Indexed === 'unique');
						let tmpPrefix = tmpIsUnique ? 'AK_M_T' : 'IX_M_T';
						let tmpAutoName = `${tmpPrefix}_${tmpTableName}_C_${tmpColumn.Column}`;
						tmpIndices.push(
							{
								Name: tmpColumn.IndexName || tmpAutoName,
								TableName: tmpTableName,
								Columns: [tmpColumn.Column],
								Unique: tmpIsUnique,
								Strategy: ''
							});
					}
					break;
			}
		}

		// Include any explicitly defined indices on the schema
		if (Array.isArray(pMeadowTableSchema.Indices))
		{
			for (let k = 0; k < pMeadowTableSchema.Indices.length; k++)
			{
				let tmpExplicitIndex = pMeadowTableSchema.Indices[k];
				tmpIndices.push(
					{
						Name: tmpExplicitIndex.Name || `IX_${tmpTableName}_${k}`,
						TableName: tmpTableName,
						Columns: Array.isArray(tmpExplicitIndex.Columns) ? tmpExplicitIndex.Columns : [tmpExplicitIndex.Columns],
						Unique: tmpExplicitIndex.Unique || false,
						Strategy: tmpExplicitIndex.Strategy || ''
					});
			}
		}

		return tmpIndices;
	}

	/**
	 * Build the column list for an index, double-quoted and comma-separated.
	 * @param {Array} pColumns - Array of column name strings
	 * @returns {string}
	 */
	_buildColumnList(pColumns)
	{
		return pColumns.map((pCol) => { return '"' + pCol + '"'; }).join(', ');
	}

	/**
	 * Generate a full idempotent SQL script for creating all indices on a table.
	 *
	 * PostgreSQL supports CREATE INDEX IF NOT EXISTS natively, so the
	 * idempotent script is straightforward.
	 *
	 * @param {object} pMeadowTableSchema - Meadow table schema object
	 * @returns {string} Complete SQL script
	 */
	generateCreateIndexScript(pMeadowTableSchema)
	{
		let tmpIndices = this.getIndexDefinitionsFromSchema(pMeadowTableSchema);
		let tmpTableName = pMeadowTableSchema.TableName;

		if (tmpIndices.length === 0)
		{
			return `-- No indices to create for ${tmpTableName}\n`;
		}

		let tmpScript = `-- Index Definitions for ${tmpTableName} -- Generated ${new Date().toJSON()}\n\n`;

		for (let i = 0; i < tmpIndices.length; i++)
		{
			let tmpIndex = tmpIndices[i];
			let tmpColumnList = this._buildColumnList(tmpIndex.Columns);
			let tmpCreateKeyword = tmpIndex.Unique ? 'CREATE UNIQUE INDEX' : 'CREATE INDEX';
			let tmpStrategyClause = tmpIndex.Strategy ? ` USING ${tmpIndex.Strategy}` : '';

			tmpScript += `-- Index: ${tmpIndex.Name}\n`;
			tmpScript += `${tmpCreateKeyword} IF NOT EXISTS "${tmpIndex.Name}" ON "${tmpIndex.TableName}" (${tmpColumnList})${tmpStrategyClause};\n\n`;
		}

		return tmpScript;
	}

	/**
	 * Generate an array of individual CREATE INDEX SQL statements for a table.
	 *
	 * Each entry is an object with:
	 *   { Name, Statement, CheckStatement }
	 *
	 * - Statement: the raw CREATE [UNIQUE] INDEX ... SQL
	 * - CheckStatement: a SELECT against pg_indexes that returns the count
	 *   of matching indices (0 = does not exist)
	 *
	 * @param {object} pMeadowTableSchema - Meadow table schema object
	 * @returns {Array} Array of { Name, Statement, CheckStatement } objects
	 */
	generateCreateIndexStatements(pMeadowTableSchema)
	{
		let tmpIndices = this.getIndexDefinitionsFromSchema(pMeadowTableSchema);
		let tmpStatements = [];

		for (let i = 0; i < tmpIndices.length; i++)
		{
			let tmpIndex = tmpIndices[i];
			let tmpColumnList = this._buildColumnList(tmpIndex.Columns);
			let tmpCreateKeyword = tmpIndex.Unique ? 'CREATE UNIQUE INDEX' : 'CREATE INDEX';
			let tmpStrategyClause = tmpIndex.Strategy ? ` USING ${tmpIndex.Strategy}` : '';

			tmpStatements.push(
				{
					Name: tmpIndex.Name,
					Statement: `${tmpCreateKeyword} "${tmpIndex.Name}" ON "${tmpIndex.TableName}" (${tmpColumnList})${tmpStrategyClause}`,
					CheckStatement: `SELECT COUNT(*) AS "IndexExists" FROM pg_indexes WHERE tablename = '${tmpIndex.TableName}' AND indexname = '${tmpIndex.Name}'`
				});
		}

		return tmpStatements;
	}

	/**
	 * Programmatically create a single index on the database.
	 *
	 * Checks pg_indexes first; only runs CREATE INDEX if the index
	 * does not yet exist.
	 *
	 * @param {object} pIndexStatement - Object from generateCreateIndexStatements()
	 * @param {Function} fCallback - callback(pError)
	 */
	createIndex(pIndexStatement, fCallback)
	{
		if (!this._ConnectionPool)
		{
			this.log.error(`Meadow-PostgreSQL CREATE INDEX ${pIndexStatement.Name} failed: not connected.`);
			return fCallback(new Error('Not connected to PostgreSQL'));
		}

		// First check if the index already exists
		this._ConnectionPool.query(pIndexStatement.CheckStatement,
			(pCheckError, pCheckResult) =>
			{
				if (pCheckError)
				{
					this.log.error(`Meadow-PostgreSQL CHECK INDEX ${pIndexStatement.Name} failed!`, pCheckError);
					return fCallback(pCheckError);
				}

				let tmpExists = pCheckResult && pCheckResult.rows && pCheckResult.rows[0] && parseInt(pCheckResult.rows[0].IndexExists) > 0;

				if (tmpExists)
				{
					this.log.info(`Meadow-PostgreSQL INDEX ${pIndexStatement.Name} already exists, skipping.`);
					return fCallback();
				}

				// Index does not exist; create it
				this._ConnectionPool.query(pIndexStatement.Statement,
					(pCreateError) =>
					{
						if (pCreateError)
						{
							this.log.error(`Meadow-PostgreSQL CREATE INDEX ${pIndexStatement.Name} failed!`, pCreateError);
							return fCallback(pCreateError);
						}
						this.log.info(`Meadow-PostgreSQL CREATE INDEX ${pIndexStatement.Name} executed successfully.`);
						return fCallback();
					});
			});
	}

	/**
	 * Programmatically create all indices for a single table.
	 *
	 * @param {object} pMeadowTableSchema - Meadow table schema object
	 * @param {Function} fCallback - callback(pError)
	 */
	createIndices(pMeadowTableSchema, fCallback)
	{
		let tmpStatements = this.generateCreateIndexStatements(pMeadowTableSchema);

		if (tmpStatements.length === 0)
		{
			this.log.info(`No indices to create for ${pMeadowTableSchema.TableName}.`);
			return fCallback();
		}

		this.fable.Utility.eachLimit(tmpStatements, 1,
			(pStatement, fCreateComplete) =>
			{
				return this.createIndex(pStatement, fCreateComplete);
			},
			(pCreateError) =>
			{
				if (pCreateError)
				{
					this.log.error(`Meadow-PostgreSQL Error creating indices for ${pMeadowTableSchema.TableName}: ${pCreateError}`, pCreateError);
				}
				else
				{
					this.log.info(`Done creating indices for ${pMeadowTableSchema.TableName}!`);
				}
				return fCallback(pCreateError);
			});
	}

	/**
	 * Programmatically create all indices for all tables in a schema.
	 *
	 * @param {object} pMeadowSchema - Meadow schema object with Tables array
	 * @param {Function} fCallback - callback(pError)
	 */
	createAllIndices(pMeadowSchema, fCallback)
	{
		this.fable.Utility.eachLimit(pMeadowSchema.Tables, 1,
			(pTable, fCreateComplete) =>
			{
				return this.createIndices(pTable, fCreateComplete);
			},
			(pCreateError) =>
			{
				if (pCreateError)
				{
					this.log.error(`Meadow-PostgreSQL Error creating indices from schema: ${pCreateError}`, pCreateError);
				}
				this.log.info('Done creating all indices!');
				return fCallback(pCreateError);
			});
	}

	// ========================================================================
	// Database Introspection
	// ========================================================================

	/**
	 * List all user tables in the connected PostgreSQL database.
	 *
	 * @param {Function} fCallback - callback(pError, pTableNames)
	 */
	listTables(fCallback)
	{
		if (!this._ConnectionPool)
		{
			return fCallback(new Error('Not connected to PostgreSQL'));
		}

		this._ConnectionPool.query(
			"SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
			(pError, pResult) =>
			{
				if (pError)
				{
					this.log.error('Meadow-PostgreSQL listTables failed!', pError);
					return fCallback(pError);
				}
				let tmpNames = pResult.rows.map((pRow) => { return pRow.tablename; });
				return fCallback(null, tmpNames);
			});
	}

	/**
	 * Map a PostgreSQL native type to a Meadow DataType.
	 *
	 * @param {object} pColumnInfo - information_schema.columns row
	 * @param {boolean} pIsSerial - Whether this column is SERIAL (auto-increment PK)
	 * @param {Set} pForeignKeyColumns - Set of column names that have FK constraints
	 * @returns {object} { DataType, Size }
	 */
	_mapPostgreSQLTypeToMeadow(pColumnInfo, pIsSerial, pForeignKeyColumns)
	{
		let tmpName = pColumnInfo.column_name;
		let tmpType = (pColumnInfo.data_type || '').toLowerCase().trim();

		// Priority 1: SERIAL auto-increment → ID
		if (pIsSerial)
		{
			return { DataType: 'ID', Size: '' };
		}

		// Priority 2: Column name contains "GUID" and type is character → GUID
		if (tmpName.toUpperCase().indexOf('GUID') >= 0 && (tmpType === 'character varying' || tmpType === 'character' || tmpType === 'text'))
		{
			return { DataType: 'GUID', Size: pColumnInfo.character_maximum_length ? String(pColumnInfo.character_maximum_length) : '' };
		}

		// Priority 3: Has FK constraint → ForeignKey
		if (pForeignKeyColumns && pForeignKeyColumns.has(tmpName))
		{
			return { DataType: 'ForeignKey', Size: '' };
		}

		// Priority 4: Native type mapping
		if (tmpType === 'numeric' || tmpType === 'decimal')
		{
			let tmpSize = '';
			if (pColumnInfo.numeric_precision)
			{
				tmpSize = String(pColumnInfo.numeric_precision);
				if (pColumnInfo.numeric_scale && pColumnInfo.numeric_scale > 0)
				{
					tmpSize += ',' + String(pColumnInfo.numeric_scale);
				}
			}
			return { DataType: 'Decimal', Size: tmpSize };
		}

		if (tmpType === 'double precision' || tmpType === 'real')
		{
			return { DataType: 'Decimal', Size: '' };
		}

		if (tmpType === 'timestamp without time zone' || tmpType === 'timestamp with time zone' || tmpType === 'timestamp')
		{
			return { DataType: 'DateTime', Size: '' };
		}

		if (tmpType === 'boolean')
		{
			return { DataType: 'Boolean', Size: '' };
		}

		if (tmpType === 'text')
		{
			// Distinguish between String and Text: if NOT NULL with default '' → String, else Text
			if (pColumnInfo.is_nullable === 'NO' && pColumnInfo.column_default === "''::text")
			{
				return { DataType: 'String', Size: '' };
			}
			return { DataType: 'Text', Size: '' };
		}

		if (tmpType === 'character varying')
		{
			let tmpSize = pColumnInfo.character_maximum_length ? String(pColumnInfo.character_maximum_length) : '';
			return { DataType: 'String', Size: tmpSize };
		}

		if (tmpType === 'character')
		{
			let tmpSize = pColumnInfo.character_maximum_length ? String(pColumnInfo.character_maximum_length) : '';
			return { DataType: 'String', Size: tmpSize };
		}

		if (tmpType === 'integer' || tmpType === 'bigint' || tmpType === 'smallint')
		{
			// Check for boolean naming hints
			let tmpLowerName = tmpName.toLowerCase();
			if (pColumnInfo.is_nullable === 'NO' && pColumnInfo.column_default === '0')
			{
				if (tmpLowerName.indexOf('is') === 0 || tmpLowerName.indexOf('has') === 0 ||
					tmpLowerName.indexOf('in') === 0 || tmpLowerName === 'deleted' ||
					tmpLowerName === 'active' || tmpLowerName === 'enabled')
				{
					return { DataType: 'Boolean', Size: '' };
				}
			}
			return { DataType: 'Numeric', Size: '' };
		}

		// Default fallback
		return { DataType: 'Text', Size: '' };
	}

	/**
	 * Get column definitions for a single table.
	 *
	 * @param {string} pTableName - Name of the table
	 * @param {Function} fCallback - callback(pError, pColumns)
	 */
	introspectTableColumns(pTableName, fCallback)
	{
		if (!this._ConnectionPool)
		{
			return fCallback(new Error('Not connected to PostgreSQL'));
		}

		let tmpColumnQuery = `SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale, is_nullable, column_default, is_identity FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`;

		let tmpFKQuery = `SELECT kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema WHERE tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`;

		this._ConnectionPool.query(tmpColumnQuery, [pTableName],
			(pError, pColumnResult) =>
			{
				if (pError)
				{
					this.log.error(`Meadow-PostgreSQL introspectTableColumns for ${pTableName} failed!`, pError);
					return fCallback(pError);
				}

				this._ConnectionPool.query(tmpFKQuery, [pTableName],
					(pFKError, pFKResult) =>
					{
						if (pFKError)
						{
							this.log.error(`Meadow-PostgreSQL introspectTableColumns FK query for ${pTableName} failed!`, pFKError);
							return fCallback(pFKError);
						}

						let tmpFKColumnSet = new Set(pFKResult.rows.map((pRow) => { return pRow.column_name; }));

						let tmpResult = [];
						for (let i = 0; i < pColumnResult.rows.length; i++)
						{
							let tmpCol = pColumnResult.rows[i];
							// Detect SERIAL/IDENTITY: integer with nextval() default, or GENERATED AS IDENTITY
							let tmpIsSerial = (tmpCol.data_type === 'integer' && tmpCol.column_default && tmpCol.column_default.indexOf('nextval') >= 0) || (tmpCol.is_identity === 'YES');
							let tmpTypeInfo = this._mapPostgreSQLTypeToMeadow(tmpCol, tmpIsSerial, tmpFKColumnSet);

							let tmpColumnDef = {
								Column: tmpCol.column_name,
								DataType: tmpTypeInfo.DataType
							};

							if (tmpTypeInfo.Size)
							{
								tmpColumnDef.Size = tmpTypeInfo.Size;
							}

							tmpResult.push(tmpColumnDef);
						}

						return fCallback(null, tmpResult);
					});
			});
	}

	/**
	 * Get raw index definitions for a single table from the database.
	 *
	 * @param {string} pTableName - Name of the table
	 * @param {Function} fCallback - callback(pError, pIndices)
	 */
	introspectTableIndices(pTableName, fCallback)
	{
		if (!this._ConnectionPool)
		{
			return fCallback(new Error('Not connected to PostgreSQL'));
		}

		let tmpQuery = `SELECT i.relname AS index_name, a.attname AS column_name, ix.indisunique, ix.indisprimary FROM pg_class t JOIN pg_index ix ON t.oid = ix.indrelid JOIN pg_class i ON i.oid = ix.indexrelid JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey) WHERE t.relname = $1 AND t.relkind = 'r' ORDER BY i.relname, array_position(ix.indkey, a.attnum)`;

		this._ConnectionPool.query(tmpQuery, [pTableName],
			(pError, pResult) =>
			{
				if (pError)
				{
					this.log.error(`Meadow-PostgreSQL introspectTableIndices for ${pTableName} failed!`, pError);
					return fCallback(pError);
				}

				// Group by index name, skip primary key indices
				let tmpIndexMap = {};
				for (let i = 0; i < pResult.rows.length; i++)
				{
					let tmpRow = pResult.rows[i];
					if (tmpRow.indisprimary)
					{
						continue;
					}

					if (!tmpIndexMap[tmpRow.index_name])
					{
						tmpIndexMap[tmpRow.index_name] = {
							Name: tmpRow.index_name,
							Columns: [],
							Unique: tmpRow.indisunique
						};
					}
					tmpIndexMap[tmpRow.index_name].Columns.push(tmpRow.column_name);
				}

				let tmpIndices = Object.values(tmpIndexMap);
				return fCallback(null, tmpIndices);
			});
	}

	/**
	 * Get foreign key relationships for a single table.
	 *
	 * @param {string} pTableName - Name of the table
	 * @param {Function} fCallback - callback(pError, pForeignKeys)
	 */
	introspectTableForeignKeys(pTableName, fCallback)
	{
		if (!this._ConnectionPool)
		{
			return fCallback(new Error('Not connected to PostgreSQL'));
		}

		let tmpQuery = `SELECT kcu.column_name, ccu.table_name AS referenced_table, ccu.column_name AS referenced_column FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema WHERE tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`;

		this._ConnectionPool.query(tmpQuery, [pTableName],
			(pError, pResult) =>
			{
				if (pError)
				{
					this.log.error(`Meadow-PostgreSQL introspectTableForeignKeys for ${pTableName} failed!`, pError);
					return fCallback(pError);
				}

				let tmpResult = [];
				for (let i = 0; i < pResult.rows.length; i++)
				{
					let tmpRow = pResult.rows[i];
					tmpResult.push(
						{
							Column: tmpRow.column_name,
							ReferencedTable: tmpRow.referenced_table,
							ReferencedColumn: tmpRow.referenced_column
						});
				}

				return fCallback(null, tmpResult);
			});
	}

	/**
	 * Classify an index for round-trip fidelity.
	 *
	 * @param {object} pIndex - { Name, Columns[], Unique }
	 * @param {string} pTableName - Table name for pattern matching
	 * @returns {object} { type, column, indexed, indexName }
	 */
	_classifyIndex(pIndex, pTableName)
	{
		if (pIndex.Columns.length !== 1)
		{
			return { type: 'explicit' };
		}

		let tmpColumn = pIndex.Columns[0];
		let tmpName = pIndex.Name;

		if (tmpName === `AK_M_${tmpColumn}`)
		{
			return { type: 'guid-auto', column: tmpColumn };
		}

		if (tmpName === `IX_M_${tmpColumn}`)
		{
			return { type: 'fk-auto', column: tmpColumn };
		}

		let tmpRegularAutoName = `IX_M_T_${pTableName}_C_${tmpColumn}`;
		if (tmpName === tmpRegularAutoName && !pIndex.Unique)
		{
			return { type: 'column-auto', column: tmpColumn, indexed: true };
		}

		let tmpUniqueAutoName = `AK_M_T_${pTableName}_C_${tmpColumn}`;
		if (tmpName === tmpUniqueAutoName && pIndex.Unique)
		{
			return { type: 'column-auto', column: tmpColumn, indexed: 'unique' };
		}

		return {
			type: 'column-named',
			column: tmpColumn,
			indexed: pIndex.Unique ? 'unique' : true,
			indexName: tmpName
		};
	}

	/**
	 * Generate a complete DDL-level schema for a single table.
	 *
	 * @param {string} pTableName - Name of the table
	 * @param {Function} fCallback - callback(pError, pTableSchema)
	 */
	introspectTableSchema(pTableName, fCallback)
	{
		this.introspectTableColumns(pTableName,
			(pColumnError, pColumns) =>
			{
				if (pColumnError)
				{
					return fCallback(pColumnError);
				}

				this.introspectTableIndices(pTableName,
					(pIndexError, pIndices) =>
					{
						if (pIndexError)
						{
							return fCallback(pIndexError);
						}

						this.introspectTableForeignKeys(pTableName,
							(pFKError, pForeignKeys) =>
							{
								if (pFKError)
								{
									return fCallback(pFKError);
								}

								let tmpColumnMap = {};
								for (let i = 0; i < pColumns.length; i++)
								{
									tmpColumnMap[pColumns[i].Column] = pColumns[i];
								}

								let tmpExplicitIndices = [];

								for (let i = 0; i < pIndices.length; i++)
								{
									let tmpClassification = this._classifyIndex(pIndices[i], pTableName);

									switch (tmpClassification.type)
									{
										case 'column-auto':
											if (tmpColumnMap[tmpClassification.column])
											{
												tmpColumnMap[tmpClassification.column].Indexed = tmpClassification.indexed;
											}
											break;
										case 'column-named':
											if (tmpColumnMap[tmpClassification.column])
											{
												tmpColumnMap[tmpClassification.column].Indexed = tmpClassification.indexed;
												tmpColumnMap[tmpClassification.column].IndexName = tmpClassification.indexName;
											}
											break;
										case 'guid-auto':
											if (tmpColumnMap[tmpClassification.column] &&
												tmpColumnMap[tmpClassification.column].DataType !== 'GUID')
											{
												tmpColumnMap[tmpClassification.column].DataType = 'GUID';
											}
											break;
										case 'fk-auto':
											if (tmpColumnMap[tmpClassification.column] &&
												tmpColumnMap[tmpClassification.column].DataType !== 'ForeignKey')
											{
												tmpColumnMap[tmpClassification.column].DataType = 'ForeignKey';
											}
											break;
										case 'explicit':
											tmpExplicitIndices.push(
												{
													Name: pIndices[i].Name,
													Columns: pIndices[i].Columns,
													Unique: pIndices[i].Unique
												});
											break;
									}
								}

								let tmpSchema = {
									TableName: pTableName,
									Columns: pColumns
								};

								if (tmpExplicitIndices.length > 0)
								{
									tmpSchema.Indices = tmpExplicitIndices;
								}

								if (pForeignKeys.length > 0)
								{
									tmpSchema.ForeignKeys = pForeignKeys;
								}

								return fCallback(null, tmpSchema);
							});
					});
			});
	}

	/**
	 * Generate DDL schemas for ALL tables in the database.
	 *
	 * @param {Function} fCallback - callback(pError, { Tables: [...] })
	 */
	introspectDatabaseSchema(fCallback)
	{
		this.listTables(
			(pError, pTableNames) =>
			{
				if (pError)
				{
					return fCallback(pError);
				}

				let tmpTables = [];

				this.fable.Utility.eachLimit(pTableNames, 1,
					(pTableName, fEachComplete) =>
					{
						this.introspectTableSchema(pTableName,
							(pSchemaError, pSchema) =>
							{
								if (pSchemaError)
								{
									return fEachComplete(pSchemaError);
								}
								tmpTables.push(pSchema);
								return fEachComplete();
							});
					},
					(pEachError) =>
					{
						if (pEachError)
						{
							this.log.error('Meadow-PostgreSQL introspectDatabaseSchema failed!', pEachError);
							return fCallback(pEachError);
						}
						return fCallback(null, { Tables: tmpTables });
					});
			});
	}

	/**
	 * Map a DDL DataType to a Meadow Package schema Type.
	 *
	 * @param {string} pDataType - The DDL-level DataType
	 * @param {string} pColumnName - The column name (for magic column detection)
	 * @returns {string} The Meadow Package Type
	 */
	_mapDataTypeToMeadowType(pDataType, pColumnName)
	{
		let tmpLowerName = pColumnName.toLowerCase();

		if (tmpLowerName === 'createdate') return 'CreateDate';
		if (tmpLowerName === 'creatingiduser') return 'CreateIDUser';
		if (tmpLowerName === 'updatedate') return 'UpdateDate';
		if (tmpLowerName === 'updatingiduser') return 'UpdateIDUser';
		if (tmpLowerName === 'deleted') return 'Deleted';
		if (tmpLowerName === 'deletingiduser') return 'DeleteIDUser';
		if (tmpLowerName === 'deletedate') return 'DeleteDate';

		switch (pDataType)
		{
			case 'ID': return 'AutoIdentity';
			case 'GUID': return 'AutoGUID';
			case 'ForeignKey': return 'Numeric';
			case 'Numeric': return 'Numeric';
			case 'Decimal': return 'Numeric';
			case 'String': return 'String';
			case 'Text': return 'String';
			case 'DateTime': return 'DateTime';
			case 'Boolean': return 'Boolean';
			case 'JSON': return 'JSON';
			case 'JSONProxy': return 'JSONProxy';
			default: return 'String';
		}
	}

	/**
	 * Get a default value for a given DataType.
	 *
	 * @param {string} pDataType - The DDL-level DataType
	 * @returns {*} The default value
	 */
	_getDefaultValue(pDataType)
	{
		switch (pDataType)
		{
			case 'ID': return 0;
			case 'GUID': return '';
			case 'ForeignKey': return 0;
			case 'Numeric': return 0;
			case 'Decimal': return 0.0;
			case 'String': return '';
			case 'Text': return '';
			case 'DateTime': return '';
			case 'Boolean': return false;
			case 'JSON': return {};
			case 'JSONProxy': return {};
			default: return '';
		}
	}

	/**
	 * Generate a Meadow package JSON for a single table.
	 *
	 * @param {string} pTableName - Name of the table
	 * @param {Function} fCallback - callback(pError, pPackage)
	 */
	generateMeadowPackageFromTable(pTableName, fCallback)
	{
		this.introspectTableSchema(pTableName,
			(pError, pSchema) =>
			{
				if (pError)
				{
					return fCallback(pError);
				}

				let tmpDefaultIdentifier = '';
				let tmpSchemaEntries = [];
				let tmpDefaultObject = {};

				for (let i = 0; i < pSchema.Columns.length; i++)
				{
					let tmpCol = pSchema.Columns[i];
					let tmpMeadowType = this._mapDataTypeToMeadowType(tmpCol.DataType, tmpCol.Column);

					if (tmpCol.DataType === 'ID')
					{
						tmpDefaultIdentifier = tmpCol.Column;
					}

					let tmpEntry = {
						Column: tmpCol.Column,
						Type: tmpMeadowType
					};

					if (tmpCol.Size)
					{
						tmpEntry.Size = tmpCol.Size;
					}

					tmpSchemaEntries.push(tmpEntry);
					tmpDefaultObject[tmpCol.Column] = this._getDefaultValue(tmpCol.DataType);
				}

				let tmpPackage = {
					Scope: pTableName,
					DefaultIdentifier: tmpDefaultIdentifier,
					Schema: tmpSchemaEntries,
					DefaultObject: tmpDefaultObject
				};

				return fCallback(null, tmpPackage);
			});
	}
}

module.exports = MeadowSchemaPostgreSQL;
