"use strict";

const faceapi = require('face-api.js');
const fetch = require('node-fetch');
const canvas = require('canvas');
const { Canvas, Image, ImageData } = canvas;
const fs = require('fs');

faceapi.env.monkeyPatch({
	fetch, Canvas, Image, ImageData
	//readFile: x => fs.readFile(x)
});

const getTime = () => (new Date()).toLocaleString().replace(/,/g,'').replace(/[: \/\.\-]+/g, '_');

const hasSameValues = (a,b) => {
	if(a.length != b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if(a[i] != b[i])
			return false;
	}
	return true;
}

const defaultOptions = {
	json_know_path:  __dirname + '/data/know_descriptors.json',
	models_path: __dirname + '/models',
	debug: false,
	threshold: 0.6,
	verbose: false
};

class Facerecon{

	constructor(options = {}){
		this.options = Object.assign({}, defaultOptions, options);
	}

	init(){
		return new Promise( async (resolve, reject) => {
			try{
				await faceapi.nets.ssdMobilenetv1.loadFromDisk(this.options.models_path);
				await faceapi.nets.faceLandmark68Net.loadFromDisk(this.options.models_path);
				await faceapi.nets.faceRecognitionNet.loadFromDisk(this.options.models_path);
			}catch(e){
				reject(e);
			}
			resolve();
		});
	}

	matcherFromJson(){
		const labelData = JSON.parse(fs.readFileSync(this.options.json_know_path));
		const labeledDescriptors = [];
		for (let i = 0; i < labelData.length; i++) {
			labeledDescriptors.push(new faceapi.LabeledFaceDescriptors( labelData[i].label, labelData[i].descriptors.map(x=>new Float32Array(x)) ) );
		}
		return new faceapi.FaceMatcher(labeledDescriptors, this.options.threshold);
	}

	getKnow(){
		return this.matcherFromJson(this.options.json_know_path);
	};

	matchImage(faceMatcher, img_path){
		return new Promise( async (resolve, reject) => {
			try{
				const image = await canvas.loadImage(img_path);
				const input_detections = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors();

				let best_out;
				let full_out;

				if(this.options.debug){
					best_out = faceapi.createCanvasFromMedia(image);
					full_out = faceapi.createCanvasFromMedia(image);
				}

				const result =  input_detections.map(imp => {

					const best = faceMatcher.findBestMatch(imp.descriptor);
					const full = faceMatcher.matchDescriptor(imp.descriptor);

					if(this.options.debug){
						const best_box = new faceapi.draw.DrawBox(imp.detection.box, { label: best.toString() });
						best_box.draw(best_out);
						const full_box = new faceapi.draw.DrawBox(imp.detection.box, { label: full.toString() });
						full_box.draw(full_out);
					}
					
					return{
						best: best._label != 'unknown' ? best : false,
						full
					};
				});

				if(this.options.debug){
					fs.writeFileSync(this.options.debug + '/best_images_' + getTime() + '.jpg', best_out.toBuffer('image/jpeg'));
					fs.writeFileSync(this.options.debug + '/full_images_' + getTime() + '.jpg', full_out.toBuffer('image/jpeg'));
				}

				resolve( result );
			}catch(e){
				reject(e);
			}
		});
	}

