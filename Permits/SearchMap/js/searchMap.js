  var startDate = moment().subtract(30, 'd').format("YYYY-MM-DD");     //Moment.js - default last 30 days
  //Map variables
  var imageOver;
  var imageIcon;
  var markers = [];
  var mapProp;
  var map;
  var infowindow;
  var mapCount = 0;
  var permitsResourceId = "5dcf6d6b-ed48-4b73-837e-95b8dd1967f3";  //Tacoma ID 
  var baseURI = "http://www.civicdata.com/api/action/datastore_search_sql?sql=";  //Civic Data API via SQL statement URL
  var urlLatLongQuery;
  var urlQuery;
  var markerCluster;
  var markersSearch = [];  //marker(s) for Google search box

  //Spatial Query variables
  var currentZoom;
  var currentSouth;
  var currentNorth;
  var currentWest;
  var currentEast;

  $(document).ready(function() {
	//START RESIZE FUNCTIONS----------------------------------------------------------------------------------------------------------------------------------------------
	// data-pagespeed-no-defer -   https://developers.google.com/speed/pagespeed/service/DeferJavaScript
	 //problem with CDATA in title tab, pagespeed_no_defer add to html - https://stackoverflow.com/questions/33099994/pagespeed-script-addition-what-does-it-do
	 $(function() {
	   var activePage = this;
	   var screen = $.mobile.getScreenHeight(),
	       header = $(".ui-header", activePage).hasClass("ui-header-fixed") ? $(".ui-header", activePage).outerHeight() - 1 : $(".ui-header", activePage).outerHeight(),
	       footer = $(".ui-footer", activePage).hasClass("ui-footer-fixed") ? $(".ui-footer", activePage).outerHeight() - 1 : $(".ui-footer", activePage).outerHeight(),
	       panelheight = screen - header - footer;
	   document.getElementById("searchMap").style.height = panelheight + "px";    //resize map to screen content panel height, add function for resize!!!

	  //Hide submenus - http://www.java2s.com/Tutorials/jQuery_Mobile/Example/Select/Show_hide_select_menu.htm
	   $('.subMenu').closest('div.ui-select').hide();  //hide all submenus @ start
	    
	    $('#permitCategory').change(function(){
	      //Update submenus on Category selection
	      $('.subMenu').closest('div.ui-select').hide();  //hide all submenus
	      $('#' + $(this).val()).closest('div.ui-select').show();  //show appropriate submenu
	    });

	 });

	       
	       if (screen.width>1000){
	       	//console.error('Width: ',screen.width);  
	       	$("#rightPanel").panel( "open");  //Open filter panel by default on larger screens - https://api.jquerymobile.com/panel/
	       }
	       

//Check on mobile to see if this is working
	 $(document).on("pagecreate", "#index", function (e) {
	   //fit panels between header & footer, compensates for page resize by checking current screen height each time - http://plnkr.co/edit/6rhrmv?p=preview
	   var activePage = this;
	   $("#leftPanel, #rightPanel").one("panelbeforeopen", function () {
	       var screen = $.mobile.getScreenHeight(),
	           header = $(".ui-header", activePage).hasClass("ui-header-fixed") ? $(".ui-header", activePage).outerHeight() - 1 : $(".ui-header", activePage).outerHeight(),
	           footer = $(".ui-footer", activePage).hasClass("ui-footer-fixed") ? $(".ui-footer", activePage).outerHeight() - 1 : $(".ui-footer", activePage).outerHeight(),
	           panelheight = screen - header - footer;
	       $('.ui-panel').css({
	           'top': header,
	           'min-height': panelheight
	       });
	   });
	 });
	//END RESIZE FUNCTIONS----------------------------------------------------------------------------------------------------------------------------------------------

    //Submenus for permit categories
    menuIDs = ['All', 'Accessory', 'Building', 'Demolition', 'LandUse', 'ROW', 'SiteDevelopment', 'Utility'];  //sub-menus
      $('#permitCategory').on('change', function() {
        for (var i = 0; i < menuIDs.length; i++) {
         $("#"+menuIDs[i]).hide();  //hide all sub-menus first
        }
        if (this.value != 'All') {
         $("#"+this.value).show();  //show selected sub-menu if 'All' not selected
        }
      });
  });

  function numberWithCommas(x) {
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function makeInfoWindowEvent(map, infowindow, contentString, marker) {
    if (markers.length != 0) {
	  //Check for multiple markers at same location
	  //check to see if any of the existing markers match the latlng of the new marker
      for (i=0; i < markers.length; i++) {
        if (marker.getPosition().equals(markers[i].getPosition())) {  //new marker position equal to existing marker
          //Move marker position slightly (~1 meter, results in diagonal NE placement for multiple markers @ same location)
          marker.setPosition(new google.maps.LatLng(marker.getPosition().lat() + .00001, marker.getPosition().lng() + .00001));     //~1 meter @ equator - https://en.wikipedia.org/wiki/Decimal_degrees
        }                   
      }
    }
    
          google.maps.event.addListener(marker, 'click', function() {
            infowindow.setContent(contentString);
            infowindow.open(map, marker);
          });
          google.maps.event.addListener(marker, 'mouseover', function() {
            marker.setIcon(imageOver);
          });

          google.maps.event.addListener(marker, 'mouseout', function() {
            marker.setIcon(imageIcon);
          });
  }

function initialize() {
  // Create a new StyledMapType object, passing it an array of styles,
  // and the name to be displayed on the map type control.
  var styledMapType = new google.maps.StyledMapType(
    [{
      "featureType": "all",
      "elementType": "all",
      "stylers": [{
        "saturation": -100
      }, {
        "gamma": 0.5
      }]
    }], {
      name: 'Gray'
    });

  mapProp = {
    center: new google.maps.LatLng(47.250138520439556, -122.47643585205077),
    zoom:12,
    mapTypeId:google.maps.MapTypeId.ROADMAP,
          mapTypeControl: true,
          mapTypeControlOptions: {
              style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
              position: google.maps.ControlPosition.RIGHT_BOTTOM,
		      mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain',
		        'styled_map'
		      ]
          },
          zoomControl: true,
          zoomControlOptions: {
              position: google.maps.ControlPosition.LEFT_TOP
          },
          scaleControl: true,
          streetViewControl: true,
          streetViewControlOptions: {
              position: google.maps.ControlPosition.LEFT_TOP
          },
          fullscreenControl: true
    };

  map = new google.maps.Map(document.getElementById("searchMap"), mapProp);

  //Associate the styled map with the MapTypeId and set it to display.
  map.mapTypes.set('styled_map', styledMapType);
  map.setMapTypeId('styled_map');

  infowindow = new google.maps.InfoWindow();

  var tacomaLayer = new google.maps.KmlLayer({
    url: 'http://tacomapermits.org/gis/Permits/KMZ/Tacoma60.kmz',
    clickable: false,
    suppressInfoWindows: true,
    //preserveViewport: true,
    map: map
  });

  var boundsTacoma;
	google.maps.event.addListenerOnce(map, 'idle', function(){
	    // do something only the first time the map is loaded
	    //boundsTacoma = tacomaLayer.getDefaultViewport();  //Tacoma zoom limit
	    boundsTacoma = map.getBounds();  // Use map bounds instead, KML getDefaultViewport() returning undefined
	});  

	  google.maps.event.addListener(map, 'idle', function(){  // listen for every viewport change - update zoom and map extent variables
	    currentZoom = map.getZoom();  //initial 11 - or greater don't use lat-long values in SQL
		currentSouth = map.getBounds().getSouthWest().lat();
		currentNorth = map.getBounds().getNorthEast().lat();
		currentWest = map.getBounds().getSouthWest().lng();
		currentEast = map.getBounds().getNorthEast().lng();
	  });

      //Add Zoom Home image as a control------------------------
      var controlDiv = document.createElement('DIV');  // Create a div to hold the control.
      controlDiv.style.padding = '0px 13px 5px 10px';  // Offset the control from the edge of the map
      
      // Set CSS for the control border
      var controlUI = document.createElement('DIV');
      controlUI.style.backgroundColor = 'rgba(102,102,102,0.80)';
      controlUI.style.borderStyle = 'solid';
      controlUI.style.borderWidth = '1px';
      controlUI.style.borderRadius = '2px';
      controlUI.style.borderColor = '#D2D4D7';
      controlUI.style.cursor = 'pointer';
      controlUI.style.width = '26px';
      controlUI.style.height = '26px';

      //Add image to control
      var myLogo = document.createElement("img");
          myLogo.src = "images/homeWhite.png";
          myLogo.style.width = '20px';
          myLogo.style.height = '20px';
          myLogo.style.margin = '2px 3px 3px 2px';
          myLogo.title = "Zoom to Tacoma";
          //Append to each div
          controlUI.appendChild(myLogo);
          controlDiv.appendChild(controlUI);
      
      //Add control to map
      map.controls[google.maps.ControlPosition.RIGHT_TOP].push(controlDiv);

      // Set click event
      google.maps.event.addDomListener(controlUI, 'click', function() {
        map.fitBounds(boundsTacoma);
      });

    //End Zoom Home as a control------------------------

  initAutocomplete(map);  //add place search box

  //=== Set marker attributes ===
    //create at http://gmaps-utility-library.googlecode.com/svn/trunk/mapiconmaker/1.1/examples/markericonoptions-wizard.html
    //http://iconizer.net/en/search/1/collection:Blue_Coral
    imageIcon = 'SearchMap/images/mapIcons/Permit.png';
    imageOver = 'SearchMap/images/mapIcons/PermitHighlight.png';

  //Update status string from page
  var urlStatusString = statusString(document.getElementById("permitStatus").value);

  //Initial query parameters
  urlLatLongQuery = "SELECT * from \"permitsResourceId\" where \"Applied_Date\" > \'" + startDate + "' " + urlStatusString;
  urlQuery = baseURI + encodeURIComponent(urlLatLongQuery.replace("permitsResourceId", permitsResourceId));
	queryCivicData(urlQuery);  //jQuery to CivicData
}

