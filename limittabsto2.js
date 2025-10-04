// 1.2.3 04May2018. Original version 
// 1.2.4 13Aug2018. Changed options.html to make maxtabs a "number"
// 1.2.5 13Aug2018. Added closenew option
// 1.3.0 13Aug2018. Removed some redundant code
// 1.3.1 14Aug2018. Added sound when blocking tab on right hand side
// 1.3.2 16May2019. Added option to disable sounds; sounds both sides
// 					  Will ignore pinned tabs
// 1.3.3 23Jun2019. Added close lru; converted lru/left/right to radio button
// 1.3.4 27Jun2019. Added close newest; also catered to first run (immediately after
//							install), setting defaults appropriately (see onMaxTabsGot, onCloseNewest)
// 1.4.0 28Sep2019. Removed the need to "Save" preference changes
//		    			  Introduced a validation to ensure "number of tabs" do not go below 2
// 1.4.1 03Mar2020. Modified the "fail" sound to a "gong sound"
//		    			  Modified play_sound to avoid repeat sounds when multiple tabs closed
// 1.4.2 07Mar2020. Fixed some bug (not sure what)
// 1.4.3 10Jun2020. Bug in options.js, where "lru" selection would be overridden by "newest" because
//							"newest_getting.then(setnewest, onError);" was being run AFTER
//							"lru_getting.then(setlru, onError);" in restoreOptions()
// 1.4.4 24Jun2020. Under "Newest", a new tab spawned from an existing page (which is not rightmost)
//		 					causes the right-most tab to be killed (instead of the new spawned tab)
// 1.4.5 24Jun2020. close_newest. Modified to use tab.id instead of tab.lastAccessed
// 2.0.0 25Jun2020. Modified to allow for toolbar icon that toggles addon status between
//							active/inactive. See toggle_enable, limitEnabled, manifest.json:browser_action
//						  Also reintroduced TABLIMIT as a global variable (how was it working before?)	
// 2.0.1 26Jun2020. Added option to disable toggle browser action (Roarke started toggling
//							within a day
// 2.0.2 14Jul2020. Added BadgeText to display percent of used tabs. See updateBadgeCount,
//							updateBadgeOnRemove
// 2.0.3 15Jul2020. Added option for BadgeText: percent or total used tabs
//						  Added addonRemoving to fix issue with tabArray.length: when tab killed by
//							user it shows correctly, but when killed by add-on, it shows 1 greater
// 2.1.0 15Sep2020. Added option "currentonly" (options.html, options.js too) -- earlier, limit
//							would apply to each FF window independent of others. currentonly (default=
//							true) when set to false, would apply the limit globally
// 2.1.1 21Sep2020. Modified Math.round to Math.floor (so that 100% displays only when really at the limit)
// 2.2.0 23May2021. Added windowId to allow badgecount to update correctly. 
// 2.2.1 25May2021. Added sound options -- gong, buzzer, doorbell, beep. Changed lt.js, options.js, options.html
// 2.2.2 27May2021. Modified options.js to play the sound selected
// 2.2.3 29May2021. doToggle-false. Cycle through all windows, using windowId
// 2.2.4 30May2021. close_lru, close_right, close_newest. Fixed bug arising when multiple windows exist
// 2.2.5 31May2021. cleanjs.sh. An FF reviewer suggested that I remove comments to speed js loading
//			created cleanjs.sh, applied it to .js files, then redeployed. No functional changes
// 2.2.6 27Jul2022. Added resetmax. If enabled, resets TABLIMIT to current number when
//			extension is toggled from disabled to enabled
// 2.2.7 28Nov2023. From Peter Henry. Fix bug related to "currentonly", beautified options.html,
//							Modified close_lru to look at all windows
// 2.2.8 29Nov2023. Modified first_limit to set totalTabs to tabs from all windows.
//				Earlier was only current window
// 2.2.9 25Feb2024. Added setInterval event to fix the "Roarke problem" -- he, somehow, manages to open more
//				tabs than the limit
// 2.2.10 09May25. User request. Lower limit reduced to 1 -- changed DEFAULTTABLIMIT from 2 to 1


//********************************************
// Use cleanjs.sh to remove comments before submission
//********************************************

var TABLIMIT = 2;
var DEFAULTTABLIMIT = 1;
var SOUND_LAST_PLAYED = Date.now()-2000;
var limitEnabled = true;
var currentonly = true;
var addonRemoving = false;
var windowId = null;
var tabRemoved = false;

function toggle_enable() {
	// console.log ("toggle_enable called...");
	var getting = chrome.storage.local.get("notoggle");
	getting.then(doToggle, onError);
}

