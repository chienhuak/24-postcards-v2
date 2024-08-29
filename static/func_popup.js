function ranking(event) {
	event.preventDefault()
	fetch('/api/ranking', {
		method: 'GET'
	  })
	  .then(response => response.json())
	  .then(json => {
		$('#func_popupTitleEl').text("排行榜")
		$('#func_textEl').empty() // 清空舊內容
		// Loop to get list items
		json.data.forEach(function(data) {
			let rankingItem = $('<div class="ranking_item"></div>')
			rankingItem.append('<span>帳號 : '+data.mailFrom+'</span>')
			rankingItem.append('<span>累計寄件 : '+data.total+'</span>')
			$('#func_textEl').append(rankingItem)
		//   $('#func_textEl').append('<div>'+data.mailFrom+'</div>')
		//   $('#func_textEl').append('<div>'+data.total+'</div>')
		})
		$('#func_popupEl').addClass('show'); // 顯示 popup
	  })
	  .catch(error => {
		console.error('Error fetching ranking data:', error)
	  })
}


document.getElementById('closeRank').addEventListener('click', function() {
    document.getElementById('func_popupEl').classList.remove('show')
})




// 顯示未讀數量
function updateUnreadCount() {
	const token = localStorage.getItem('token')
	fetch('/api/unread', {
		headers: {
			'Authorization': `Bearer ${token}`, // 將 JWT 放在 Authorization Header 中
			'Content-Type': 'application/json'
		},
		method: 'GET'
	  })
	  .then(response => response.json())
	  .then(data => {

		const unreadCount = document.getElementById('unreadCount');
		unreadCount.textContent = data.data[0].count // > 0 ? count : ''; // 如果沒有未讀訊息則隱藏
})
}

updateUnreadCount()