function initAutocomplete(map) {
	// https://developers.google.com/maps/documentation/javascript/examples/places-searchbox
	// Create the search box and link it to the UI element.
	var input = document.getElementById('pac-input');
	var searchBox = new google.maps.places.SearchBox(input);
	map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

	map.addListener('bounds_changed', function() {  // Bias the SearchBox results towards current map's viewport.
		searchBox.setBounds(map.getBounds());
	});

	searchBox.addListener('places_changed', function() { // Listen for the event fired when the user selects a prediction and retrieve more details for that place.
		var places = searchBox.getPlaces();

		if (places.length == 0) {
		return;
		}

		
		markersSearch.forEach(function(marker) {
			marker.setMap(null);  // Clear out the old markersSearch from map.
		});
		markersSearch = [];  //Remove from object

		// For each place, get the icon, name and location.
		var bounds = new google.maps.LatLngBounds();
		places.forEach(function(place) {
		if (!place.geometry) {
		  console.log("Returned place contains no geometry");
		  return;
		}
		var icon = {
		  url: place.icon,
		  size: new google.maps.Size(71, 71),
		  origin: new google.maps.Point(0, 0),
		  anchor: new google.maps.Point(17, 34),
		  scaledSize: new google.maps.Size(25, 25)
		};

		// Create a marker for each place.
		markersSearch.push(new google.maps.Marker({
		  map: map,
		  icon: icon,
		  title: place.name,
		  position: place.geometry.location
		}));

		if (place.geometry.viewport) {
		  bounds.union(place.geometry.viewport);  // Only geocodes have viewport.
		} else {
		  bounds.extend(place.geometry.location);
		}
		});
		map.fitBounds(bounds);
	});
}

