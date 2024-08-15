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
			addpostcard(form[0]);
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


	function addpostcard(dialog) {

		// 從 localStorage 獲取 JWT
		const token = localStorage.getItem('token')

		// var formData = new FormData(form);  // 使用傳入的表單

		// 將 Formdata 變成 JSON 格式
		var jsonformData = {
			// mailFrom: $('#mailFrom').val(),
			// country: $('#country-select').val(),
			message: $('#tab_title').val()
		};

		console.log(jsonformData)

		fetch("/api/postcards", {
			headers: {
				'Authorization': `Bearer ${token}`, // 將 JWT 放在 Authorization Header 中
				'Content-Type': 'application/json'
			},
			method: "POST",
			body: JSON.stringify(jsonformData)
		})
		.then(response => response.json())
		.then(data => {
		  console.log("Form submitted successfully:", data);
		//   dialog.dialog("close");
		})
		.catch(error => {
		  console.error("Form submission failed:", error);
		});
	  }

  
	// Invoke the functions
	country();
	newAction();
  
  });
  