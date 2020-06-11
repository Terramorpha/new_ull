module Settings {
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

	export class SettingStore {
		prependDefaultTripcode: boolean;
		defaultTripcode: string;
		previewMessageOnLinkHover: boolean;
		relativeTimeStamp: boolean;
		compactView: boolean;
		appendTimeStamp: boolean;
		enableImageOverlay: boolean;
		constructor() {
			this.prependDefaultTripcode = true;
			this.previewMessageOnLinkHover = true;
			this.defaultTripcode = generateID();
			this.relativeTimeStamp = true;
			this.compactView = false;
			this.appendTimeStamp = true;
			this.enableImageOverlay = true;
		}
	}

	function fixSettingStore(s:SettingStore) {
		const comparedTo = new SettingStore();

		for (const key in comparedTo) {
			if (s[key] === undefined)
				s[key] = comparedTo[key];
		}
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
		fixSettingStore(struct);
		return struct;
	}

	export function setSettingStore(s: SettingStore) {
		const json = JSON.stringify(s);
		const base64 = btoa(json);
		setCookie("settings", base64, 365);
	}

}
