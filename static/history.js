const token = localStorage.getItem('token')

function history() {
	fetch('/api/history', {
	headers: {
		'Authorization': `Bearer ${token}`, // 將 JWT 放在 Authorization Header 中
		'Content-Type': 'application/json'
		},
	method: 'GET'
	})
	.then(response => response.json())
	.then(data => {
	console.log(data)
	data.data.forEach(function(item) {
		const historyDiv = document.getElementById('history-div')
		const dataDiv = document.createElement('div')
		dataDiv.className = "dataDiv"
		const dataSpan1 = document.createElement('span')
		const dataSpan2 = document.createElement('span')
		const dataSpan3 = document.createElement('span')
		dataSpan1.textContent = item.postcardID
		dataSpan2.textContent = item.timecreated
		if (item.mailTo) {
			dataSpan3.textContent = "信件已寄達"
		} else {
			dataSpan3.textContent = "配送中..."
		}
		dataDiv.append(dataSpan1)
		dataDiv.append(dataSpan2)
		dataDiv.append(dataSpan3)
		historyDiv.append(dataDiv)
	}).catch(error => {
	console.error('Error fetching data:', error)
	})
})
}

history()





