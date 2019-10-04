const Facerecon = require('..');

let fr = new Facerecon({
	debug: __dirname + '/img/debug'
});

fr.init().then( () => {
	fr.detectFaces(__dirname + '/img/input/big-bang.jpg').then( (detected) => {
		let n = detected.length;
		console.log(n + ' face' + ( n == 1 ? '' : 's'));
	}).catch(console.error);
}).catch(console.error);