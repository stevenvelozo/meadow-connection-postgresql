/**
* Unit tests for Meadow Connection PostgreSQL
*
* @license     MIT
*
* @author      Steven Velozo <steven@velozo.com>
*/

const Chai = require('chai');
const Expect = Chai.expect;

const libFable = require('fable');
const libMeadowConnectionPostgreSQL = require('../source/Meadow-Connection-PostgreSQL.js');
const libMeadowSchemaPostgreSQL = require('../source/Meadow-Schema-PostgreSQL.js');

const _FableConfig = (
	{
		"Product": "MeadowPostgreSQLTest",
		"ProductVersion": "1.0.0",

		"UUID":
			{
				"DataCenter": 0,
				"Worker": 0
			},
		"LogStreams":
			[
				{
					"streamtype": "console"
				}
			],

		"PostgreSQL":
			{
				"Server": "127.0.0.1",
				"Port": 25432,
				"User": "postgres",
				"Password": "testpassword",
				"Database": "testdb",
				"ConnectionPoolLimit": 20
			}
	});

const _AnimalTableSchema =
{
	TableName: 'Animal',
	Columns:
	[
		{ Column: 'IDAnimal', DataType: 'ID' },
		{ Column: 'GUIDAnimal', DataType: 'GUID', Size: 36 },
		{ Column: 'Name', DataType: 'String', Size: 128 },
		{ Column: 'Age', DataType: 'Numeric' },
		{ Column: 'IDFarm', DataType: 'ForeignKey' }
	]
};

const _AnimalTableSchemaWithColumnIndexed =
{
	TableName: 'Animal',
	Columns:
	[
		{ Column: 'IDAnimal', DataType: 'ID' },
		{ Column: 'GUIDAnimal', DataType: 'GUID', Size: 36 },
		{ Column: 'Name', DataType: 'String', Size: 128, Indexed: true },
		{ Column: 'TagNumber', DataType: 'String', Size: 64, Indexed: 'unique' },
		{ Column: 'IDFarm', DataType: 'ForeignKey' }
	]
};

const _AnimalTableSchemaWithIndexName =
{
	TableName: 'AnimalCustomIdx',
	Columns:
	[
		{ Column: 'IDAnimalCustomIdx', DataType: 'ID' },
		{ Column: 'GUIDAnimalCustomIdx', DataType: 'GUID', Size: 36 },
		{ Column: 'Name', DataType: 'String', Size: 128, Indexed: true, IndexName: 'IX_Custom_Name' },
		{ Column: 'TagNumber', DataType: 'String', Size: 64, Indexed: 'unique', IndexName: 'UQ_Animal_Tag' },
		{ Column: 'Weight', DataType: 'Decimal', Size: '10,2', Indexed: true },
		{ Column: 'IDFarm', DataType: 'ForeignKey' }
	]
};

// Schemas specifically for introspection testing (unique table names to avoid conflicts)
const _IntrospectAnimalSchema =
{
	TableName: 'IntrospAnimal',
	Columns:
	[
		{ Column: 'IDIntrospAnimal', DataType: 'ID' },
		{ Column: 'GUIDIntrospAnimal', DataType: 'GUID', Size: 36 },
		{ Column: 'Name', DataType: 'String', Size: 128 },
		{ Column: 'Description', DataType: 'Text' },
		{ Column: 'Cost', DataType: 'Decimal', Size: '10,2' },
		{ Column: 'Age', DataType: 'Numeric' },
		{ Column: 'Birthday', DataType: 'DateTime' },
		{ Column: 'Active', DataType: 'Boolean' },
		{ Column: 'IDFarm', DataType: 'ForeignKey' }
	]
};

const _IntrospectAnimalIndexedSchema =
{
	TableName: 'IntrospAnimalIdx',
	Columns:
	[
		{ Column: 'IDIntrospAnimalIdx', DataType: 'ID' },
		{ Column: 'GUIDIntrospAnimalIdx', DataType: 'GUID', Size: 36 },
		{ Column: 'Name', DataType: 'String', Size: 128, Indexed: true },
		{ Column: 'Description', DataType: 'Text' },
		{ Column: 'TagNumber', DataType: 'String', Size: 64, Indexed: 'unique' },
		{ Column: 'IDOwner', DataType: 'ForeignKey' }
	]
};

const _IntrospectAnimalCustomIdxSchema =
{
	TableName: 'IntrospAnimalCustIdx',
	Columns:
	[
		{ Column: 'IDIntrospAnimalCustIdx', DataType: 'ID' },
		{ Column: 'GUIDIntrospAnimalCustIdx', DataType: 'GUID', Size: 36 },
		{ Column: 'Name', DataType: 'String', Size: 128, Indexed: true, IndexName: 'IX_Custom_Name' },
		{ Column: 'TagNumber', DataType: 'String', Size: 64, Indexed: 'unique', IndexName: 'UQ_IntrospAnimalCustIdx_Tag' },
		{ Column: 'Weight', DataType: 'Decimal', Size: '10,2', Indexed: true },
		{ Column: 'IDTrainer', DataType: 'ForeignKey' }
	]
};

