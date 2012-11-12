// Config

module.exports = {
	
	host: 'myblogname.net',

	name: 'Project Open Content',
	
	displayPort: 8088,

	listenPort: 8088,

	securePort: 4438,
	
	googleID: 'YOUR GOOGLE ID',
	
	postmarkAPIKey: 'YOUR POSTMARK API KEY',

	// the default key for the HTTPS server
	pfxPath: 'keys/projectopencontent.org.pfx',

	pfxPass: '',

	// all of the supported hosts
	hosts: ['myblogname.net'],

	// the directory where each hosts .pfx file can be found
	keyDir: 'keys',

	defaultRowLimit: 2,
	
	maxRowLimit: 100,
	
	reservedPathFirstTerms: ['login','pages','edit','preview']
}