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


	async function addpostcard(dialog) {

		// 從 localStorage 獲取 JWT
		const token = localStorage.getItem('token')

		// 取得圖片網誌
		let imglink = saveCanvas();
		if (!imglink) {
			alert("圖片存檔失敗！");
			console.log("圖片存檔失敗！");
			return;
		}


		// Promise
		const getLocation = () => new Promise((resolve, reject) => {
			// 檢查瀏覽器是否支援地理定位 
			if (navigator.geolocation) {
				console.log("取得瀏覽器定位")
				navigator.geolocation.getCurrentPosition(position => {
					resolve({
					// 取得經緯度
					latitude : position.coords.latitude,
					longitude : position.coords.longitude
					});
				})}
			else {
				console.log("瀏覽器不支援定位")
				resolve({ latitude: null, longitude: null });
			}
		})

		// 等待地理定位结果
		const { latitude: locLatitude, longitude: locLongitude } = await getLocation();


		// var formData = new FormData(form);  // 使用傳入的表單

		// 將 Formdata 變成 JSON 格式
		var jsonformData = {
			// mailFrom: $('#mailFrom').val(),
			// country: $('#country-select').val(),
			message: $('#tab_title').val(),
			latitude : locLatitude,
			longitude : locLongitude,
			imglink : imglink
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
  


function saveCanvas() {
	// 從 localStorage 獲取 JWT
	const token = localStorage.getItem('token')


		html2canvas(document.querySelector("#paper")).then(canvas => {
			canvas.toBlob(function(blob) {
				var formData = new FormData();
				formData.append('canvas_image', blob, 'canvas-image.png');
	
				fetch('/api/saveCanvas', {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${token}`
					},
					body: formData
				})
				.then(data => {
					console.log("Upload to S3 ok:", data);
					return data.img_link;
				  })
				  .catch(error => {
					console.error("Form submission failed:", error);
					return null;
				  });
				})
			})
}
