class PostBranch {
	parents: string[];
	constructor() {
		this.parents = [];
	}
	clone(): PostBranch {
		const o = new PostBranch();
		this.parents.forEach((v) => o.parents.push(v));
		return o;
	}
}


function render(canvas: HTMLCanvasElement, tree: Map<string, string[]>) {
	//console.log("tree:", tree);
	const ctx = canvas.getContext("2d");

	//to fix blurry image
	canvas.width = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;
	const width = canvas.width;
	const height = canvas.height;

	//ctx.beginPath();
	//ctx.rect(0, 0, canvas.width, canvas.height);
	//ctx.fillStyle = "#FFFFFF00";
	//ctx.fill();
	ctx.strokeStyle = "#FFFFFF";
	const layers = [];

	let copy = {};
	for (const key in tree) copy[key] = (tree[key] as string[]).map((v) => v);

	let parents = {};
	// console.log(copy.branches);
	// remove the links that are unresolved
	for (const key in copy) {
		//console.log("br", copy.branches);
		copy[key] = (copy[key] as string[]).filter((val) => copy[val] != null);
	}

	while (Object.keys(copy).length !== 0) {
		parents = {};
		for (const key in copy) {
			if (copy[key].length === 0) {
				parents[key] = copy[key];
				delete copy[key];
			}
		}
		for (const key in copy) {
			copy[key] = (copy[key] as string[]).filter((v) => parents[v] == null);
		}
		layers.push(parents);
	}
	//console.log("layers:", layers);


	const positions = {};
	layers.forEach((layer, index) => {
		const y_offset = (height / (layers.length + 1)) * (index + 1);
		const x_items = Object.keys(layer).length;
		let i = 1;
		for (const key in layer) {
			const x_offset = (width / (x_items + 1)) * i;
			positions[key] = [x_offset, y_offset];
			i++;
		}
	})
	//console.log("layers:", layers);
	//console.log("positions:", positions);
	let secondCopy = {};
	for (const key in tree) secondCopy[key] = (tree[key] as string[]).map((v) => v);

	for (const key in secondCopy)
		secondCopy[key] = (secondCopy[key] as string[]).filter((val) => secondCopy[val] != null);
	//console.log("second copy:", secondCopy);

	for (const key in secondCopy) {
		const pos = positions[key];
		const obj: string[] = secondCopy[key];
		//console.log("obj", obj);
		obj.forEach(parent => {
			const parentpos = positions[parent];
			ctx.beginPath();
			ctx.moveTo(pos[0], pos[1]);
			//ctx.lineTo(parentpos[0], parentpos[1]);
			ctx.bezierCurveTo(pos[0], parentpos[1], parentpos[0], pos[1], parentpos[0], parentpos[1]);
			ctx.stroke();
			//console.log("drew from", pos, "to", parentpos);
		})
	}
	//each post is a circle

	ctx.fillStyle = getComputedStyle(document.documentElement)
		.getPropertyValue('--link-color');
	const fontsize = 13;
	ctx.font = fontsize + "px monospace";
	for (const key in positions) {
		const pos = positions[key];
		//ctx.moveTo(pos[0], pos[1]);
		//ctx.beginPath();
		//ctx.arc(pos[0], pos[1], 4, 0, 2 * Math.PI);
		//ctx.stroke();
		const hash = shortHash(key)
		const m = ctx.measureText(hash);
		ctx.fillText(hash, pos[0] - (m.width / 2), pos[1]);
	}
}
