var systemDB;

function popoverHandler(event) 
{
	if (event.target.identifier == "tabsForLaterPopover") { 
		setupAccordion();
	}
	else return;
}

/* This is to disable the save button when there is no text in the input field*/
function checkInput() 
{
	var textField = document.getElementById('textField');
	var button = document.getElementById('saveButton');
	if (textField.value.length > 0) button.disabled = false;
	else button.disabled = true;
}

/* Given an array of urls, this function opens them in the current or a new window*/
function openGroup(urls) 
{
	safari.self.hide();

	var window = safari.application.activeBrowserWindow;
	var theWindow;
	if (window.tabs.length == 1 && !window.activeTab.url) theWindow = window;
	else theWindow = safari.application.openBrowserWindow();
	
	for (var i = 0; i < urls.length; i++) {
		if (i == 0) {
			theWindow.activeTab.url = urls[i];
		} else {
			var tab = theWindow.openTab('background', i);
			tab.url = urls[i];
		}
	};
}

/* Resize the window to compensate for the accordion's height*/
function resizeWindow()
{
	safari.self.height = 65 + document.getElementById('accordion').offsetHeight;
}

/* Initialize the systemDB global variable. */
function initDB()
{
	try {
		if (!window.openDatabase) {
			alert('Not supported.');
		} else {
			var name = 'tabsForLater';
			var version = '1.0';
			var displayName = 'Tabs for Later';
			var maxSize = 5242880;
			var myDB = openDatabase(name, version, displayName, maxSize);
		}
	} catch (e) {
		if (e == 2) {
			alert('Invalid Database Version.');
		} else {
			alert('Unknown Error ' + e + '.');
		}
		return;
	}
 
	createTables(myDB);
	systemDB = myDB;
}

/* This is used as a data handler for a request that should return no data. */
function nullDataHandler(transaction, results)
{

}

/* When passed as the error handler, this causes a transaction to fail with a warning message. */
function errorHandler(transaction, error)
{
    // error.message is a human-readable string.
    // error.code is a numeric error code
    alert('Oops.  Error was '+error.message+' (Code '+error.code+')');
 
    // Handle errors here
    var we_think_this_error_is_fatal = true;
    if (we_think_this_error_is_fatal) return true;
    return false;
}

/* Create the tables in database*/
function createTables(myDB)
{  
    myDB.transaction(  
        function (transaction) {  
            transaction.executeSql('CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY AUTOINCREMENT, groupName TEXT NOT NULL, url VARCHAR(2083) NOT NULL, title TEXT);', [], nullDataHandler, errorHandler);  
        }  
    );
} 

/* Save the tabs to database*/
function saveTabs()
{
	var tabs = safari.application.activeBrowserWindow.tabs;
	var textField = document.getElementById('textField');

	systemDB.transaction(
		function (transaction) {
			for (var i = 0; i < tabs.length; i++) {
				if (tabs[i].title != undefined && tabs[i].url != undefined) {
					transaction.executeSql('insert into sessions (groupName, url, title) VALUES (?, ?, ?);', [textField.value, tabs[i].url, tabs[i].title], nullDataHandler, errorHandler);
				}
			};
			var button = document.getElementById('saveButton');
			textField.value = '';
			button.disabled = true;
			setupAccordion();
		}
	);
}

/* Read data from database and add titles for the accordion view*/
function setupAccordion() 
{
	systemDB.transaction(  
        function (transaction) {  
            transaction.executeSql('SELECT DISTINCT groupName from sessions;', 
            						[], 
            						function(transaction, results){
            							var accordion = document.getElementById('accordion');
										if (accordion.hasChildNodes()) {
										    while (accordion.childNodes.length >= 1) {
										        accordion.removeChild(accordion.firstChild);       
										    } 
										}

            							var groupNames = [];
            							for (var i = 0; i < results.rows.length; i++) {
            								groupNames[i] = results.rows.item(i)['groupName'];
            							};

										for (var i = 0; i < groupNames.length; i++) {
										    addDetailsTag(groupNames[i], accordion);
										};

										setTimeout(function() { resizeWindow(); }, 20);
      								},
            						errorHandler);  
        }  
    );	
}

/* Read data from database and add details for the accordion view*/
function addDetailsTag(groupName, accordion)
{
	var details = document.createElement('details');
	
	systemDB.transaction(  
        function (transaction) {  
            transaction.executeSql('SELECT * from sessions WHERE groupName=?;', 
            						[groupName],
            						function(transaction, results){
            							var urls = [];
            							for (var i = 0; i < results.rows.length; i++) {
            								urls[i] = results.rows.item(i)['url'];  								
            								var p = document.createElement('p');
            								p.className = 'siteTitle';
            								p.innerHTML = results.rows.item(i)['title'];
            								details.appendChild(p);
            							};

            							var summary = document.createElement('summary');
            							summary.onclick = function() { setTimeout(function() { resizeWindow(); }, 20); };

            							var groupNameWrapper = document.createElement('div');
            							groupNameWrapper.className = 'groupNameWrapper';
            							var link = document.createElement('a');
            							link.href = 'javascript:void(0);';
            							link.className = 'groupName';
            							link.onclick = function() { openGroup(urls); };
            							link.onmousedown = function(e) { e.preventDefault(); };
            							link.innerHTML = groupName;
            							groupNameWrapper.appendChild(link);

            							var closeButton = document.createElement('span');
            							closeButton.className = 'closeButton';
            							closeButton.href = 'javascript:void(0);';
            							closeButton.onmousedown = function(e) { e.preventDefault(); };
            							closeButton.onclick = function() { removeGroup(groupName); };

            							summary.appendChild(groupNameWrapper);
            							summary.appendChild(closeButton);
										details.insertBefore(summary, details.firstChild);

            							accordion.appendChild(details);
      								},
            						errorHandler);  
        }  
    );
}

/* Given a group name, this function removes all entries with the name from database*/
function removeGroup(groupName)
{
	systemDB.transaction(  
        function (transaction) {  
            transaction.executeSql('DELETE from sessions WHERE groupName=?;', 
            						[groupName],
            						function(transaction, results){
            							setupAccordion();
      								},
            						errorHandler);  
        }  
    );
}

safari.application.addEventListener("popover", popoverHandler, true);
