module.exports = {
	apps: [{
		script: 'dist/server.js',
		instances: 'max',
		exec_mode: 'cluster',
		name: 'parkme-server'
	}],
};