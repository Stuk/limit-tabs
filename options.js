// 2.2.2 27May2021. Play the sound selected. See playsound()
// 2.2.8 29Nov2023. Modified first_limit_options to set totalTabs to tabs from all windows.
//				Earlier was only current window
// 2.2.10. Changed DEFAULTTABLIMIT from 2 to 1

var DEFAULTTABLIMIT = 1;
var currentonly = true;
var resetmax = false;

function onError(error) {
	console.log(`Error: ${error}`);
}

function onstart() {
	// console.log ("onstart called...");
	var getting = chrome.storage.local.get("firststart");
	getting.then(firststart_options, onError);
}

// When the extension is first installed (firststart is null) and the aim is to
//		set maxtabs (the tab limit) to the current number of tabs
function firststart_options(mt_item) {
	if (mt_item.firststart == null) {

		console.log ("Inside getting.firststart_options = null");
		chrome.storage.local.set({ firststart: 1 });

		// First time around, set "enabled" to true (used in other .js)
		// console.log ("firststart_options. Setting limit_enabled to true");
		chrome.storage.local.set({ limit_enabled: true });

		// Sets the limit to the current number of tabs. User can subsequently change it
		first_limit_options();
	} else {
		// console.log ("Inside getting.firststart_options = restoring");
		restoreOptions();
	}
}

// Sets the limit to the current number of tabs. User can subsequently change it
async function first_limit_options() {
	// console.log ("Inside first_limit_options");

	var totalTabs = 0;
	let tabArray = await chrome.tabs.query({currentWindow: true, pinned: false});
	totalTabs = tabArray.length;
	// console.log ("first_limit_options. tabArray.length = " + tabArray.length);

	// Retrieve tabs in other windows
	let tabArrayOther = await chrome.tabs.query({currentWindow: false, pinned: false});
	totalTabs = totalTabs + tabArrayOther.length;

	if (totalTabs > DEFAULTTABLIMIT ) {
		// console.log ("first_limit_options. Setting maxtabs to " + totalTabs);
		chrome.storage.local.set({ maxtabs: totalTabs });
	} else {
		// console.log ("first_limit_options. Setting maxtabs to " + DEFAULTTABLIMIT);
		chrome.storage.local.set({ maxtabs: DEFAULTTABLIMIT  });
	}
	restoreOptions();
}

function saveMaxTabs() {
	// Don't let tabs reduce below DEFAULTTABLIMIT
	if (document.querySelector("#maxtabs").value >= DEFAULTTABLIMIT) {
		chrome.storage.local.set({ maxtabs: document.querySelector("#maxtabs").value });
	} else {
		document.querySelector("#maxtabs").value = DEFAULTTABLIMIT;
	}
}

function saveCurrentOnly() {
	chrome.storage.local.set({ currentonly: document.getElementById("currentonly").checked });
	console.log ("saveCurrentOnly() called. currentonly = " + document.getElementById("currentonly").checked);
}

function saveResetMax() {
	chrome.storage.local.set({ resetmax: document.getElementById("resetmax").checked });
	console.log ("saveResetMax() called. resetmax = " + document.getElementById("resetmax").checked);
}

function saveToggle() {
	chrome.storage.local.set({ notoggle: document.getElementById("notoggle").checked });
}

function saveShowTabs() {
	chrome.storage.local.set({ showtabs: document.getElementById("showtabs").checked });
}

function saveWhichTab() {
	chrome.storage.local.set({ lru: document.getElementById("lru").checked });
	chrome.storage.local.set({ newest: document.getElementById("newest").checked });
	chrome.storage.local.set({ left: document.getElementById("left").checked });
	chrome.storage.local.set({ right: document.getElementById("right").checked });
}

function restoreOptions() {
	// console.log ("restoreOptions() called ");

	function setmaxtabs(result) {
		// console.log ("restoreOptions().setmaxtabs() called " + result.maxtabs);
		document.querySelector("#maxtabs").value = result.maxtabs || DEFAULTTABLIMIT;
	}

	function setcurrentonly(result) {
		// Bug fix. Always sets to "true". Changed next line
		// document.getElementById("currentonly").checked = result.currentonly || true;
		document.getElementById("currentonly").checked = !!(result.currentonly ?? true);
	}

	function setresetmax(result) {
		document.getElementById("resetmax").checked = result.resetmax || false;
	}

	function setnewest(result) {
		document.getElementById("newest").checked = result.newest || true;
	}

	function setlru(result) {
		document.getElementById("lru").checked = result.lru;
	}

	function setleft(result) {
		document.getElementById("left").checked = result.left;
	}

	function setright(result) {
		document.getElementById("right").checked = result.right;
	}

	function setToggle(result) {
		document.getElementById("notoggle").checked = result.notoggle;
	}

	function setShowTabs(result) {
		document.getElementById("showtabs").checked = result.showtabs;
	}

	function onError(error) {
		console.log(`Error: ${error}`);
	}

	mt_getting = chrome.storage.local.get("maxtabs");
	mt_getting.then(setmaxtabs, onError);

	currentonly_getting = chrome.storage.local.get("currentonly");
	currentonly_getting.then(setcurrentonly, onError);

	resetmax_getting = chrome.storage.local.get("resetmax");
	resetmax_getting.then(setresetmax, onError);

	newest_getting = chrome.storage.local.get("newest");
	newest_getting.then(setnewest, onError);

	lru_getting = chrome.storage.local.get("lru");
	lru_getting.then(setlru, onError);

	left_getting = chrome.storage.local.get("left");
	left_getting.then(setleft, onError);

	right_getting = chrome.storage.local.get("right");
	right_getting.then(setright, onError);

	cs_getting = chrome.storage.local.get("notoggle");
	cs_getting.then(setToggle, onError);

	cs_getting = chrome.storage.local.get("showtabs");
	cs_getting.then(setShowTabs, onError);

}

document.addEventListener("DOMContentLoaded", onstart);

document.getElementById("currentonly").addEventListener("change", saveCurrentOnly);
document.getElementById("resetmax").addEventListener("change", saveResetMax);
document.getElementById("notoggle").addEventListener("change", saveToggle);
document.getElementById("showtabs").addEventListener("change", saveShowTabs);
document.getElementById("maxtabs").addEventListener("change", saveMaxTabs);
document.getElementById("lru").addEventListener("change", saveWhichTab);
document.getElementById("newest").addEventListener("change", saveWhichTab);
document.getElementById("left").addEventListener("change", saveWhichTab);
document.getElementById("right").addEventListener("change", saveWhichTab);
