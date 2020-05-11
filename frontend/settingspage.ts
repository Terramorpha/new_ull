function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

const container = document.getElementById("container");


const settings = Settings.getSettingStore();

for (let key in settings) {
	const div = document.createElement("div");
	const p = document.createElement("p");
	p.innerText = key;
	div.appendChild(p);
	div.classList.add("settingcell");
	const val = settings[key];
	if (typeof(val) == "string") {
		const textbox = document.createElement("input");
		textbox.value = val;
		div.appendChild(textbox);
		textbox.addEventListener("keyup", () => {
			settings[key] = textbox.value;
		});
	}else if (typeof(val) == "boolean") {
		const checkbox = document.createElement("input");
		checkbox.checked = val;
		checkbox.type = "checkbox";
		checkbox.addEventListener("click", () => {
			settings[key] = checkbox.checked;
		});
		div.appendChild(checkbox);
	}else if (typeof(val) == "number") {
		const n = document.createElement("input");
		n.type = "number";
		n.value = val as any;
		div.appendChild(n);
	}


	container.appendChild(div);
	
}
const savebutton = document.getElementById("savebutton");
savebutton.addEventListener("click", () => {
	console.log(settings);
	Settings.setSettingStore(settings);
	const oldinnertext = savebutton.innerText;
	savebutton.innerText = "Saved";
	sleep(1000).then(() => {
		savebutton.innerText = oldinnertext;		
	});
});
