module Lazy {
	const loaded = {};
	export function load(url: string): Promise<unknown> {
		if ((loaded[url] != undefined)) {
			return loaded[url];
		}
		const head = document.head;
		const script = document.createElement("script");
		script.id = url;
		script.async = false;
		head.appendChild(script);
		const p = new Promise((resolve, reject) => {
			script.onload = async () => {
				await sleep(1000);
				resolve()
				loaded[url] = true;
			};
		});
		loaded[url] = p;
		script.type = "text/javascript";
		script.src = url;
		return p;
	}
	// export function load(url:string): Promise<unknown> {
	// 	return eval("import('" + url + "')");
	// }
}
