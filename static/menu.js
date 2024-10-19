$(document).ready(function() {

	// Function to fetch country data
	function country() {
		fetch('/static/allcountry.json', {
		method: 'GET'
		})
		.then(response => response.json())
		.then(json => {
		// Loop to get country list
		json.forEach(function(country) {
			$('#country-select').append('<option value='+country.cca3+'>'+country.name.common+'</option>')
		})

		// Event listener : 根據 selectedCountry 更新 hidden region input	
		$('#country-select').on('change', function() {
			const selectedCountryCode = $(this).val()
			const selectedCountry = json.find(c => c.cca3 === selectedCountryCode)
			if (selectedCountry) {
			$('#region').val(selectedCountry.region)
			// console.log("對應地區：",selectedCountry.region)
			}
		})

		})
		.catch(error => {
		console.error('Error fetching countries:', error)
		})


	}
  


	// 改成全域函式
	window.newAction = function() {
	// Function to initialize modal dialog
	// function newAction() {
	  var dialog = $( "#dialog" ).dialog({
		autoOpen: false,
		modal: true,
		buttons: {
		  '寄出(v2系統配對)': async function() {
			const result = await pairing_v2(form[0])
			console.log("檢查 pairing_v2 result:", result);
		},

		//   '寄出(v1系統配對)': function() {
		// 	// addTab();
		// 	addpostcard(form[0]);
		// 	$( this ).dialog( "close" );
		//   },
		  '寄出(指定收件人)': async function() {
			const result = await mailto(form[0])
			console.log("檢查 mailto result:", result);
			if (result) {
				alert("信件成功寄出囉，但是需要一點時間才會寄達！")
				$( this ).dialog( "close" )
			}
		  },
		  '取消': function() {
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
		.on( "click", async function() {

			const isLoggedIn = await checkLoginStatus();
		  
			if (isLoggedIn) {
				dialog.dialog("open");
				console.log('dialog open');
				chooseStamp()
			} else {
				alert("請先註冊或登入，才可以使用寄信功能！");
			}
		});
	}



	// 選擇郵票
	function chooseStamp() {
		const token = localStorage.getItem('token')
		fetch('/api/stamps', {
			method: 'GET',
			headers: {'Authorization': `Bearer ${token}`}
			})
			.then(response => response.json())
			.then(data => {
				console.log(data.unlock)

				const chooseStamp = document.getElementById('choose-stamp')
				chooseStamp.innerHTML = ""

				data.unlock.forEach(stamp => {
					console.log(stamp)
					const stampDiv = document.createElement('div')
					stampDiv.className = "stampDiv"
					const stampImg = document.createElement('img')
					stampImg.className = "stampImg"
					stampDiv.classList.add('stamp')
					stampImg.src = stamp.image_url
					stampDiv.appendChild(stampImg)
					chooseStamp.appendChild(stampDiv)

					// Event listener : 根據 click 	
					$(stampDiv).on('click', function() {

						addStamp(stamp.image_url)

					})
				})
		})
	}







	async function addpostcard(dialog) {

		// 從 localStorage 獲取 JWT
		const token = localStorage.getItem('token')

		let imglink = await saveCanvas();
		// console.log(imglink);
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
			message: $('#tab_title').val() || '', // 如果有值填入，否則空值
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


      // 系統配對V2
	  async function pairing_v2() {
		// 調用後端 API 進行配對
		const token = localStorage.getItem('token');

		fetch("/api/pairing", {
			headers: {
				'Authorization': `Bearer ${token}`, // 將 JWT 放在 Authorization Header 中
				'Content-Type': 'application/json'
			},
			method: "GET"
		})
		.then(response => response.json())
		.then(data => {
			console.log("Success get backend data:", data)
			const pairedUserId = data.pair_id

			// 方法一：
			// const pair_card = document.createElement('div')
			// pair_card.className = pair_card

			// const text = document.createElement('p')
			// text.innerText = `隨機配對用戶為: ${pairedUserId}`
			// pair_card.appendChild(text);

			// const confirmButton = document.createElement('button')
			// confirmButton.innerText = '確認寄出'
			// confirmButton.style.marginRight = '10px'
			// confirmButton.onclick = function() {
			// 	alert('已確認寄出');
			// 	document.body.removeChild(pair_card) // 移除彈出視窗
			// 	document.body.removeChild(overlay) // 移除遮罩層
			// };
			// pair_card.appendChild(confirmButton)

			// // 取消按鈕
			// const cancelButton = document.createElement('button')
			// cancelButton.innerText = '取消'
			// cancelButton.onclick = function() {
			// 	document.body.removeChild(pair_card) // 移除彈出視窗
			// 	document.body.removeChild(overlay) // 移除遮罩層
			// };
			// pair_card.appendChild(cancelButton)

			// // 建立背景遮罩層
			// const overlay = document.createElement('div')

			// // 將彈出視窗和遮罩層加入到 body
			// document.body.appendChild(overlay)
			// document.body.appendChild(pair_card)


			// 方法二：
			// 顯示配對用戶信息和"確認寄出"按鈕
			const confirmDialog = $("<div></div>").html(`
				<p>系統已為你隨機配對用戶 ID: ${pairedUserId}</p>
				<button id="confirm-send">確認寄出</button>
			`)

			// 將對話框加入到 body 並設置為彈出對話框
			confirmDialog.appendTo("body").dialog({
				modal: true, // 模態對話框
				title: "系統配對結果", // 對話框標題
				buttons: {
				'取消': function() {
					$(this).dialog("close"); // 關閉對話框
				}
				}
			})

			// 方法三：
			// $( "#dialog" ).dialog({
			// 	modal: true, // 模態對話框
			// 	title: "系統配對結果", // 對話框標題
			// 	buttons: {
			// 	'確認寄出': function() {
			// 		$(this).dialog("close"); // 關閉對話框
			// 	},	
			// 	'取消': function() {
			// 		$(this).dialog("close"); // 關閉對話框
			// 	}
			// 	}
			// })


		})
		.catch(error => {
		  console.error("Failed get backend data:", error)
		})

	  }



	  // 指定收件人 
	  async function mailto(dialog) {

		// 從 localStorage 獲取 JWT
		const token = localStorage.getItem('token')

		let imglink = await saveCanvas();
		// console.log(imglink);
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

		// 請用戶輸入指定收件人
		const recipient = prompt("請輸入指定收件人 USER ID")
		if (recipient === null || recipient.trim() === "") {
			alert("這是必填欄位，才能夠送出！")
			return
		}

		// var formData = new FormData(form);  // 使用傳入的表單

		// 將 Formdata 變成 JSON 格式
		var jsonformData = {
			// mailFrom: $('#mailFrom').val(),
			// country: $('#country-select').val(),
			message: $('#tab_title').val() || '', // 如果有值填入，否則空值
			latitude : locLatitude,
			longitude : locLongitude,
			imglink : imglink,
			mailto : recipient
		};

		console.log(jsonformData)

		// 修正
		try {
			const response = await fetch("/api/mailto", {
			  headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			  },
			  method: "POST",
			  body: JSON.stringify(jsonformData)
			});
		
			const data = await response.json()
			console.log("Form寄送成功:", data)
			return data
		  } catch (error) {
			console.error("郵件傳送錯誤", error)
			return null 
		  }
		

		// fetch("/api/mailto", {
		// 	headers: {
		// 		'Authorization': `Bearer ${token}`, // 將 JWT 放在 Authorization Header 中
		// 		'Content-Type': 'application/json'
		// 	},
		// 	method: "POST",
		// 	body: JSON.stringify(jsonformData)
		// })
		// .then(response => response.json())
		// .then(data => {
		// 	if (data.data.ok) {
		// 		console.log("Form寄送成功:", data)
		// 		return true // 回傳成功狀態
		// 	} 
		// 	else {
		// 		console.log("寄送失敗，請再試一次", data)
		// 		return false // 回傳失敗狀態
		// 	}
		// })
		// .catch(error => {
		//   console.error("Form寄送失敗:", error)
		//   return false // 回傳失敗狀態
		// })
	  }	  

	// Invoke the functions
	country();
	newAction();
  
  });
  



async function saveCanvas() {
    // 從 localStorage 獲取 JWT
    const token = localStorage.getItem('token');

    try {
        const canvas = await html2canvas(document.querySelector("#paper"));
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(resolve, "image/png");
        });

        const formData = new FormData();
        formData.append('canvas_image', blob, 'canvas-image.png');

        const response = await fetch('/api/saveCanvas', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        console.log("Upload to S3 ok:", data);
        return data.img_link;

    } catch (error) {
        console.error("Error saving canvas:", error);
        return null;
    }
}