suite
(
	'Meadow-Connection-PostgreSQL',
	() =>
	{
		setup(() => {});

		suite
		(
			'Object Sanity',
			() =>
			{
				test
				(
					'constructor should create a connection service',
					() =>
					{
						let _Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowPostgreSQLProvider', libMeadowConnectionPostgreSQL);
						_Fable.serviceManager.instantiateServiceProvider('MeadowPostgreSQLProvider');

						Expect(_Fable.MeadowPostgreSQLProvider).to.be.an('object');
						Expect(_Fable.MeadowPostgreSQLProvider.serviceType).to.equal('MeadowConnectionPostgreSQL');
						Expect(_Fable.MeadowPostgreSQLProvider.connected).to.equal(false);
					}
				);
				test
				(
					'pass in your own settings',
					() =>
					{
						let _Fable = new libFable();
						_Fable.serviceManager.addServiceType('MeadowPostgreSQLProvider', libMeadowConnectionPostgreSQL);
						_Fable.serviceManager.instantiateServiceProvider('MeadowPostgreSQLProvider', {PostgreSQL: _FableConfig.PostgreSQL});

						Expect(_Fable.MeadowPostgreSQLProvider).to.be.an('object');
						Expect(_Fable.MeadowPostgreSQLProvider.serviceType).to.equal('MeadowConnectionPostgreSQL');
						Expect(_Fable.MeadowPostgreSQLProvider.connected).to.equal(false);
					}
				);
			}
		);
		suite
		(
			'DDL Generation',
			() =>
			{
				test
				(
					'generateCreateTableStatement produces valid PostgreSQL DDL',
					() =>
					{
						let _Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowPostgreSQLProvider', libMeadowConnectionPostgreSQL);
						_Fable.serviceManager.instantiateServiceProvider('MeadowPostgreSQLProvider');

						let tmpSchema = {
							TableName: 'Animal',
							Columns: [
								{ Column: 'IDAnimal', DataType: 'ID' },
								{ Column: 'GUIDAnimal', DataType: 'GUID', Size: 36 },
								{ Column: 'Name', DataType: 'String', Size: 128 },
								{ Column: 'Age', DataType: 'Numeric' },
								{ Column: 'Cost', DataType: 'Decimal', Size: '10,2' },
								{ Column: 'Description', DataType: 'Text' },
								{ Column: 'Birthday', DataType: 'DateTime' },
								{ Column: 'Active', DataType: 'Boolean' },
								{ Column: 'IDFarm', DataType: 'ForeignKey' }
							]
						};

						let tmpResult = _Fable.MeadowPostgreSQLProvider.generateCreateTableStatement(tmpSchema);
						Expect(tmpResult).to.contain('CREATE TABLE IF NOT EXISTS');
						Expect(tmpResult).to.contain('"Animal"');
						Expect(tmpResult).to.contain('SERIAL PRIMARY KEY');
						Expect(tmpResult).to.contain('VARCHAR(36)');
						Expect(tmpResult).to.contain('VARCHAR(128)');
						Expect(tmpResult).to.contain('INTEGER NOT NULL DEFAULT 0');
						Expect(tmpResult).to.contain('DECIMAL(10,2)');
						Expect(tmpResult).to.contain('TEXT');
						Expect(tmpResult).to.contain('TIMESTAMP');
						Expect(tmpResult).to.contain('BOOLEAN NOT NULL DEFAULT false');
						// Should NOT contain MySQL-specific syntax
						Expect(tmpResult).to.not.contain('AUTO_INCREMENT');
						Expect(tmpResult).to.not.contain('TINYINT');
						Expect(tmpResult).to.not.contain('CHARSET');
						Expect(tmpResult).to.not.contain('COLLATE');
					}
				);
				test
				(
					'generateDropTableStatement produces valid PostgreSQL DDL',
					() =>
					{
						let _Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowPostgreSQLProvider', libMeadowConnectionPostgreSQL);
						_Fable.serviceManager.instantiateServiceProvider('MeadowPostgreSQLProvider');

						let tmpResult = _Fable.MeadowPostgreSQLProvider.generateDropTableStatement('Animal');
						Expect(tmpResult).to.equal('DROP TABLE IF EXISTS "Animal";');
					}
				);
			}
		);

		suite
		(
			'Index Generation',
			() =>
			{
				let libSchemaPostgreSQL = null;

				setup(
					() =>
					{
						let _Fable = new libFable(_FableConfig);
						libSchemaPostgreSQL = _Fable.serviceManager.addServiceType('MeadowSchemaPostgreSQL', libMeadowSchemaPostgreSQL);
						libSchemaPostgreSQL = _Fable.serviceManager.instantiateServiceProvider('MeadowSchemaPostgreSQL');
					});

				test
				(
					'auto-detect GUID and ForeignKey indices',
					() =>
					{
						let tmpIndices = libSchemaPostgreSQL.getIndexDefinitionsFromSchema(_AnimalTableSchema);
						Expect(tmpIndices).to.be.an('array');
						Expect(tmpIndices.length).to.equal(2);
						Expect(tmpIndices[0].Name).to.equal('AK_M_GUIDAnimal');
						Expect(tmpIndices[0].Unique).to.equal(true);
						Expect(tmpIndices[1].Name).to.equal('IX_M_IDFarm');
						Expect(tmpIndices[1].Unique).to.equal(false);
					}
				);

				test
				(
					'include explicit indices alongside auto-detected ones',
					() =>
					{
						let tmpSchemaWithExplicit = JSON.parse(JSON.stringify(_AnimalTableSchema));
						tmpSchemaWithExplicit.Indices = [
							{ Name: 'IX_Animal_NameAge', Columns: ['Name', 'Age'], Unique: false }
						];
						let tmpIndices = libSchemaPostgreSQL.getIndexDefinitionsFromSchema(tmpSchemaWithExplicit);
						Expect(tmpIndices.length).to.equal(3);
						Expect(tmpIndices[2].Name).to.equal('IX_Animal_NameAge');
						Expect(tmpIndices[2].Columns).to.deep.equal(['Name', 'Age']);
					}
				);

				test
				(
					'column-level Indexed property generates consistently named indices',
					() =>
					{
						let tmpIndices = libSchemaPostgreSQL.getIndexDefinitionsFromSchema(_AnimalTableSchemaWithColumnIndexed);
						Expect(tmpIndices).to.be.an('array');
						Expect(tmpIndices.length).to.equal(4);
						Expect(tmpIndices[0].Name).to.equal('AK_M_GUIDAnimal');
						Expect(tmpIndices[1].Name).to.equal('IX_M_T_Animal_C_Name');
						Expect(tmpIndices[1].Unique).to.equal(false);
						Expect(tmpIndices[2].Name).to.equal('AK_M_T_Animal_C_TagNumber');
						Expect(tmpIndices[2].Unique).to.equal(true);
						Expect(tmpIndices[3].Name).to.equal('IX_M_IDFarm');
					}
				);

				test
				(
					'generate script with column-level Indexed property',
					() =>
					{
						let tmpScript = libSchemaPostgreSQL.generateCreateIndexScript(_AnimalTableSchemaWithColumnIndexed);
						Expect(tmpScript).to.contain('IX_M_T_Animal_C_Name');
						Expect(tmpScript).to.contain('AK_M_T_Animal_C_TagNumber');
						Expect(tmpScript).to.contain('IF NOT EXISTS');
					}
				);

				test
				(
					'generate idempotent index script with IF NOT EXISTS',
					() =>
					{
						let tmpScript = libSchemaPostgreSQL.generateCreateIndexScript(_AnimalTableSchema);
						Expect(tmpScript).to.contain('CREATE UNIQUE INDEX IF NOT EXISTS');
						Expect(tmpScript).to.contain('CREATE INDEX IF NOT EXISTS');
						Expect(tmpScript).to.contain('"AK_M_GUIDAnimal"');
						Expect(tmpScript).to.contain('"IX_M_IDFarm"');
					}
				);

				test
				(
					'generate script with strategy clause',
					() =>
					{
						let tmpSchemaWithStrategy = JSON.parse(JSON.stringify(_AnimalTableSchema));
						tmpSchemaWithStrategy.Indices = [
							{ Name: 'IX_Animal_Name_Hash', Columns: ['Name'], Unique: false, Strategy: 'hash' }
						];
						let tmpScript = libSchemaPostgreSQL.generateCreateIndexScript(tmpSchemaWithStrategy);
						Expect(tmpScript).to.contain('USING hash');
					}
				);

				test
				(
					'generate individual index statements with pg_indexes check',
					() =>
					{
						let tmpStatements = libSchemaPostgreSQL.generateCreateIndexStatements(_AnimalTableSchema);
						Expect(tmpStatements).to.be.an('array');
						Expect(tmpStatements.length).to.equal(2);
						Expect(tmpStatements[0].Name).to.equal('AK_M_GUIDAnimal');
						Expect(tmpStatements[0].Statement).to.contain('CREATE UNIQUE INDEX');
						Expect(tmpStatements[0].CheckStatement).to.contain('pg_indexes');
					}
				);

				test
				(
					'IndexName property overrides auto-generated index name',
					() =>
					{
						let tmpIndices = libSchemaPostgreSQL.getIndexDefinitionsFromSchema(_AnimalTableSchemaWithIndexName);
						Expect(tmpIndices).to.be.an('array');
						Expect(tmpIndices.length).to.equal(5);
						Expect(tmpIndices[0].Name).to.equal('AK_M_GUIDAnimalCustomIdx');
						Expect(tmpIndices[1].Name).to.equal('IX_Custom_Name');
						Expect(tmpIndices[1].Unique).to.equal(false);
						Expect(tmpIndices[2].Name).to.equal('UQ_Animal_Tag');
						Expect(tmpIndices[2].Unique).to.equal(true);
						Expect(tmpIndices[3].Name).to.equal('IX_M_T_AnimalCustomIdx_C_Weight');
						Expect(tmpIndices[3].Unique).to.equal(false);
						Expect(tmpIndices[4].Name).to.equal('IX_M_IDFarm');
					}
				);

				test
				(
					'generate script with IndexName uses custom names in SQL',
					() =>
					{
						let tmpScript = libSchemaPostgreSQL.generateCreateIndexScript(_AnimalTableSchemaWithIndexName);
						Expect(tmpScript).to.contain('IX_Custom_Name');
						Expect(tmpScript).to.contain('UQ_Animal_Tag');
						Expect(tmpScript).to.contain('IX_M_T_AnimalCustomIdx_C_Weight');
						Expect(tmpScript).to.not.contain('IX_M_T_AnimalCustomIdx_C_Name');
						Expect(tmpScript).to.not.contain('AK_M_T_AnimalCustomIdx_C_TagNumber');
					}
				);

				test
				(
					'schema provider is accessible from connection provider',
					() =>
					{
						let _Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowPostgreSQLProvider', libMeadowConnectionPostgreSQL);
						_Fable.serviceManager.instantiateServiceProvider('MeadowPostgreSQLProvider');
						Expect(_Fable.MeadowPostgreSQLProvider.schemaProvider).to.be.an('object');
					}
				);
			}
		);

		suite
		(
			'Database Introspection',
			()=>
			{
				let _Fable = null;
				let libSchemaPostgreSQL = null;

				setup(
					(fDone) =>
					{
						_Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowSchemaPostgreSQL', libMeadowSchemaPostgreSQL);
						libSchemaPostgreSQL = _Fable.serviceManager.instantiateServiceProvider('MeadowSchemaPostgreSQL');
						_Fable.serviceManager.addServiceType('MeadowPostgreSQLProvider', libMeadowConnectionPostgreSQL);
						_Fable.serviceManager.instantiateServiceProvider('MeadowPostgreSQLProvider');

						_Fable.MeadowPostgreSQLProvider.connectAsync(
							(pError) =>
							{
								if (pError) return fDone(pError);
								libSchemaPostgreSQL.setConnectionPool(_Fable.MeadowPostgreSQLProvider.pool);

								// Drop test tables first (clean slate)
								_Fable.MeadowPostgreSQLProvider.pool.query('DROP TABLE IF EXISTS "IntrospAnimal", "IntrospAnimalIdx", "IntrospAnimalCustIdx"',
									(pDropError) =>
									{
										if (pDropError) return fDone(pDropError);

										let tmpSchema = { Tables: [_IntrospectAnimalSchema, _IntrospectAnimalIndexedSchema, _IntrospectAnimalCustomIdxSchema] };
										libSchemaPostgreSQL.createTables(tmpSchema,
											(pCreateError) =>
											{
												if (pCreateError) return fDone(pCreateError);
												libSchemaPostgreSQL.createAllIndices(tmpSchema,
													(pIdxError) =>
													{
														return fDone(pIdxError);
													});
											});
									});
							});
					});

				test
				(
					'listTables returns tables including introspection test tables',
					(fDone) =>
					{
						libSchemaPostgreSQL.listTables(
							(pError, pTables) =>
							{
								Expect(pError).to.not.exist;
								Expect(pTables).to.be.an('array');
								Expect(pTables).to.include('IntrospAnimal');
								Expect(pTables).to.include('IntrospAnimalIdx');
								Expect(pTables).to.include('IntrospAnimalCustIdx');
								return fDone();
							});
					}
				);

				test
				(
					'introspectTableColumns returns column definitions for IntrospAnimal',
					(fDone) =>
					{
						libSchemaPostgreSQL.introspectTableColumns('IntrospAnimal',
							(pError, pColumns) =>
							{
								Expect(pError).to.not.exist;
								Expect(pColumns).to.be.an('array');
								Expect(pColumns.length).to.equal(9);

								// ID column (SERIAL)
								Expect(pColumns[0].Column).to.equal('IDIntrospAnimal');
								Expect(pColumns[0].DataType).to.equal('ID');

								// GUID column (VARCHAR with GUID in name)
								Expect(pColumns[1].Column).to.equal('GUIDIntrospAnimal');
								Expect(pColumns[1].DataType).to.equal('GUID');

								// String column (VARCHAR)
								Expect(pColumns[2].Column).to.equal('Name');
								Expect(pColumns[2].DataType).to.equal('String');

								// Text column
								Expect(pColumns[3].Column).to.equal('Description');
								Expect(pColumns[3].DataType).to.equal('Text');

								// Decimal column
								Expect(pColumns[4].Column).to.equal('Cost');
								Expect(pColumns[4].DataType).to.equal('Decimal');

								// Numeric column (INTEGER)
								Expect(pColumns[5].Column).to.equal('Age');
								Expect(pColumns[5].DataType).to.equal('Numeric');

								// DateTime column (TIMESTAMP)
								Expect(pColumns[6].Column).to.equal('Birthday');
								Expect(pColumns[6].DataType).to.equal('DateTime');

								// Boolean column (native BOOLEAN)
								Expect(pColumns[7].Column).to.equal('Active');
								Expect(pColumns[7].DataType).to.equal('Boolean');

								// ForeignKey column (no actual FK constraint, detected as Numeric)
								Expect(pColumns[8].Column).to.equal('IDFarm');
								Expect(pColumns[8].DataType).to.equal('Numeric');

								return fDone();
							});
					}
				);

				test
				(
					'introspectTableIndices returns index definitions for IntrospAnimal',
					(fDone) =>
					{
						libSchemaPostgreSQL.introspectTableIndices('IntrospAnimal',
							(pError, pIndices) =>
							{
								Expect(pError).to.not.exist;
								Expect(pIndices).to.be.an('array');
								Expect(pIndices.length).to.equal(2);

								let tmpNames = pIndices.map((pIdx) => { return pIdx.Name; });
								Expect(tmpNames).to.include('AK_M_GUIDIntrospAnimal');
								Expect(tmpNames).to.include('IX_M_IDFarm');

								let tmpGUIDIndex = pIndices.find((pIdx) => { return pIdx.Name === 'AK_M_GUIDIntrospAnimal'; });
								Expect(tmpGUIDIndex.Unique).to.equal(true);
								Expect(tmpGUIDIndex.Columns).to.deep.equal(['GUIDIntrospAnimal']);

								return fDone();
							});
					}
				);

				test
				(
					'introspectTableForeignKeys returns empty for table without FK constraints',
					(fDone) =>
					{
						libSchemaPostgreSQL.introspectTableForeignKeys('IntrospAnimal',
							(pError, pFKs) =>
							{
								Expect(pError).to.not.exist;
								Expect(pFKs).to.be.an('array');
								Expect(pFKs.length).to.equal(0);
								return fDone();
							});
					}
				);

				test
				(
					'introspectTableSchema combines columns and indices for IntrospAnimalIdx',
					(fDone) =>
					{
						libSchemaPostgreSQL.introspectTableSchema('IntrospAnimalIdx',
							(pError, pSchema) =>
							{
								Expect(pError).to.not.exist;
								Expect(pSchema).to.be.an('object');
								Expect(pSchema.TableName).to.equal('IntrospAnimalIdx');
								Expect(pSchema.Columns).to.be.an('array');

								// Check that column-level Indexed properties are folded in
								let tmpNameCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'Name'; });
								Expect(tmpNameCol.Indexed).to.equal(true);
								Expect(tmpNameCol).to.not.have.property('IndexName');

								let tmpTagCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'TagNumber'; });
								Expect(tmpTagCol.Indexed).to.equal('unique');
								Expect(tmpTagCol).to.not.have.property('IndexName');

								return fDone();
							});
					}
				);

				test
				(
					'introspectTableSchema preserves IndexName for custom-named indices',
					(fDone) =>
					{
						libSchemaPostgreSQL.introspectTableSchema('IntrospAnimalCustIdx',
							(pError, pSchema) =>
							{
								Expect(pError).to.not.exist;
								Expect(pSchema.TableName).to.equal('IntrospAnimalCustIdx');

								// Name has custom IndexName IX_Custom_Name
								let tmpNameCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'Name'; });
								Expect(tmpNameCol.Indexed).to.equal(true);
								Expect(tmpNameCol.IndexName).to.equal('IX_Custom_Name');

								// TagNumber has custom IndexName UQ_IntrospAnimalCustIdx_Tag
								let tmpTagCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'TagNumber'; });
								Expect(tmpTagCol.Indexed).to.equal('unique');
								Expect(tmpTagCol.IndexName).to.equal('UQ_IntrospAnimalCustIdx_Tag');

								// Weight has auto-generated name - no IndexName
								let tmpWeightCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'Weight'; });
								Expect(tmpWeightCol.Indexed).to.equal(true);
								Expect(tmpWeightCol).to.not.have.property('IndexName');

								return fDone();
							});
					}
				);

				test
				(
					'introspectDatabaseSchema returns schemas for all tables',
					(fDone) =>
					{
						libSchemaPostgreSQL.introspectDatabaseSchema(
							(pError, pSchema) =>
							{
								Expect(pError).to.not.exist;
								Expect(pSchema).to.be.an('object');
								Expect(pSchema.Tables).to.be.an('array');
								Expect(pSchema.Tables.length).to.be.greaterThan(0);

								let tmpTableNames = pSchema.Tables.map((pT) => { return pT.TableName; });
								Expect(tmpTableNames).to.include('IntrospAnimal');
								Expect(tmpTableNames).to.include('IntrospAnimalIdx');
								Expect(tmpTableNames).to.include('IntrospAnimalCustIdx');

								return fDone();
							});
					}
				);

				test
				(
					'generateMeadowPackageFromTable produces Meadow package JSON',
					(fDone) =>
					{
						libSchemaPostgreSQL.generateMeadowPackageFromTable('IntrospAnimal',
							(pError, pPackage) =>
							{
								Expect(pError).to.not.exist;
								Expect(pPackage).to.be.an('object');
								Expect(pPackage.Scope).to.equal('IntrospAnimal');
								Expect(pPackage.DefaultIdentifier).to.equal('IDIntrospAnimal');
								Expect(pPackage.Schema).to.be.an('array');
								Expect(pPackage.DefaultObject).to.be.an('object');

								// Verify schema entries
								let tmpIDEntry = pPackage.Schema.find((pEntry) => { return pEntry.Column === 'IDIntrospAnimal'; });
								Expect(tmpIDEntry.Type).to.equal('AutoIdentity');

								let tmpGUIDEntry = pPackage.Schema.find((pEntry) => { return pEntry.Column === 'GUIDIntrospAnimal'; });
								Expect(tmpGUIDEntry.Type).to.equal('AutoGUID');

								let tmpNameEntry = pPackage.Schema.find((pEntry) => { return pEntry.Column === 'Name'; });
								Expect(tmpNameEntry.Type).to.equal('String');

								// Verify default object
								Expect(pPackage.DefaultObject.IDIntrospAnimal).to.equal(0);
								Expect(pPackage.DefaultObject.GUIDIntrospAnimal).to.equal('');
								Expect(pPackage.DefaultObject.Name).to.equal('');

								return fDone();
							});
					}
				);

				test
				(
					'round-trip: introspect IntrospAnimalIdx and regenerate matching indices',
					(fDone) =>
					{
						libSchemaPostgreSQL.introspectTableSchema('IntrospAnimalIdx',
							(pError, pSchema) =>
							{
								Expect(pError).to.not.exist;

								// Use the introspected schema to generate index definitions
								let tmpIndices = libSchemaPostgreSQL.getIndexDefinitionsFromSchema(pSchema);

								// The original IntrospAnimalIdx had:
								//   AK_M_GUIDIntrospAnimalIdx (GUID auto)
								//   IX_M_T_IntrospAnimalIdx_C_Name (Indexed: true)
								//   AK_M_T_IntrospAnimalIdx_C_TagNumber (Indexed: 'unique')
								//   IX_M_IDOwner (FK auto)
								let tmpNames = tmpIndices.map((pIdx) => { return pIdx.Name; });
								Expect(tmpNames).to.include('AK_M_GUIDIntrospAnimalIdx');
								Expect(tmpNames).to.include('IX_M_T_IntrospAnimalIdx_C_Name');
								Expect(tmpNames).to.include('AK_M_T_IntrospAnimalIdx_C_TagNumber');
								Expect(tmpNames).to.include('IX_M_IDOwner');

								return fDone();
							});
					}
				);

				test
				(
					'round-trip: introspect IntrospAnimalCustIdx and regenerate matching index names',
					(fDone) =>
					{
						libSchemaPostgreSQL.introspectTableSchema('IntrospAnimalCustIdx',
							(pError, pSchema) =>
							{
								Expect(pError).to.not.exist;

								// Use the introspected schema to generate index definitions
								let tmpIndices = libSchemaPostgreSQL.getIndexDefinitionsFromSchema(pSchema);

								// The original IntrospAnimalCustIdx had:
								//   AK_M_GUIDIntrospAnimalCustIdx (GUID auto)
								//   IX_Custom_Name (IndexName override)
								//   UQ_IntrospAnimalCustIdx_Tag (IndexName override, unique)
								//   IX_M_T_IntrospAnimalCustIdx_C_Weight (auto)
								//   IX_M_IDTrainer (FK auto)
								let tmpNames = tmpIndices.map((pIdx) => { return pIdx.Name; });
								Expect(tmpNames).to.include('AK_M_GUIDIntrospAnimalCustIdx');
								Expect(tmpNames).to.include('IX_Custom_Name');
								Expect(tmpNames).to.include('UQ_IntrospAnimalCustIdx_Tag');
								Expect(tmpNames).to.include('IX_M_T_IntrospAnimalCustIdx_C_Weight');
								Expect(tmpNames).to.include('IX_M_IDTrainer');

								return fDone();
							});
					}
				);
			}
		);

		suite
		(
			'Chinook Database Introspection',
			()=>
			{
				let _Fable = null;
				let libSchemaPostgreSQL = null;

				setup(
					(fDone) =>
					{
						_Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowSchemaPostgreSQL', libMeadowSchemaPostgreSQL);
						libSchemaPostgreSQL = _Fable.serviceManager.instantiateServiceProvider('MeadowSchemaPostgreSQL');
						_Fable.serviceManager.addServiceType('MeadowPostgreSQLProvider', libMeadowConnectionPostgreSQL);
						_Fable.serviceManager.instantiateServiceProvider('MeadowPostgreSQLProvider');
						_Fable.MeadowPostgreSQLProvider.connectAsync(
							(pError) =>
							{
								if (pError) return fDone(pError);
								libSchemaPostgreSQL.setConnectionPool(_Fable.MeadowPostgreSQLProvider.pool);
								return fDone();
							});
					});

				test
				(
					'listTables includes all 11 Chinook tables',
					(fDone) =>
					{
						libSchemaPostgreSQL.listTables(
							(pError, pTables) =>
							{
								Expect(pError).to.not.exist;
								Expect(pTables).to.be.an('array');

								let tmpChinookTables = ['album', 'artist', 'customer', 'employee',
									'genre', 'invoice', 'invoice_line', 'media_type',
									'playlist', 'playlist_track', 'track'];

								tmpChinookTables.forEach(
									(pTableName) =>
									{
										Expect(pTables).to.include(pTableName);
									});

								return fDone();
							});
					}
				);

				test
				(
					'introspectTableColumns on track detects all 9 columns with correct types',
					(fDone) =>
					{
						libSchemaPostgreSQL.introspectTableColumns('track',
							(pError, pColumns) =>
							{
								Expect(pError).to.not.exist;
								Expect(pColumns).to.be.an('array');
								Expect(pColumns.length).to.equal(9);

								let tmpTrackId = pColumns.find((pCol) => { return pCol.Column === 'track_id'; });
								Expect(tmpTrackId.DataType).to.equal('ID');

								let tmpName = pColumns.find((pCol) => { return pCol.Column === 'name'; });
								Expect(tmpName.DataType).to.equal('String');

								let tmpUnitPrice = pColumns.find((pCol) => { return pCol.Column === 'unit_price'; });
								Expect(tmpUnitPrice.DataType).to.equal('Decimal');

								let tmpMilliseconds = pColumns.find((pCol) => { return pCol.Column === 'milliseconds'; });
								Expect(tmpMilliseconds.DataType).to.equal('Numeric');

								return fDone();
							});
					}
				);

				test
				(
					'introspectTableColumns on employee detects 15 columns',
					(fDone) =>
					{
						libSchemaPostgreSQL.introspectTableColumns('employee',
							(pError, pColumns) =>
							{
								Expect(pError).to.not.exist;
								Expect(pColumns.length).to.equal(15);

								let tmpEmployeeId = pColumns.find((pCol) => { return pCol.Column === 'employee_id'; });
								Expect(tmpEmployeeId.DataType).to.equal('ID');

								let tmpBirthDate = pColumns.find((pCol) => { return pCol.Column === 'birth_date'; });
								Expect(tmpBirthDate.DataType).to.equal('DateTime');

								return fDone();
							});
					}
				);

				test
				(
					'introspectTableForeignKeys on track detects 3 FK relationships',
					(fDone) =>
					{
						libSchemaPostgreSQL.introspectTableForeignKeys('track',
							(pError, pFKs) =>
							{
								Expect(pError).to.not.exist;
								Expect(pFKs).to.be.an('array');
								Expect(pFKs.length).to.equal(3);

								let tmpAlbumFK = pFKs.find((pFK) => { return pFK.Column === 'album_id'; });
								Expect(tmpAlbumFK).to.exist;
								Expect(tmpAlbumFK.ReferencedTable).to.equal('album');
								Expect(tmpAlbumFK.ReferencedColumn).to.equal('album_id');

								let tmpMediaTypeFK = pFKs.find((pFK) => { return pFK.Column === 'media_type_id'; });
								Expect(tmpMediaTypeFK).to.exist;
								Expect(tmpMediaTypeFK.ReferencedTable).to.equal('media_type');

								let tmpGenreFK = pFKs.find((pFK) => { return pFK.Column === 'genre_id'; });
								Expect(tmpGenreFK).to.exist;
								Expect(tmpGenreFK.ReferencedTable).to.equal('genre');

								return fDone();
							});
					}
				);

				test
				(
					'introspectTableForeignKeys on employee detects self-referential FK',
					(fDone) =>
					{
						libSchemaPostgreSQL.introspectTableForeignKeys('employee',
							(pError, pFKs) =>
							{
								Expect(pError).to.not.exist;
								Expect(pFKs).to.be.an('array');
								Expect(pFKs.length).to.equal(1);

								Expect(pFKs[0].Column).to.equal('reports_to');
								Expect(pFKs[0].ReferencedTable).to.equal('employee');
								Expect(pFKs[0].ReferencedColumn).to.equal('employee_id');

								return fDone();
							});
					}
				);

				test
				(
					'introspectTableForeignKeys on playlist_track detects 2 FKs',
					(fDone) =>
					{
						libSchemaPostgreSQL.introspectTableForeignKeys('playlist_track',
							(pError, pFKs) =>
							{
								Expect(pError).to.not.exist;
								Expect(pFKs).to.be.an('array');
								Expect(pFKs.length).to.equal(2);

								let tmpPlaylistFK = pFKs.find((pFK) => { return pFK.Column === 'playlist_id'; });
								Expect(tmpPlaylistFK).to.exist;
								Expect(tmpPlaylistFK.ReferencedTable).to.equal('playlist');

								let tmpTrackFK = pFKs.find((pFK) => { return pFK.Column === 'track_id'; });
								Expect(tmpTrackFK).to.exist;
								Expect(tmpTrackFK.ReferencedTable).to.equal('track');

								return fDone();
							});
					}
				);

				test
				(
					'introspectTableSchema on track combines columns with FK detection',
					(fDone) =>
					{
						libSchemaPostgreSQL.introspectTableSchema('track',
							(pError, pSchema) =>
							{
								Expect(pError).to.not.exist;
								Expect(pSchema.TableName).to.equal('track');
								Expect(pSchema.ForeignKeys.length).to.equal(3);

								let tmpAlbumIdCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'album_id'; });
								Expect(tmpAlbumIdCol.DataType).to.equal('ForeignKey');

								let tmpMediaTypeIdCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'media_type_id'; });
								Expect(tmpMediaTypeIdCol.DataType).to.equal('ForeignKey');

								let tmpGenreIdCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'genre_id'; });
								Expect(tmpGenreIdCol.DataType).to.equal('ForeignKey');

								return fDone();
							});
					}
				);

				test
				(
					'introspectDatabaseSchema includes all Chinook tables',
					(fDone) =>
					{
						libSchemaPostgreSQL.introspectDatabaseSchema(
							(pError, pSchema) =>
							{
								Expect(pError).to.not.exist;
								Expect(pSchema.Tables).to.be.an('array');

								let tmpTableNames = pSchema.Tables.map((pT) => { return pT.TableName; });
								Expect(tmpTableNames).to.include('track');
								Expect(tmpTableNames).to.include('album');
								Expect(tmpTableNames).to.include('artist');
								Expect(tmpTableNames).to.include('employee');
								Expect(tmpTableNames).to.include('customer');
								Expect(tmpTableNames).to.include('invoice');
								Expect(tmpTableNames).to.include('invoice_line');
								Expect(tmpTableNames).to.include('playlist_track');

								let tmpTrack = pSchema.Tables.find((pT) => { return pT.TableName === 'track'; });
								Expect(tmpTrack.ForeignKeys.length).to.equal(3);

								return fDone();
							});
					}
				);

				test
				(
					'generateMeadowPackageFromTable on album produces valid package',
					(fDone) =>
					{
						libSchemaPostgreSQL.generateMeadowPackageFromTable('album',
							(pError, pPackage) =>
							{
								Expect(pError).to.not.exist;
								Expect(pPackage.Scope).to.equal('album');
								Expect(pPackage.DefaultIdentifier).to.equal('album_id');
								Expect(pPackage.Schema).to.be.an('array');
								Expect(pPackage.DefaultObject).to.be.an('object');

								let tmpIDEntry = pPackage.Schema.find((pEntry) => { return pEntry.Column === 'album_id'; });
								Expect(tmpIDEntry.Type).to.equal('AutoIdentity');

								let tmpTitleEntry = pPackage.Schema.find((pEntry) => { return pEntry.Column === 'title'; });
								Expect(tmpTitleEntry.Type).to.equal('String');

								return fDone();
							});
					}
				);

				test
				(
					'generateMeadowPackageFromTable on track handles FKs and Decimal',
					(fDone) =>
					{
						libSchemaPostgreSQL.generateMeadowPackageFromTable('track',
							(pError, pPackage) =>
							{
								Expect(pError).to.not.exist;
								Expect(pPackage.Scope).to.equal('track');
								Expect(pPackage.DefaultIdentifier).to.equal('track_id');

								let tmpUnitPriceEntry = pPackage.Schema.find((pEntry) => { return pEntry.Column === 'unit_price'; });
								Expect(tmpUnitPriceEntry).to.exist;

								return fDone();
							});
					}
				);
			}
		);
	}
);