function toggleButton() {
	//Disable search button to prevent multiple queries - html button onclick = this.disabled=true;
	document.getElementById("searchButton").disabled = false;  //Enable search button  
}

function toggleLoader() {
  //icons - http://www.ajaxload.info/
  if (document.getElementById('mapLoader').style.display=='none') {

	   document.getElementById("mapCounter").innerHTML = ''; //remove count in search panel

	  //Waiting animation ...
	  document.getElementById('mapLoader').style.display='inline';
	  var el = document.getElementById('mapLoader'),
	    i = 0,
	    load = setInterval(function() {
	      i = ++i % 5;
	      el.innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Loading' + Array(i + 1).join(' .');
	      }, 600);

  } else {
	  document.getElementById('mapLoader').style.display='none';  //Hide waiting animation
  }
}	

function queryCivicData(urlQuery) {
  //Clean-up -----------------------------------------------------------------------------
  mapCount = 0;  //reset map permit counter
    for (var i = 0; i < markers.length; i++) {
      markers[i].setMap(null);  // Removes the markers from the map
    }

    if (markerCluster === undefined) {
    	//do nothing
    } else {
    	//console.error(markerCluster.getTotalMarkers());
	    for (var i = 0; i < markers.length; i++) {
	      markerCluster.removeMarker(markers[i]);  // Remove each marker from the cluster
	      // https://github.com/googlemaps/v3-utility-library/tree/master/markerclusterer
	    }
    }

    markers = []; // Deletes all markers in the array
  //--------------------------------------------------------------------------------------

  //jQuery CivicData
  $.ajax({
    url: urlQuery,
    dataType: 'jsonp',  //callback - no jQuery error handling for cross domain JSONP requests - http://api.jquery.com/jQuery.ajax/
    timeout: 20000, // a lot of time for the request to be successfully completed - workaround for JSONP requests 
    error: function (data, textStatus, errorThrown) {
     //alert('An error has occurred downloading data from CivicData.  Please refresh browser or try later.');
     $("<div title='ALERT'>An error occurred downloading data from CivicData.  Please refresh browser or try later.</div>").dialog();

    console.error("data Status: " + data.status + ' | ' +"error Status: " + textStatus + ' | ' +"error Thrown: " + errorThrown);        
    },

    success: function(data) {

	  if ( data.result.records.length>2000) {
	  	alert('Search limited to no more than 2,000 permits for performance purposes.  Please adjust search criteria or map extent.')
	  } else {

	      //Loop through records and add to map
	      for (var i = 0; i < data.result.records.length; i++) {
	        if (data.result.records[i].Longitude!="") {
	          var latLng = new google.maps.LatLng(data.result.records[i].Latitude,data.result.records[i].Longitude);
	          var titleString = data.result.records[i].Permit_Type_Description;    //for mouse-over
	          
	          //future query only needed fields and loop through (remove underscores) 
	          var contentString = '<strong>Permit Number: </strong>' + data.result.records[i].Permit_Number;  //popup contents
	              contentString += '<br><b>Address: </b>' + data.result.records[i].Address_Line_1;
	              contentString += '<br><b>Permit Type: </b>' + data.result.records[i].Permit_Type_Description;
	              contentString += '<br><b>Current Status: </b>' + data.result.records[i].Current_Status;
	              contentString += '<br><b>Status Date: </b>' + data.result.records[i].Status_Date;
	              contentString += '<br><b>Fee: </b>' + data.result.records[i].Fee;
	              contentString += '<br><b>Estimated Value: </b>$' + numberWithCommas(data.result.records[i].Estimated_Valuation);
	              contentString += '<br><b>Description: </b>' + data.result.records[i].Description;
	              contentString += '<br><a href="' + data.result.records[i].Link + '" target="_blank"><b>DETAILS LINK</b></a>';

	          
	          //Add marker to map
	          var marker = new google.maps.Marker({
	            position: latLng,
	            map: map,
	            icon: imageIcon,
	            title: titleString
	          });

	          makeInfoWindowEvent(map, infowindow, contentString, marker);  //Add click event (popup infoWindow) to marker
	          markers.push(marker);  //add to array of markers
	         mapCount = mapCount + 1;
	        } 
	      }  //end record loop

	      if (mapCount==0) {
	      	alert('No permits found.  Please adjust search criteria or map extent.')
	      }
		  
		  markerCluster = new MarkerClusterer(map, markers, {maxZoom: 17});  //Add markerCluster symbols to map now that all individual markers have been added
      }  //end 1,000 record limit check

      toggleLoader();  //remove loading message
      toggleButton();  //enable search button
      console.error('Permits applied last ' + document.getElementById("permitSelect").value + ' days: ' + numberWithCommas(data.result.records.length) + ' | Permits with a location: ' + numberWithCommas(mapCount));
	  document.getElementById("mapCounter").innerHTML = numberWithCommas(data.result.records.length) + ' Permits Found'; //update count in search panel
//TEST
  	 //Create CSV file of selection for download - d3.csvFormat  - https://github.com/d3/d3-dsv/blob/master/README.md#csvFormat - https://d3js.org/d3.v4.min.js - update with just listed fields
  	 //csvContent_New_Selection = d3.csvFormat(data.result.records, ["Permit_Number", "Description", "Applied_Date", "Current_Status", "Address_Line_1", "Address_Line_2", "Zip", "Permit_Type_Description", "Link", "Parcel_Number", "Lic_Prof_Company_Name", "Lic_Prof_Phone_Number", "Lic_Prof_Address_Line_1", "Lic_Prof_Address_Line_2", "Lic_Prof_Email"]);  
  	 csvContent_New_Selection = d3.csvFormat(data.result.records, ["Latitude", "Longitude", "Permit_Number", "Address_Line_1", "Permit_Type_Description", "Current_Status", "Status_Date", "Fee", "Estimated_Valuation", "Description", "Link"]);  
  	 //csvContent_New_Selection = d3.csvFormat(data.result.records);  //include all fields - not working after first query  

	 } //end data success
  });

}

