// The goale of Lab1 is to make a time series proportional symbol map from at least 15 geographic points with having 7 time sequencing attributes
var basemap;
//Create the Leaflet map
function createMap(){
    //create the map
    var map = L.map('mapid', {
        center: [41.257160, -95.995102],
        zoom:4.3,
		minzoom:2,
		maxzoom:18
    });

    //add OSM base tilelayer
    basemap = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    //calling the getData function
    getData(map);
};


var currentYear;
var stateLayer;
var popLayer;

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //scale factor to adjust symbol size evenly
    var scaleFactor = 0.00015;
    //area based on attribute value and scale factor
    var area = attValue * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);

    return radius;
};

//Start Create Popup Message.
function Popup(properties, attribute, layer, radius){
    this.properties = properties;
    this.attribute = attribute;
    this.layer = layer;
    this.year = attribute.split("_")[1];
    this.population = this.properties[attribute];
    this.content = "<p class='infowindow'> Estimated Population in 2018 in the State of "+this.properties.State+" was: " + this.properties.Pop_2018 + " "+ "<br>" + "<p3>Source of Data:United States Census Bureau</p3>"+"</p>";

    this.bindToLayer = function(){
        this.layer.bindPopup(this.content, {
            offset: new L.Point(0,-radius)
        });
    };
};
// End Create Popup Message.



//Begine function to convert markers to circle
function pointToLayer(feature, latlng, attributes){
    //Assign the current attribute based on the first index of the attributes array
    var attribute = attributes[0];

    //create marker options
    var options = {
        fillColor: "rgba(125,6,4,0.9)",
        color: "white",
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //Example 1.3 line 1...in pointToLayer()
    //create new popup
    var popup = new Popup(feature.properties, attribute, layer, options.radius);

    //add popup to circle marker
    popup.bindToLayer();

    //event listeners to open popup on hover and fill panel on click
    layer.on({
        mouseover: function(){
            this.openPopup();
        },
        mouseout: function(){
            this.closePopup();
        }
    });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};
//End function to convert markers to circle




//Begine an attributes array from the data
function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;
    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("Pop") > -1){
            attributes.push(attribute);
        };
    };

    return attributes;
};
//End of an attributes array from the data


//Begine adding circle markers for point features to the map
function createPropSymbols(data, map, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    popLayer = L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};
//End adding circle markers for point features to the map


//Begine Resize proportional symbols according to new attribute values
function updatePropSymbols(map, attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //UpdatePropSymbols()
            var popup = new Popup(props, attribute, layer, radius);

            //add popup to circle marker
            popup.bindToLayer();
        };
    });

    updateLegend(map, attribute);
};
//End Resize proportional symbols according to new attribute values


//Begine Create Legend Function.
function createLegend(map, attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function (map) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            //add temporal legend div to container
            $(container).append('<div id="temporal-legend">')

            //Step 1: start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="190px" height="120px">';

            //object to base loop
            var circles = {
                max: 82,
                mean: 110,
                min:45,
            };

            //loop to add each circle and text to svg string
            for (var circle in circles){
                //circle string
                svg += '<circle class="legend-circle" id="' + circle + '" fill="rgba(125,6,4,1)" fill-opacity="0.8" stroke="white" cx="70"/>';

                //text string
                svg += '<text id="' + circle + '-text" x="115" y="' + circles[circle] + '"></text>';
            };

            //close svg string
            svg += "</svg>";
            //add attribute legend svg to container
            $(container).append(svg);

            return container;
        }
    });

    map.addControl(new LegendControl());

    updateLegend(map, attributes[0]);
};
//End Create Legend Function.



//Begine Calculate the max, mean, and min values for a given attribute
function getCircleValues(map, attribute){
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
        max = -Infinity;

    map.eachLayer(function(layer){
        //get the attribute value
        if (layer.feature){
            var attributeValue = Number(layer.feature.properties[attribute]);

            //test for min
            if (attributeValue < min){
                min = attributeValue;
            };

            //test for max
            if (attributeValue > max){
                max = attributeValue;
            };
        };
    });

    //set mean
    var mean = (max + min) / 2;

    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};
//End Calculate the max, mean, and min values for a given attribute



// Begine Update the legend with new attribute
function updateLegend(map, attribute){
    //create content for legend
    var year = attribute.split("_")[1];
    var content = "Population in " + year;

    //replace legend content
    $('#temporal-legend').html(content);

    //get the max, mean, and min values as an object
    var circleValues = getCircleValues(map, attribute);

    for (var key in circleValues){
        //get the radius
        var radius = calcPropRadius(circleValues[key]);

        //Step 3: assign the cy and r attributes
        $('#'+key).attr({
            cy: 110 - radius,
            r: radius
        });

        //Step 4: add legend text
        $('#'+key+'-text').text(Math.round(circleValues[key]*100)/100);
    };
};
// End Update the legend with new attribute



// Begine Create Sequence Control Function
function createSequenceControls(map, attributes){
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function (map) {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            //create range input element (slider)
            $(container).append('<input class="range-slider" type="range">');

            //add skip buttons
            $(container).append('<button class="skip" id="reverse" title="Reverse">Reverse</button>');
            $(container).append('<button class="skip" id="forward" title="Forward">Skip</button>');

            //disable any mouse event listeners for the container
            L.DomEvent.disableClickPropagation(container);

            return container;
        }
		
    });

    map.addControl(new SequenceControl());
	

	//set slider attributes
	$('.range-slider').attr({
		max: 8,
		min: 0,
		value: 0,
		step: 1
	});

	//replace button content with images

	$('#reverse').html('<img src="img/reverse.png">');
	$('#forward').html('<img src="img/forward.png">');

	//click listener for buttons
	$('.skip').click(function(){

		//get the old index value
		var index = $('.range-slider').val();

		//increment or decriment depending on button clicked
		if ($(this).attr('id') == 'forward'){
			index++;
			//if past the last attribute, wrap around to first attribute
			index = index > 8 ? 0 : index;
		} else if ($(this).attr('id') == 'reverse'){
			index--;
			//if past the first attribute, wrap around to last attribute
			index = index < 0 ? 8 : index;
		};

		//update slider
		$('.range-slider').val(index);

		//pass new attribute to update symbols
		updatePropSymbols(map, attributes[index]);
	});

	//input listener for slider
	$('.range-slider').on('input', function(){
		//get the new index value
		var index = $(this).val();

		//pass new attribute to update symbols
		updatePropSymbols(map, attributes[index]);
	});
};
// EndCreate Sequence Control Function



//Begine Import GeoJSON data
function getData(map){
	var promises = [];
	promises.push($.getJSON("data/StatesPopulation.geojson"));
	promises.push($.getJSON("data/State.geojson"));
	Promise.all(promises).then(function(data) {
		var stateData = data[1];
		var popData = data[0];
		
		stateLayer = L.geoJson(stateData).addTo(map);
		
		//create an attributes array
		var attributes = processData(popData);

		createPropSymbols(popData, map, attributes);
		createSequenceControls(map, attributes);
		createLegend(map, attributes);
		
		
		
		
		addLayerControl(map);
	});
};
//End Import GeoJSON data


//Begine adding layer controle
function addLayerControl(map){
	// Creating Layer Control Operator.

	
	var baselayer= {"Base Map": basemap};
	var overlay={"StateLayer": stateLayer,
			"Population": popLayer };

	L.control.layers(baselayer, overlay).addTo(map);

};
//End adding layer controle

$(document).ready(createMap);
