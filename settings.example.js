// Config
var keyDir = 'keys';

module.exports = {
	
	host: 'myblogname.net',

	name: 'Project Open Content',
	
	displayPort: 8088,
	displaySecure: true,

	listenPort: 8088,

	securePort: 4438,
	
	googleID: 'YOUR GOOGLE ID',
	
	postmarkAPIKey: 'YOUR POSTMARK API KEY',

	pfx: keyDir+'/projectopencontent.org.pfx',
	pfxPassword: '',

	gaKey: 'UA-34672340-1', // Your Google Analytics key

	// all of the supported hosts.
	hosts:[
		// if a port is set, proxy to the port.
		{
		 name: 'markshow.io',
		 port:8888,
		 pfx: keyDir+'/markshow.pfx',
		 password: '' 
		},
		// .. otherwise proxy to the http server
		{ name: 'test.net', pfx: keyDir+'/test.net.pfx', password: '' },
	],

	// the directory where each hosts .pfx file can be found
	keyDir: keyDir,

	defaultRowLimit: 2,
	
	maxRowLimit: 100,

	meta: {
		author: 'Your name here',
		description: 'A description of my blog for the meta tag'
	}
}