function exportToCSV(filename) {
        //https://jsfiddle.net/jossef/m3rrLzk0/
        //Update variables
        	var csvFile = csvContent_New_Selection;

        //Download file depending on browser
        var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
        if (navigator.msSaveBlob) { // IE 10+
            navigator.msSaveBlob(blob, filename);
        } else {
            var link = document.createElement("a");
            if (link.download !== undefined) { // feature detection
                // Browsers that support HTML5 download attribute
                var url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
}

function mapSearch() {
  var numDays = document.getElementById("permitSelect").value;
  startDate = moment().subtract(numDays, 'd').format("YYYY-MM-DD");     //Moment.js 

  //Update date query string
  if (document.getElementById("permitCategory").value =='LandUse'){
  	//NO Issued__Date values so use Applied_Date instead
  	var urlDateString = "\"Applied_Date\" > \'" + startDate + "' ";  //don't escape the last '
  } else {
  	var urlDateString = "\"Applied_Date\" > \'" + startDate + "' ";  //don't escape the last '
  }

  //Since some dates are null ignore the date field for 7 year query
  if (document.getElementById("permitSelect").value==7) {
  	//console.error(document.getElementById("permitSelect").value);
  	var urlDateString = "\"Permit_Number\" <> \' ' ";  //ignore dates in search - get anything with a permit number
  } 

  //Update category string	
  var urlCategoryString = categoryString(document.getElementById("permitCategory").value);
  //Update status string
  var urlStatusString = statusString(document.getElementById("permitStatus").value);

  //Update spatial query string
  if (currentZoom > 12) {
  	//do spatial query & need spaces at end:  ' ) "; 
  	var southNorth  = "and (\"Latitude\" BETWEEN '" + currentSouth + "' AND '" + currentNorth + "' ) ";
  	var eastWest  = " and (\"Longitude\" BETWEEN '" + currentEast + "' AND '" + currentWest + "' ) ";
  	var urlSpatialQuery  = southNorth + eastWest;
  } else {
  	//don't do spatial query
  	var urlSpatialQuery  = ""
  }

  //Put it all together
  urlLatLongQuery = "SELECT \"Permit_Number\",\"Current_Status\",\"Status_Date\",\"Fee\",\"Estimated_Valuation\",\"Permit_Type_Description\",\"Description\",\"Link\",\"Address_Line_1\",\"Latitude\",\"Longitude\" from \"permitsResourceId\" where " + urlDateString + urlCategoryString + urlStatusString + urlSpatialQuery;
  //Encode URL to avoid unexpected requests to the server
  urlQuery = baseURI + encodeURIComponent(urlLatLongQuery.replace("permitsResourceId", permitsResourceId));

  //console.error(urlQuery);  //QC Check - will still work even with errors
  
  queryCivicData(urlQuery);  //jQuery to CivicData
}

function categoryString(value) {
  //NEED A SPACE AT END OF EACH CATEGORY & need spaces at end:  ' ) "; 
  if (value =='Building') {
    if (document.getElementById(value).value =='All') {
      return " and (\"Permit_Type_Description\" = \'Building Residential Alteration ' or \"Permit_Type_Description\" = \'Building Residential New Building ' or \"Permit_Type_Description\" = \'Building Commercial Alteration ' or \"Permit_Type_Description\" = \'Building Commercial New Building ' ) "; 
    } else {
      return " and (\"Permit_Type_Description\" = \'" + document.getElementById(value).value + "' ) "; //get value from menu, space included in menu value
    }
  } else if (value =='Demolition') {
    if (document.getElementById(value).value =='All') {
  	  return " and (\"Permit_Type_Description\" = \'Building Residential Demolition ' or \"Permit_Type_Description\" = \'Building Commercial Demolition ' or \"Permit_Type_Description\" = \'ePermit Residential Demo ' or \"Permit_Type_Description\" = \'ePermit Residential Demolition ' or \"Permit_Type_Description\" = \'ePermit Residential Accessory Demolition ' or \"Permit_Type_Description\" = \'ePermit Residential Accessory Demolition No Fee ' ) ";
    } else {
      return " and (\"Permit_Type_Description\" = \'" + document.getElementById(value).value + "' ) "; //get value from menu, space included in menu value
    }
  } else if (value =='SiteDevelopment') {
    if (document.getElementById(value).value =='All') {
  	  return " and (\"Permit_Type_Description\" = \'Site Development ' or \"Permit_Type_Description\" = \'Site Noise Variance ' or \"Permit_Type_Description\" = \'Site Work Order ' ) ";
    } else {
      return " and (\"Permit_Type_Description\" = \'" + document.getElementById(value).value + "' ) "; //get value from menu, space included in menu value
    }
  } else if (value =='LandUse') {
    if (document.getElementById(value).value =='All') {
  	  //NO Issued__Date values so use Applied_Date instead
  	  return " and (\"Permit_Type_Description\" = \'Land Use Reconsideration or Appeal ' or \"Permit_Type_Description\" = \'Land Use CAPOMM ' or \"Permit_Type_Description\" = \'Land Use Application ' ) ";
    } else {
      return " and (\"Permit_Type_Description\" = \'" + document.getElementById(value).value + "' ) "; //get value from menu, space included in menu value
    }
  } else if (value =='Pre-Application') {
  	  return " and (\"Permit_Type_Description\" = \'Pre-Application ' ) ";

//start here - Only getting 271 out of 323!!!!! - all other values work
  } else if (value =='Accessory') {
    if (document.getElementById(value).value =='All') {
  	  return " and (\"Permit_Type_Description\" = \'ePermit Fire Alarm ' or \"Permit_Type_Description\" = \'ePermit Fire Sprinkler ' or \"Permit_Type_Description\" = \'ePermit Fire Transmitter ' or \"Permit_Type_Description\" = \'ePermit Residential Mechanical ' or \"Permit_Type_Description\" = \'ePermit Window Replacement ' or \"Permit_Type_Description\" = \'ePermit Water Repair ' or \"Permit_Type_Description\" = \'ePermit WaterHeater Replacement ' or \"Permit_Type_Description\" = \'ePermit Siding Replacement ' or \"Permit_Type_Description\" = \'ePermit Roof Overlay ' or \"Permit_Type_Description\" = \'ePermit Residential Ductless ' or \"Permit_Type_Description\" = \'ePermit Irrigation BackflowPreventer ' or \"Permit_Type_Description\" = \'ePermit HeatPump Replacement ' or \"Permit_Type_Description\" = \'ePermit Furnace Replacement ' or \"Permit_Type_Description\" = \'ePermit Commercial Strip ' or \"Permit_Type_Description\" = \'ePermit Commercial Overlay ' or \"Permit_Type_Description\" = \'Building Residential Fire Protection ' or \"Permit_Type_Description\" = \'Building Commercial Fire Protection ' or \"Permit_Type_Description\" = \'Building Residential Mechanical ' or \"Permit_Type_Description\" = \'Building Commercial Mechanical ' or \"Permit_Type_Description\" = \'Building Residential Plumbing ' or \"Permit_Type_Description\" = \'Building Commercial Plumbing ' or \"Permit_Type_Description\" = \'Sign ' or \"Permit_Type_Description\" = \'Special Event ' ) ";
    } else {
      return " and (\"Permit_Type_Description\" = \'" + document.getElementById(value).value + "' ) "; //get value from menu, space included in menu value
    }
  } else if (value =='Utility') {
    if (document.getElementById(value).value =='All') {
  	  return " and (\"Permit_Type_Description\" = \'Utility Connection Water ' or \"Permit_Type_Description\" = \'Utility Connection Wastewater ' or \"Permit_Type_Description\" = \'Utility Connection Surfacewater ' ) ";
    } else {
      return " and (\"Permit_Type_Description\" = \'" + document.getElementById(value).value + "' ) "; //get value from menu, space included in menu value
    }
  } else if (value =='ROW') {
    if (document.getElementById(value).value =='All') {
  	  return " and (\"Permit_Type_Description\" = \'Right-of-Way Utility ' or \"Permit_Type_Description\" = \'Right-of-Way Use ' or \"Permit_Type_Description\" = \'Right-of-Way Tree ' or \"Permit_Type_Description\" = \'Right-of-Way Occupancy ' or \"Permit_Type_Description\" = \'Right-of-Way Construction ' or \"Permit_Type_Description\" = \'ePermit Tree ' ) ";
    } else {
      return " and (\"Permit_Type_Description\" = \'" + document.getElementById(value).value + "' ) "; //get value from menu, space included in menu value
    }
  } else {
  	  return "";  //All & any other values
  }
}

function statusString(value) {
  if (value =='Application') {
 	  return " and (\"Current_Status\" = \'Addl Information Required' or \"Current_Status\" = \'Application Accepted' or \"Current_Status\" = \'Application Submitted' or \"Current_Status\" = \'Complete Application' or \"Current_Status\" = \'Consultation Meeting Required' or \"Current_Status\" = \'Electronic Review Only' or \"Current_Status\" = \'Incomplete Application' or \"Current_Status\" = \'Intake' or \"Current_Status\" = \'Meeting Scheduled' or \"Current_Status\" = \'Missing or Incorrect Info' or \"Current_Status\" = \'Missing Required Documents' or \"Current_Status\" = \'Pending Intake Screening' or \"Current_Status\" = \'Permit Fees Due' or \"Current_Status\" = \'Resbumittal Required' or \"Current_Status\" = \'Waiting for Information' ) ";  
  } else if (value =='Review') {
  	  return " and (\"Current_Status\" = \'Appeal Pending' or \"Current_Status\" = \'Approved w/ Corrections' or \"Current_Status\" = \'Awaiting Resubmitatl/Revisions' or \"Current_Status\" = \'Awaiting Resubmittal' or \"Current_Status\" = \'Awaiting Resubmittal/Revisions' or \"Current_Status\" = \'Comments Pending' or \"Current_Status\" = \'Comments Provided' or \"Current_Status\" = \'Comments Sent' or \"Current_Status\" = \'Correction Review in Process' or \"Current_Status\" = \'Decision Pending' or \"Current_Status\" = \'Pending Internal Action' or \"Current_Status\" = \'In Process' or \"Current_Status\" = \'In Review' or \"Current_Status\" = \'Plan Review in Process' or \"Current_Status\" = \'Plan Review in Progress' or \"Current_Status\" = \'Plans Routed for Review' or \"Current_Status\" = \'Precon Meeting Required' or \"Current_Status\" = \'Ready to Issue' or \"Current_Status\" = \'Reconsideration Pending' or \"Current_Status\" = \'Revision Review in Process' or \"Current_Status\" = \'Revisions Required' or \"Current_Status\" = \'Revisions Routed for Review' or \"Current_Status\" = \'Revisons Required' or \"Current_Status\" = \'Staff Report Complete' or \"Current_Status\" = \'Staff Report In Process' ) ";
  } else if (value =='Inspections') {
  	  return " and (\"Current_Status\" = \'Field Revisions' or \"Current_Status\" = \'NPDES Inspection Required' or \"Current_Status\" = \'Permit Issued' or \"Current_Status\" = \'Revisions Approved' ) ";
  } else if (value =='Finalized') {
  	  return " and (\"Current_Status\" = \'Canceled' or \"Current_Status\" = \'Cancelled' or \"Current_Status\" = \'Closed' or \"Current_Status\" = \'C of O Issued' or \"Current_Status\" = \'Cert of Completion Issued' or \"Current_Status\" = \'Decision Final' or \"Current_Status\" = \'Decision Issued' or \"Current_Status\" = \'Denied' or \"Current_Status\" = \'Expired' or \"Current_Status\" = \'Final' or \"Current_Status\" = \'Final Decision' or \"Current_Status\" = \'Finaled' or \"Current_Status\" = \'Final Inspection' or \"Current_Status\" = \'Permit Canceled' or \"Current_Status\" = \'Permit Denied' or \"Current_Status\" = \'Permit Expired' or \"Current_Status\" = \'Permit Finaled' or \"Current_Status\" = \'Temp CO Issued' ) ";
   } else {
  	  return "";  //All & any other values
  }
}  	

//Create map
google.maps.event.addDomListener(window, 'load', initialize);


