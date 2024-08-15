$(document).ready(function() {

	// Function to fetch country data and populate select menu
	function country() {
	  fetch('/countries.json', {
		method: 'GET'
	  })
	  .then(response => response.json())
	  .then(json => {
		// Loop to get country list
		json.features.forEach(function(feature) {
		  $('#country-select').append('<option value="'+feature.properties.name+'">'+feature.properties.name+'</option>');
		});
	  })
	  .catch(error => {
		console.error('Error fetching countries:', error);
	  });
	}
  
	// Function to initialize modal dialog
	function newAction() {
	  var dialog = $( "#dialog" ).dialog({
		autoOpen: false,
		modal: true,
		buttons: {
		  寄出: function() {
			// addTab();
			$( this ).dialog( "close" );
		  },
		  取消: function() {
			$( this ).dialog( "close" );
		  }
		},
		close: function() {
		  form[ 0 ].reset();
		}
	  });
  
	  var form = dialog.find( "form" ).on( "submit", function( event ) {
		// addTab();
		dialog.dialog( "close" );
		event.preventDefault();
	  });
  
	  // Open dialog on button click
	  $( "#action_btn" )
		//.button()
		.on( "click", function() {
		  dialog.dialog( "open" );
		  console.log('dialog open');
		});
	}
  
	// Invoke the functions
	country();
	newAction();
  
  });
  