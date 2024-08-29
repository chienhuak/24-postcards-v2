function ranking() {
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
