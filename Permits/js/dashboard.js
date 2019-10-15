//var permitsResourceId = "5dcf6d6b-ed48-4b73-837e-95b8dd1967f3";  //Tacoma ID 
//var permitsResourceId = "1cd053ea-736c-4b73-b8e3-f4481b461ba1";  //Tacoma ID - 2019-01-03
//var permitsResourceId = "1fd70285-6b2c-42a2-a9c2-0259083d0c68";  //Tacoma ID - 2019-02-05
//var permitsResourceId = "609e900f-8479-41b8-94f9-3b43da63bf77";  //Tacoma ID - 2019-02-28
//var permitsResourceId = "9d4dd436-5dd6-4222-9646-0387cd106d5e";  //Tacoma ID - 2019-04-11
var permitsResourceId = "08dc8fc9-7d74-452e-9b50-92a8e2f0ad56";  //Tacoma ID - 2019-04-23
var baseURI = "http://www.civicdata.com/api/action/datastore_search_sql?sql=";
var startDate = moment().subtract(30, 'd').format("YYYY-MM-DD");
var startDateMoment = moment().subtract(30, 'd');

//CSV files
var csvContent_New_Applications;
var csvContent_Issued_Permits;
var csvContent_Total_Construction_Cost;

$(document).ready(function() {
     
  // Helper function to make request for JSONP.
  function requestJSON(url, callback) {
    $.ajax({
      beforeSend: function() {
        // Handle the beforeSend event
      },
      url: url,

      timeout: 5000, // a lot of time for the request to be successfully completed - workaround for JSONP error requests (not available in jQuery) 
      error: function (xhr, textStatus, errorThrown) {
       alert('An error has occurred downloading data from CivicData.  Please refresh browser or try later.');
       console.error("data Status: " + xhr.status + ' | ' +"error Status: " + textStatus + ' | ' +"error Thrown: " + errorThrown);        
      },

      complete: function(xhr) {
        callback.call(null, xhr.responseJSON);
         
      }
    });
  }

  /********************************************************************************/
  /* Get all activity in last 30 days (START)
  /********************************************************************************/

  //Query parameters
  var urlLast30Query = "SELECT \"Permit_Number\", \"Description\",\"Applied_Date\",\"Issued_Date\", \"Current_Status\", \"Address_Line_1\", \"Address_Line_2\", \"Zip\",\"Permit_Type_Description\", \"Valuation\", \"Link\", \"Parcel_Number\", \"Lic_Prof_Company_Name\", \"Lic_Prof_Phone_Number\", \"Lic_Prof_Address_Line_1\", \"Lic_Prof_Address_Line_2\", \"Lic_Prof_Email\" from \"permitsResourceId\" where \"Issued_Date\" > \'" + startDate + "' order by \"Applied_Date\"";
  var urlLast30 = baseURI + encodeURIComponent(urlLast30Query.replace("permitsResourceId", permitsResourceId));

  requestJSON(urlLast30, function(json) {
    var records = json.result.records;
	//console.error(JSON.stringify(records));

    //extract permits applied for in last 30 days
    var appliedLast30Days = records.filter(function(d) { 
      return moment(d.Applied_Date) > startDateMoment; 
    });
	//console.error(JSON.stringify(appliedLast30Days));
    
    //extract permits issued in last 30 days
    var issuedLast30Days = records.filter(function(d) { 
      return moment(d.Issued_Date) > startDateMoment; 
    });

    //total construction value for new project in last 30 days
    var totalConstructionValue = d3.sum(appliedLast30Days, function(d) {
      return Number(d.Valuation.replace(/[$,]/g,''));  //remove $ and , from value string
    });

    //Summaries - update web page
    $("#newApplications").text(appliedLast30Days.length);
    $("#issuedPermits").text(issuedLast30Days.length);
    $("#totalConstructionValue").text(numeral(totalConstructionValue).format('($ 0.00 a)'));

  	//Update CSV files for download - d3.csvFormat  - https://github.com/d3/d3-dsv/blob/master/README.md#csvFormat - https://d3js.org/d3.v4.min.js - update with just listed fields
  	csvContent_New_Applications = d3.csvFormat(appliedLast30Days, ["Permit_Number", "Description", "Applied_Date", "Current_Status", "Address_Line_1", "Address_Line_2", "Zip", "Permit_Type_Description", "Link", "Parcel_Number", "Lic_Prof_Company_Name", "Lic_Prof_Phone_Number", "Lic_Prof_Address_Line_1", "Lic_Prof_Address_Line_2", "Lic_Prof_Email"]);  
  	csvContent_Issued_Permits = d3.csvFormat(issuedLast30Days, ["Permit_Number", "Description", "Issued_Date", "Current_Status", "Address_Line_1", "Address_Line_2", "Zip", "Permit_Type_Description", "Link", "Parcel_Number", "Lic_Prof_Company_Name", "Lic_Prof_Phone_Number", "Lic_Prof_Address_Line_1", "Lic_Prof_Address_Line_2", "Lic_Prof_Email"]);
  	csvContent_Total_Construction_Cost = d3.csvFormat(appliedLast30Days, ["Permit_Number", "Description", "Current_Status", "Address_Line_1", "Address_Line_2", "Zip", "Permit_Type_Description", "Valuation", "Link", "Parcel_Number", "Lic_Prof_Company_Name", "Lic_Prof_Phone_Number", "Lic_Prof_Address_Line_1", "Lic_Prof_Address_Line_2", "Lic_Prof_Email"]);
    
    /********************************************************************************/
    /* Calculated permits applied for by day and by type (START)
    /********************************************************************************/
    
    var appliedByDayByType = groupDayResults(appliedLast30Days);   //Group again by broader categories not in the database

    //console.log(appliedByDayByType);
	//console.error(JSON.stringify(appliedByDayByType));
    //Set Colors - http://c3js.org/samples/api_data_color.html
    var cat1 = ['Accessory'];
    var cat2 = ['Building'];
    var cat3 = ['Demolition'];
    var cat4 = ['Right-of-Way'];
    var cat5 = ['Site Development'];
    var cat6 = ['Utility'];

    var datesArray = []; //for x-axis
    var cat1Added = false, cat2Added = false, cat3Added = false, cat4Added = false,  cat5Added = false, cat6Added = false;

    appliedByDayByType.forEach(function(d) {
      //console.error(d);
      var dArray = d.key.split("-");
      datesArray.push(dArray[1] + "-" + dArray[2]);
      //datesArray.push(dArray[2]);  //just day of month

      cat1Added = false;
      cat2Added = false;
      cat3Added = false;
      cat4Added = false;
      cat5Added = false;
      cat6Added = false;

      d.values.forEach(function(i) {
        
        if (i.key == "Accessory") {
          cat1.push(i.values);
          cat1Added = true;
        }
        if (i.key == "Building") {
          cat2.push(i.values);
          cat2Added = true;
        }
        if (i.key == "Demolition") {
          cat3.push(i.values);
          cat3Added = true;
        }
        if (i.key == "Right-of-Way") {
          cat4.push(i.values);
          cat4Added = true;
        }
        if (i.key == "Site Development") {
          cat5.push(i.values);
          cat5Added = true;    
        }
        if (i.key == "Utility") {
          cat6.push(i.values);
          cat6Added = true;
        }

      });

      if (!cat1Added)
        cat1.push(0);
      if (!cat2Added)
        cat2.push(0);
      if (!cat3Added)
        cat3.push(0);
      if (!cat4Added)
        cat4.push(0);
      if (!cat5Added)
        cat5.push(0);
      if (!cat6Added)
        cat6.push(0);
  
    });  //end appliedByDayByType

    //console.error(bld);

    //Create Bar Chart - http://c3js.org/gettingstarted.html
    var chart = c3.generate({
      bindto: '#byDay',
      data: {
        columns: [
            cat1,
            cat2,
            cat3,
            cat4,
            cat5,
            cat6
        ],
        type: 'bar',
        colors: {
        	"Accessory": '#1F77B4',
        	"Building": '#FF7F0E',
        	"Demolition": '#8C564B',
        	"Right-of-Way": '#D62728',
        	"Site Development": '#2CA02C',
        	"Utility":'#9467BD'
        },
     },
      grid: {
        y: {
          lines: [{value:0}]
        }
      },
      axis: {
        x: {
          type: 'category',
	        tick: {
	            rotate: 75,
	            multiline: false
	        },
	        height: 50,
          categories: datesArray
        }
      }
    });


    setTimeout(function () {
      //stack groups on top of each other & list of which ones to show
      chart.groups([['Accessory','Building','Demolition','Right-of-Way','Site Development','Utility']])
    }, 1000);

  }); //end requestJSON

    /********************************************************************************/
    /* Calculated permits applied for by day and by type (END)
    /********************************************************************************/
    

  /********************************************************************************/
  /* Get all permit details in last 30 days (END)
  /********************************************************************************/
  
  /********************************************************************************/
  /* Permits by type (START)
  /********************************************************************************/ 

  forceDelay(1000);

  var permitTypesQuery = "SELECT \"Permit_Type_Description\", count(*) as Count from \"permitsResourceId\" where \"Issued_Date\" > '" + startDate + "' group by \"Permit_Type_Description\" order by Count desc";
  var permitTypesQ = baseURI + encodeURIComponent(permitTypesQuery.replace("permitsResourceId", permitsResourceId));
      
  requestJSON(permitTypesQ, function(json) {
    var recordsIntial = json.result.records    
    var permitTypes = [];
	var recordsUnsorted = groupResults(recordsIntial);  //Group again by broader categories not in the database
	var records = sortArray(recordsUnsorted);  //Sort alphabetically

	//console.error(JSON.stringify(records));

   for (var i = 0; i < records.length; i++) {
		permitTypes.push([records[i]["key"], records[i].values]);  //Create a distinct list
    }
   //console.error(permitTypes);
	//console.error(JSON.stringify(permitTypes));

    //Create Pie Chart
    var chart = c3.generate({
      bindto: '#permitTypes',
      data: {
        columns: permitTypes,
        type : 'pie',
        colors: {
        	"Accessory": '#1F77B4',
        	"Building": '#FF7F0E',
        	"Demolition": '#8C564B',
        	"Right-of-Way": '#D62728',
        	"Site Development": '#2CA02C',
        	"Utility":'#9467BD'
        },
      },
      donut: {
        title: "Permit Types"
      }
    }); 
        
  });

  /********************************************************************************/
  /* Permits by type (END)
  /********************************************************************************/ 
});

