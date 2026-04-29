/**
 * Connection form schema for PostgreSQL.
 *
 * Consumed by meadow-connection-manager#getProviderFormSchema('PostgreSQL').
 * Pure data — safe to require() even when the pg driver is not installed.
 * See Meadow-Connection-MySQL-FormSchema.js for the full field contract.
 */
'use strict';

module.exports =
{
	Provider:    'PostgreSQL',
	DisplayName: 'PostgreSQL',
	Description: 'Connect to a PostgreSQL server.',
	Fields:
	[
		{ Name: 'host',     Label: 'Host',                  Type: 'String',   Default: '127.0.0.1', Required: true, Placeholder: '127.0.0.1' },
		{ Name: 'port',     Label: 'Port',                  Type: 'Number',   Default: 5432,        Required: true, Min: 1, Max: 65535 },
		{ Name: 'user',     Label: 'User',                  Type: 'String',   Default: 'postgres',  Required: true },
		{ Name: 'password', Label: 'Password',              Type: 'Password' },
		{ Name: 'database', Label: 'Database',              Type: 'String',   Placeholder: 'meadow_clone' },
		{ Name: 'max',      Label: 'Connection Pool Limit', Type: 'Number',   Default: 10, Min: 1, Group: 'Advanced' }
	]
};
