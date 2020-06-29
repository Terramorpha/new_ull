function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

const container = document.getElementById("container");


const settings = Settings.getSettingStore();

function renderSettings(settings: Settings.SettingStore, container: HTMLElement) {
	for (const key in settings) {
		const div = document.createElement("div");
		const p = document.createElement("p");
		p.innerText = settings[key].description;
		div.appendChild(p);
		div.appendChild(document.createElement("br"));
		div.classList.add("settingcell");
		div.appendChild(settings[key].toDomElement());
		container.appendChild(div);		
	}
}


renderSettings(settings, container);
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