function sortArray(records) {
	//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
	// sort by value (numbers)
	/*
	items.sort(function (a, b) {
	  return a.value - b.value;
	});
	*/
	//sort alphabetically
	records.sort(function(a, b) {
	  var keyA = a.key.toUpperCase(); // ignore upper and lowercase
	  var keyB = b.key.toUpperCase(); // ignore upper and lowercase
	  if (keyA < keyB) {
	    return -1;
	  }
	  if (keyA > keyB) {
	    return 1;
	  }

	  // keys must be equal
	  return 0;
	});

	return records;
}

function groupResults(records) {
 //Create new object with summarized permit categories using records object
 //NO land Use permits because no Issued_Date values!!!!!
	 //console.error(JSON.stringify(records));

	 var groupOne = [];  //new object to hold all new values from results, including count
	 for (var i = 0; i < records.length; i++) {
	     //loop through results and replace Permit_Type_Description value into new object
	     if (records[i].Permit_Type_Description == 'Building Residential Alteration ' || records[i].Permit_Type_Description == 'Building Residential New Building ' || records[i].Permit_Type_Description == 'Building Commercial Alteration ' || records[i].Permit_Type_Description == 'Building Commercial New Building ') {
	     	newDescription = 'Building';
	     } else if (records[i].Permit_Type_Description == 'Building Residential Demolition ' || records[i].Permit_Type_Description == 'Building Commercial Demolition ' || records[i].Permit_Type_Description == 'ePermit Residential Demo ' || records[i].Permit_Type_Description == 'ePermit Residential Demolition ' || records[i].Permit_Type_Description == 'ePermit Residential Access||y Demolition ' || records[i].Permit_Type_Description == 'ePermit Residential Access||y Demolition No Fee ') {
	     	newDescription = 'Demolition';
	     } else if (records[i].Permit_Type_Description == 'Site Development ' || records[i].Permit_Type_Description == 'Site Noise Variance ' || records[i].Permit_Type_Description == 'Site Work Order ') {
	     	newDescription = 'Site Development';
	     } else if (records[i].Permit_Type_Description == 'ePermit Fire Alarm ' || records[i].Permit_Type_Description == 'ePermit Fire Sprinkler ' || records[i].Permit_Type_Description == 'ePermit Fire Transmitter ' || records[i].Permit_Type_Description == 'ePermit Residential Mechanical ' || records[i].Permit_Type_Description == 'ePermit Window Replacement ' || records[i].Permit_Type_Description == 'ePermit Water Repair ' || records[i].Permit_Type_Description == 'ePermit WaterHeater Replacement ' || records[i].Permit_Type_Description == 'ePermit Siding Replacement ' || records[i].Permit_Type_Description == 'ePermit Roof Overlay ' || records[i].Permit_Type_Description == 'ePermit Residential Ductless ' || records[i].Permit_Type_Description == 'ePermit Irrigation BackflowPreventer ' || records[i].Permit_Type_Description == 'ePermit HeatPump Replacement ' || records[i].Permit_Type_Description == 'ePermit Furnace Replacement ' || records[i].Permit_Type_Description == 'ePermit Commercial Strip ' || records[i].Permit_Type_Description == 'ePermit Commercial Overlay ' || records[i].Permit_Type_Description == 'Building Residential Fire Protection ' || records[i].Permit_Type_Description == 'Building Commercial Fire Protection ' || records[i].Permit_Type_Description == 'Building Residential Mechanical ' || records[i].Permit_Type_Description == 'Building Commercial Mechanical ' || records[i].Permit_Type_Description == 'Building Residential Plumbing ' || records[i].Permit_Type_Description == 'Building Commercial Plumbing ' || records[i].Permit_Type_Description == 'Sign ' || records[i].Permit_Type_Description == 'Special Event ') {
	     	newDescription = 'Accessory';
	     } else if (records[i].Permit_Type_Description == 'Utility Connection Water ' || records[i].Permit_Type_Description == 'Utility Connection Wastewater ' || records[i].Permit_Type_Description == 'Utility Connection Surfacewater ') {
	     	newDescription = 'Utility';
	     } else if (records[i].Permit_Type_Description == 'Right-of-Way Utility ' || records[i].Permit_Type_Description == 'Right-of-Way Use ' || records[i].Permit_Type_Description == 'Right-of-Way Tree ' || records[i].Permit_Type_Description == 'Right-of-Way Occupancy ' || records[i].Permit_Type_Description == 'Right-of-Way Construction ' || records[i].Permit_Type_Description == 'ePermit Tree ') {
	     	newDescription = 'Right-of-Way';
	     } else {
	     	newDescription = records[i].Permit_Type_Description;  //For default value use Permit_Type_Description value
	     };
	     	 //Add to object with new Permit_Type_Description
	     	 groupOne[i] = {
	     	 	Permit_Type_Description: newDescription,  
	     	 	count: records[i].count
	     	 };
	 }

		//Group by permit description type using d3 - http://learnjsdata.com/group_data.html
		//Permit_Type_Description becomes "key" and count becomes "values"
		var permitTypeCount = d3.nest()
		  .key(function(d) { return d.Permit_Type_Description; })
		  .rollup(function(v) { return d3.sum(v, function(d) { return d.count; }); })
		  .entries(groupOne);
		//console.error(JSON.stringify(permitTypeCount));

	return permitTypeCount; //new summary object with 6 permit categories 
}