async function doToggle (result) {
	if (! result.notoggle) {
		if (limitEnabled) {
			// console.log ("limitEnabled set to true");
			limitEnabled = false;
			chrome.storage.local.set({ limit_enabled: false });
			chrome.action.setIcon({path: "icons/disabled.png"});

			// 29May21. Cycle through all windows
    			var gettingAll = chrome.windows.getAll();
    			gettingAll.then((windows) => {
      			for (var item of windows) {
				chrome.action.setBadgeText({text: ""});
      				}
    			});

			
		} else {
			limitEnabled = true;
			chrome.storage.local.set({ limit_enabled: true });
			chrome.action.setIcon({path: "icons/enabled.png"});


			var totalTabs = 0;
			// First get the number of tabs in other windows
			if (! currentonly) {
				let tabArray = await chrome.tabs.query({currentWindow: false, pinned: false});
				totalTabs = tabArray.length;
			}

			// Now retrieve the number of tabs in the current window
			let tabArray = await chrome.tabs.query({currentWindow: true, pinned: false});
			totalTabs = totalTabs + tabArray.length;

			// 27Jul22. If setmax enabled, set TABLIMIT to current number of tabs
			let result = await chrome.storage.local.get("resetmax");

			if (result.resetmax) {
				TABLIMIT = totalTabs;
				chrome.storage.local.set({ maxtabs: TABLIMIT });

			}

			updateBadgeCount(totalTabs, TABLIMIT);

		}
	}
}

function onError(error) {
	console.log(`Error: ${error}`);
}

async function updateBadgeCount(actualCount, limitTabs) {
			
	let myWindow = await chrome.windows.getCurrent();
	windowId = myWindow.id;

	// 21Sep2020. Modified next line
	// let percent = Math.round(actualCount * 100 / limitTabs);
	let percent = Math.floor(actualCount * 100 / limitTabs);

	let result = await chrome.storage.local.get("showtabs");
	// console.log ("updateBadgeCount. actualCount = " + actualCount);

	// console.log ("updateBadgeCount. windowId = " + windowId);
	// Need to show %, rather than "tabs/limit" as max. of 4 characters
	//		appear to be allowed in BadgeText

	// 24May21. In theory, setBadgeText with windowId = null (or windowId excluded) should update all windows;
	//	in practice, it's flaky. Consequently, irrespective of whether the limit is currentonly or across
	//	all windows, only the current window is updated. Switching to the other window would show an incorrect
	//	number (when limit is global) until a tab is added/deleted
	if (result.showtabs) {
		chrome.action.setBadgeText({text: actualCount.toString() });
	} else {
		chrome.action.setBadgeText({text: percent.toString() + "%"});
	}
	// if (percent >= 90) {
	// 	chrome.action.setBadgeTextColor({color: "red"});
	// 	chrome.action.setBadgeBackgroundColor({color: "lightgray"});
	// } else {
	// 	chrome.action.setBadgeTextColor({color: "black"});
	// 	chrome.action.setBadgeBackgroundColor({color: "lightgray"});
	// }
	
}

function onTabsChanged() {
	if (tabRemoved) {
		var getting = chrome.storage.local.get("limit_enabled");
		getting.then(isEnabled, onError);
	} else {
		var getting = chrome.storage.local.get("firststart");
		getting.then(firststart, onError);
	}
}

function firststart(mt_item) {
	// When the extension is first installed (firststart is null) and the aim is to
	//		set maxtabs (the tab limit) to the current number of tabs

	// console.log ("Inside first_limit");

	if (mt_item.firststart == null) {

		// 31May2021. Added code to set all defaults the first time

		chrome.storage.local.set({ firststart: 1 });

		chrome.storage.local.set({ currentonly: true });

		chrome.storage.local.set({ newest: true });
		chrome.storage.local.set({ lru: false });
		chrome.storage.local.set({ left: false });
		chrome.storage.local.set({ right: false });

		chrome.storage.local.set({ limit_enabled: true });

		chrome.storage.local.set({ showtabs: false });

		chrome.storage.local.set({ notoggle: false });

		// Sets the limit to the current number of tabs. User can subsequently change it
		first_limit();
	} else {
		var getting = chrome.storage.local.get("limit_enabled");
		getting.then(isEnabled, onError);
	}
}

// Sets the limit to the current number of tabs. User can subsequently change it
async function first_limit() {
	// console.log ("Inside first_limit");

	// 29Nov2023. Modified to retrieve tabcount from all windows
	var totalTabs = 0;
	let tabArray = await chrome.tabs.query({currentWindow: true, pinned: false});
	totalTabs = tabArray.length;

	// Retrieve tabs in other windows
	let tabArrayOther = await chrome.tabs.query({currentWindow: false, pinned: false});
	totalTabs = totalTabs + tabArrayOther.length;

	if (totalTabs > DEFAULTTABLIMIT ) {
		chrome.storage.local.set({ maxtabs: totalTabs });
		TABLIMIT=totalTabs;

	} else {
		chrome.storage.local.set({ maxtabs: DEFAULTTABLIMIT  });
		TABLIMIT=DEFAULTTABLIMIT;
	}

// 	console.log ("first_limit. tabArray.length= " + tabArray.length);
	updateBadgeCount(tabArray.length, TABLIMIT);
}

