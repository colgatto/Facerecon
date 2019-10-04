const Facerecon = require('.');

let fr = new Facerecon({
	debug: __dirname + '/img/debug',
	threshold: 0.65
});

fr.init().then( () => {
	fr.findAndCopy(__dirname + '/img/input', __dirname + '/img/output').then( () => {
		console.log('Done!');
	}).catch(console.error);
}).catch(console.error);