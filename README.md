# **Facerecon**

A simplified wrapper for [face-api.js](https://github.com/justadudewhohacks/face-api.js).

## **Install**

```sh
npm install --save facerecon
```

## **Example**

Include and declare new Facerecon Object
```js
const Facerecon = require('facerecon');

let fr = new Facerecon();
```
### First load

Load images of known faces.

Images must be divided into subdirectory for every person, the name of subdirecotry becomes the name of person inside the images. (see [Examples](https://github.com/colgatto/Facerecon/tree/master/Examples))
```js
fr.init().then( () => {
	fr.loader(__dirname + '/img/knowPeople').then( () => {
		console.log('Done!');
	}).catch(console.error);
}).catch(console.error);
```
Now Facerecon has stored data even for future uses. You can declare alternative locations for storage, the default is `'./data/know_descriptors.json'`.

### Organize Photo by known faces

Load all images inside the `'/img/input'` directory, find all known faces and copy them to `'/img/output/KNOW_FACE_NAME'` directories.

`KNOW_FACE_NAME` is created by Facerecon.
```js
fr.init().then( () => {
	fr.findAndCopy(__dirname + '/img/input', __dirname + '/img/output').then( () => {
		console.log('Done!');
	}).catch(console.error);
}).catch(console.error);
```
### Count faces

Count the number of faces inside an image

```js
fr.init().then( () => {
	fr.detectFaces(__dirname + '/img/input/big-bang.jpg').then( (detected) => {
		let n = detected.length;
		console.log(n + ' face' + ( n == 1 ? '' : 's'));
	}).catch(console.error);
}).catch(console.error);
```

## **Options**

If you want to add custom options you can pass them in the declaration
```js
let fr = new Facerecon({
	json_know_path: '/know_face.json', //Default: __dirname + '/data/know_descriptors.json',
	models_path: '/my_models_dir', //Default: __dirname + '/models',
	debug: '/img/debugImages', //Default: false (no debug images)
	threshold: 0.65, //Default: 0.6
	verbose: true //Default: false
});
```