function isEnabled(result) {
	// console.log ("isEnabled called...");
	limitEnabled = result.limit_enabled;

	// console.log ("isEnabled.limitEnabled = " + limitEnabled);

	if (limitEnabled == null) {
		// console.log ("isEnabled. Setting limit_enabled ");

		chrome.storage.local.set({ limit_enabled: true});
		limitEnabled = true;
	}
	if (limitEnabled) {
		var getting = chrome.storage.local.get("currentonly");
		getting.then(setCurrentOnly, onError);
	}
}

function setCurrentOnly(result) {
	// console.log ("setCurrentOnly. result.currentonly = " + result.currentonly);
	currentonly = result.currentonly;
	if (currentonly == null) {
		// console.log ("setCurrentOnly. Setting currentonly ");

		chrome.storage.local.set({ currentonly: true});
		currentonly = true;
	}
 	
	// console.log ("setCurrentOnly. currentonly = " + currentonly);
	// if (currentonly) {
		// set window Id
		var gettingCurrent = chrome.windows.getCurrent();
		gettingCurrent.then(setCurrentId, onError);
}

function setCurrentId (result) {
	windowId = result.id;
	// console.log ("setCurrentId. windowId = " + result.id);
	doStuff();
}

async function doStuff() {
	let resultTabs = await chrome.storage.local.get("maxtabs");
	TABLIMIT = resultTabs.maxtabs;

	if (TABLIMIT < 1) {
		TABLIMIT = DEFAULTTABLIMIT;
	}

	// console.log ("doStuff. currentonly = " + currentonly);

	var totalTabs = 0;
	// First get the number of tabs in other windows
	if (! currentonly) {
		let tabArray = await chrome.tabs.query({currentWindow: false, pinned: false});
		totalTabs = tabArray.length;
		// console.log ("doStuff. totalTabs (false) = " + totalTabs);
	}

	// Now retrieve the number of tabs in the current window
	let tabArray = await chrome.tabs.query({currentWindow: true, pinned: false});
	totalTabs = totalTabs + tabArray.length;
	// console.log ("doStuff. totalTabs (all) = " + totalTabs);
	
	if (totalTabs > TABLIMIT) {
		var getting = chrome.storage.local.get("newest" || true);
		getting.then(onCloseNewest, onError);
	} else {
		// For some reason, when manually removing a tab, the function gets called
		//		before the tab is removed, hence need to subtract 1
		if (tabRemoved) {

			// For some reason, when manually removing a tab, the function gets called
			//		before the tab is removed, hence need to subtract 1
			if (! addonRemoving) {
				totalTabs = totalTabs-1
			}
			addonRemoving = false;
		} 
		updateBadgeCount(totalTabs, TABLIMIT);
	}
}

function onCloseNewest(result) {
	var myResult = result.newest;
	if (typeof result.newest == "undefined") {
		myResult = true;
	}
	// console.log ("onCloseNewest.myResult = " + myResult );

	if (myResult) {
		close_newest();
	} else { 
		var getting = chrome.storage.local.get("lru");
		getting.then(onCloseLru, onError);
	}
}

function onCloseLru(result) {
	if (result.lru) {
		close_lru();
	} else { 
		var getting = chrome.storage.local.get("right");
		getting.then(onCloseRight, onError);
	}
}

function onCloseRight(result) {
	if (result.right) {
		right_close();
	} else { 
		left_close();
	}

}

async function close_newest () {
	var totalTabs = 0;
	// First get the number of tabs in other windows
	if (! currentonly) {
		let tabArray = await chrome.tabs.query({currentWindow: false, pinned: false});
		totalTabs = tabArray.length;
	}

	// console.log ("close_newest. totalTabs (other) =" + totalTabs);

	// Now retrieve the number of tabs in the current window
	let tabArray = await chrome.tabs.query({currentWindow: true, pinned: false});
	totalTabs = totalTabs + tabArray.length;

//	console.log ("close_newest. totalTabs (all) =" + totalTabs);
	
	if (totalTabs > TABLIMIT) {
		// var getting = browser.storage.local.get("nosound");
		// getting.then(play_sound, onError);

		// Code to close the newest, based on tab.id
		var index=0, i;
		var newestid=tabArray[0].id;

		for (i = 0; i < tabArray.length; i++) { 
 			// console.log ("close_newest. i=" + i 
 			//  	+ "  lastAccessed=" + tabArray[i].lastAccessed 
 			//  	+ "  Id =" + tabArray[i].id);

			if (tabArray[i].id > newestid) {
				index = i;
				newestid = tabArray[i].id;

				// console.log ("close_newest. index changed to =" + i);
			}
		}

		await chrome.tabs.remove(tabArray[index].id);
		close_newest();
		addonRemoving = true;
		// console.log ("close_newest. Inside for. tabArray.length =" + tabArray.length);
	} 
}