function groupDayResults(records) {
 //Create new object with summarized permit categories using records object
 //INCLUDES land Use permits because no Issued_Date values!!!!!
	 //console.error(JSON.stringify(records));

	 var groupOne = [];  //new object to hold all new values from results, including count
	 for (var i = 0; i < records.length; i++) {
	     //loop through results and replace Permit_Type_Description value into new object
	     if (records[i].Permit_Type_Description == 'Building Residential Alteration ' || records[i].Permit_Type_Description == 'Building Residential New Building ' || records[i].Permit_Type_Description == 'Building Commercial Alteration ' || records[i].Permit_Type_Description == 'Building Commercial New Building ') {
	     	newDescription = 'Building';
	     } else if (records[i].Permit_Type_Description == 'Building Residential Demolition ' || records[i].Permit_Type_Description == 'Building Commercial Demolition ' || records[i].Permit_Type_Description == 'ePermit Residential Demo ' || records[i].Permit_Type_Description == 'ePermit Residential Demolition ' || records[i].Permit_Type_Description == 'ePermit Residential Access||y Demolition ' || records[i].Permit_Type_Description == 'ePermit Residential Access||y Demolition No Fee ') {
	     	newDescription = 'Demolition';
	     } else if (records[i].Permit_Type_Description == 'Site Development ' || records[i].Permit_Type_Description == 'Site Noise Variance ' || records[i].Permit_Type_Description == 'Site Work Order ') {
	     	newDescription = 'Site Development';
	     } else if (records[i].Permit_Type_Description == 'ePermit Fire Alarm ' || records[i].Permit_Type_Description == 'ePermit Fire Sprinkler ' || records[i].Permit_Type_Description == 'ePermit Fire Transmitter ' || records[i].Permit_Type_Description == 'ePermit Residential Mechanical ' || records[i].Permit_Type_Description == 'ePermit Window Replacement ' || records[i].Permit_Type_Description == 'ePermit Water Repair ' || records[i].Permit_Type_Description == 'ePermit WaterHeater Replacement ' || records[i].Permit_Type_Description == 'ePermit Siding Replacement ' || records[i].Permit_Type_Description == 'ePermit Roof Overlay ' || records[i].Permit_Type_Description == 'ePermit Residential Ductless ' || records[i].Permit_Type_Description == 'ePermit Irrigation BackflowPreventer ' || records[i].Permit_Type_Description == 'ePermit HeatPump Replacement ' || records[i].Permit_Type_Description == 'ePermit Furnace Replacement ' || records[i].Permit_Type_Description == 'ePermit Commercial Strip ' || records[i].Permit_Type_Description == 'ePermit Commercial Overlay ' || records[i].Permit_Type_Description == 'Building Residential Fire Protection ' || records[i].Permit_Type_Description == 'Building Commercial Fire Protection ' || records[i].Permit_Type_Description == 'Building Residential Mechanical ' || records[i].Permit_Type_Description == 'Building Commercial Mechanical ' || records[i].Permit_Type_Description == 'Building Residential Plumbing ' || records[i].Permit_Type_Description == 'Building Commercial Plumbing ' || records[i].Permit_Type_Description == 'Sign ' || records[i].Permit_Type_Description == 'Special Event ') {
	     	newDescription = 'Accessory';
	     } else if (records[i].Permit_Type_Description == 'Utility Connection Water ' || records[i].Permit_Type_Description == 'Utility Connection Wastewater ' || records[i].Permit_Type_Description == 'Utility Connection Surfacewater ') {
	     	newDescription = 'Utility';
	     } else if (records[i].Permit_Type_Description == 'Right-of-Way Utility ' || records[i].Permit_Type_Description == 'Right-of-Way Use ' || records[i].Permit_Type_Description == 'Right-of-Way Tree ' || records[i].Permit_Type_Description == 'Right-of-Way Occupancy ' || records[i].Permit_Type_Description == 'Right-of-Way Construction ' || records[i].Permit_Type_Description == 'ePermit Tree ') {
	     	newDescription = 'Right-of-Way';
	     } else {
	     	newDescription = records[i].Permit_Type_Description;  //For default value use Permit_Type_Description value
	     };
	     	 //Add to object with new Permit_Type_Description
	     	 groupOne[i] = {
	     	 	Applied_Date: records[i].Applied_Date,
	     	 	Permit_Type_Description: newDescription
	     	 };
	 }

		//Group by permit description type using d3 - http://learnjsdata.com/group_data.html
		//Permit_Type_Description becomes "key" and count becomes "values" by the date key
		var permitTypeDayCount = d3.nest()
		  .key(function(d) { return d.Applied_Date })
		  .key(function(d) { return d.Permit_Type_Description; })
		  .rollup (function(v) { return v.length })
		  .entries(groupOne);
		//console.error(JSON.stringify(permitTypeDayCount));

	return permitTypeDayCount; //new summary object with 7 permit categories 
}

function exportToCSV(filename) {
        //https://jsfiddle.net/jossef/m3rrLzk0/
        //console.error('here');
        //console.error(filename);

        //Update variables
        if (filename == 'New_Applications.csv'){
        	var csvFile = csvContent_New_Applications;
        } else if (filename == 'Issued_Permits.csv') {
        	var csvFile = csvContent_Issued_Permits;
        } else if (filename == 'Total_Construction_Cost.csv') {
        	var csvFile = csvContent_Total_Construction_Cost;
        } else {
        	console.error('File name incorrect: ', filename);
        	return;
        }	

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
    
function forceDelay(millis) {
  var date = new Date();
  var curDate = null;

  do { curDate = new Date(); } 
    while (curDate - date < millis);
}
