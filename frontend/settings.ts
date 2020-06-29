module Settings {

	export interface SettingItem {
		value: any;
		description: string;
		toDomElement(): HTMLElement;
	}
	
	function getCookie(cname) {
		const name = cname + "=";
		const decodedCookie = decodeURIComponent(document.cookie);
		const ca = decodedCookie.split(';');
		for(let i = 0; i <ca.length; i++) {
			let c = ca[i];
			while (c.charAt(0) == ' ') {
				c = c.substring(1);
			}
			if (c.indexOf(name) == 0) {
				return c.substring(name.length, c.length);
			}
		}
		return "";
	}

	function setCookie(cname, cvalue, exdays) {
		const d = new Date();
		d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
		const expires = "expires="+d.toUTCString();
		document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
	}


	function generateID(){
		return Math.random().toString(36).substring(2) + Date.now().toString(36)
	}

	export function getID() {
		const id = getCookie("id");
		if (id !== "")
			return id;
		const new_id = generateID();
		setCookie("id", new_id, 365);
		return new_id;
	}

	class BoolSetting implements SettingItem {
		value: boolean;
		description: string;
		toDomElement(): HTMLElement {
			const checkbox = document.createElement("input");
			checkbox.checked = this.value;
			checkbox.type = "checkbox";
			checkbox.addEventListener("click", () => {
				this.value = checkbox.checked;
			});
			return checkbox
		}
		constructor(description: string, val: boolean) {
			this.description = description;
			this.value = val;
		}
	}

	class StringSetting implements SettingItem {
		value: string;
		description: string;
		toDomElement():HTMLElement {
			const textbox = document.createElement("input");
			textbox.value = this.value;
			textbox.addEventListener("keyup", () => {
				this.value = textbox.value;
			});
			return textbox;
		}
		constructor(desc: string, value: string) {
			this.description = desc;
			this.value = value;
		}
	}
	
	export class SettingStore {
		prependDefaultTripcode: BoolSetting;
		defaultTripcode: StringSetting;
		previewMessageOnLinkHover: BoolSetting;
		relativeTimeStamp: BoolSetting;
		compactView: BoolSetting;
		appendTimeStamp: BoolSetting;
		enableImageOverlay: BoolSetting;
		constructor() {
			this.prependDefaultTripcode = new BoolSetting("When clicking 'Post', add the default tripcode to the beginning of the post.", true);
			this.previewMessageOnLinkHover = new BoolSetting("When hovering links and backlinks with the mouse, display the message that is getting pointed to.", true);
			this.defaultTripcode = new StringSetting("When automatically prepending a tripcode, use this one.", generateID());
			this.relativeTimeStamp = new BoolSetting("Display the timestamps of the posts (if any) relatively to the current date & time.", true);
			this.compactView = new BoolSetting("Display the messages in a more compact fashion. Uses the empty horizontal space.", false);
			this.appendTimeStamp = new BoolSetting("When posting a message, append a timestamp.", true);
			this.enableImageOverlay = new BoolSetting("When clicking on an image, use an overlay to view the image instead of maximizing the image to it's original size.", true);
		}
	}

	function fixSettingStore(s:SettingStore) {
		const out = new SettingStore();

		for (const key in s) {
			if (out[key]) out[key].value = s[key]
		}
		return out;
	}

	export function getSettingStore(): SettingStore {
		const base64encoded = getCookie("settings");
		if (base64encoded == "") {
			const s = new SettingStore();
			setSettingStore(s);
			return s;
		}
		const json = atob(base64encoded);
		const struct = JSON.parse(json);
		return fixSettingStore(struct);
	}

	export function setSettingStore(s: SettingStore) {
		const settings = s as any;
		for (const key in settings) {
			settings[key] = settings[key].value;
		}
		const json = JSON.stringify(s);
		const base64 = btoa(json);
		setCookie("settings", base64, 365);
	}

}