async function close_lru () {
	var totalTabs = 0;
	
	// 28Nov2023. Modified next 9 lines to cater to global lru removal, if !currentonly
	// First get the number of tabs in other windows
	// if (! currentonly) {
	// 	let tabArray = await chrome.tabs.query({currentWindow: false, pinned: false});
	// 	totalTabs = tabArray.length;
	// }

	// Now retrieve the number of tabs in the current window
	// let tabArray = await chrome.tabs.query({currentWindow: true, pinned: false});
	// totalTabs = totalTabs + tabArray.length;

	// First retrieve tab information of the current window
	let tabArray = await chrome.tabs.query({currentWindow: true, pinned: false});

//	console.log ("close_lru. tabArray.length=" + tabArray.length);
	
	// If global, retrieve tab information of other windows
	if (! currentonly) {
		let tabArrayGlobal = await chrome.tabs.query({currentWindow: false, pinned: false});

		// Add them to tabArray
		tabArray.push(...tabArrayGlobal);

		// console.log ("close_lru !current. tabArray.length=" + tabArray.length);

	}

	totalTabs = tabArray.length;

	if (totalTabs > TABLIMIT) {
		// var getting = browser.storage.local.get("nosound");
		// getting.then(play_sound, onError);


		// Code to close the least recently used
		var oldesttime=tabArray[0].lastAccessed;

		var index=0, i;

		for (i = 0; i < tabArray.length; i++) { 

//			console.log ("close_lru. i=" + i
//				+ "  WinId=" + tabArray[i].windowid
//				+ "  tabId=" + tabArray[i].id
//				+ "  lastAccessed=" + tabArray[i].lastAccessed);

			if (tabArray[i].lastAccessed < oldesttime) {
				index = i;
				oldesttime = tabArray[i].lastAccessed;
				
				// console.log ("close_lru. index changed to =" + i);
			}
		}

//		console.log ("close_lru. Removing Id=" + tabArray[index].id);

		await chrome.tabs.remove(tabArray[index].id);

		close_lru();
		addonRemoving = true;
	} 
}

async function right_close () {
	var totalTabs = 0;
	// First get the number of tabs in other windows
	if (! currentonly) {
		let tabArray = await chrome.tabs.query({currentWindow: false, pinned: false});
		totalTabs = tabArray.length;
	}

	// Now retrieve the number of tabs in the current window
	let tabArray = await chrome.tabs.query({currentWindow: true, pinned: false});
	totalTabs = totalTabs + tabArray.length;
	
	if (totalTabs > TABLIMIT) {
		// var getting = browser.storage.local.get("nosound");
		// getting.then(play_sound, onError);

		await chrome.tabs.remove(tabArray[tabArray.length-1].id);
		right_close();
		addonRemoving = true;
	} 
}

async function left_close () {
	var totalTabs = 0;
	// First get the number of tabs in other windows
	if (! currentonly) {
		let tabArray = await chrome.tabs.query({currentWindow: false, pinned: false});
		totalTabs = tabArray.length;
	}

	// Now retrieve the number of tabs in the current window
	let tabArray = await chrome.tabs.query({currentWindow: true, pinned: false});
	totalTabs = totalTabs + tabArray.length;
	
	if (totalTabs > TABLIMIT) {
		// var getting = browser.storage.local.get("nosound");
		// getting.then(play_sound, onError);

		await chrome.tabs.remove(tabArray[0].id);
		left_close();
		addonRemoving = true;
	} 
}

// Fired periodically -- set setInterval below
function roarkeCleanUp() {
  tabRemoved = false;
  onTabsChanged ();
}

chrome.action.onClicked.addListener(toggle_enable);
chrome.tabs.onCreated.addListener(function (tab) {
  tabRemoved = false;
  onTabsChanged ();
});

// browser.tabs.onRemoved is to update badge count
chrome.tabs.onRemoved.addListener(function (tab) {
  tabRemoved = true;
  onTabsChanged ();
});

// Runs the tab check every 2 minutes. This, to fix the "Roarke Problem" -- he
//		somehow manages to open more tabs than the limit
setInterval (roarkeCleanUp, 120000);
