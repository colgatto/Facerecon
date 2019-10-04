const Facerecon = require('..');

let fr = new Facerecon({
	debug: __dirname + '/img/debug'
});

fr.init().then( () => {
	fr.loader(__dirname + '/img/knowPeople').then( () => {
		console.log('Done!');
	}).catch(console.error);
}).catch(console.error);