	loader(base_know_path){
		return new Promise(async (resolve, reject) => {
			let labeledDescriptors = [];

			try{
				//LOAD KNOW IMG
				let kn = fs.readdirSync(base_know_path);

				if(!fs.existsSync(this.options.json_know_path)) fs.writeFileSync(this.options.json_know_path, '[]');

				labeledDescriptors = JSON.parse(fs.readFileSync(this.options.json_know_path));

				/**/

				for(let i = 0; i < kn.length; i++){
					const know_path = base_know_path + '/' +  kn[i];
					let know = fs.readdirSync(know_path);
					let k_descriptors = [];
					if(this.options.verbose)
						console.log('Load: ' + kn[i]);
					for(let j = 0; j < know.length; j++){
						const img_path = know_path + '/' + know[j];
						const k_img = await canvas.loadImage(img_path);
						const k_detections = await faceapi.detectAllFaces(k_img).withFaceLandmarks().withFaceDescriptors();
						k_descriptors.push(...k_detections.map(x=>x.descriptor));
					}
					let found = false;
					for (let q = 0; q < labeledDescriptors.length; q++) {
						if(labeledDescriptors[q].label == kn[i]){
							labeledDescriptors[q].descriptors.push(...k_descriptors);
							found = true;
						}
					}
					if(!found){
						labeledDescriptors.push({
							label: kn[i],
							descriptors: k_descriptors
						});
					}
				}

				/**/

				//CONVERT TO ARRAY
				labeledDescriptors.map(lb => {
					lb.descriptors = lb.descriptors.map(des => {
						if(des.constructor == Object || des.constructor == Float32Array){
							let arrOut  = [];
							let k_des = Object.keys(des);
							for (let i = 0; i < k_des.length; i++) {
								arrOut[k_des[i]] = des[k_des[i]];
							}
							return arrOut;
						}else{
							return des;
						}
					});
					return lb;
				})

				//PULISCI I DESCRIPTOR DOPPI
				for (let i = 0; i < labeledDescriptors.length; i++) {
					const lb = labeledDescriptors[i];
					const filteredDes = [];
					for (let j = 0; j < lb.descriptors.length - 1; j++) {
						const des1 = lb.descriptors[j];
						let single = true;
						for (let k = j + 1; k < lb.descriptors.length; k++) {
							const des2 = lb.descriptors[k];
							if(hasSameValues(des1, des2)){
								single = false;
								break;
							}
						}
						if(single)
							filteredDes.push(des1);
					}
					labeledDescriptors[i].descriptors = filteredDes;
				}

				fs.writeFileSync(this.options.json_know_path, JSON.stringify(labeledDescriptors, null, 4));

			}catch(e){
				reject(e);
			}
			resolve(labeledDescriptors);
		});
	}

	findAndCopy(from, to){
		return new Promise( async (resolve, reject) => {
			
			let faceMatcher, imgs_path;

			try{
				faceMatcher = getKnow();
				imgs_path = fs.readdirSync(from);
			}catch(e){
				reject(e);
			}

			for (let i = 0; i < imgs_path.length; i++) {
				const img_name = imgs_path[i];
				const img_path = from + '/' + img_name;
				if(this.options.verbose)
					console.log('check ' +  img_name);
				let data;
				try{
					data = await matchImage(faceMatcher, img_path);
				}catch(e){
					if(e.toString().match('Error: Unsupported image type')){
						console.error('\tUnsupported image type');
						continue;
					}else{
						reject(e);
					}
				}
				try{
					for (let j = 0; j < data.length; j++) {
						if(data[j].best){
							let best_path = to + '/' + data[j].best._label;
							if(!fs.existsSync(best_path)) fs.mkdirSync(best_path);
							fs.copyFileSync(img_path, best_path + '/' + getTime() + '_' + img_name);
							if(this.options.verbose)
								console.log('\tfind ' + data[j].best._label);
						}
					}
				}catch(e){
					reject(e);
				}
			}
			resolve();
		});
	}

	detectFaces(img_path){
		return new Promise( async (resolve, reject) => {
			try{
				const image = await canvas.loadImage(img_path);
				const f_det = await faceapi.detectAllFaces(image);
				let deb_image;
				if(this.options.debug){
					deb_image = faceapi.createCanvasFromMedia(image);
					f_det.forEach( imp => {
						const deb_box = new faceapi.draw.DrawBox(imp.box);
						deb_box.draw(deb_image);
					});
					fs.writeFileSync(this.options.debug + '/debug_detect_face_images_' + getTime() + '.jpg', deb_image.toBuffer('image/jpeg'));
				}
				resolve(f_det);
			}catch(e){
				reject(e);
			}
		});
	}
	
	knowList() {
		return JSON.parse(fs.readFileSync(this.options.json_know_path)).map(x=>x.label);
	}
	
}

module.exports = Facerecon;
	