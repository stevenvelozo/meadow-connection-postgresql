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
				"Port": 5432,
				"User": "postgres",
				"Password": "testpassword",
				"Database": "testdb",
				"ConnectionPoolLimit": 20
			}
	});

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
	}
);
