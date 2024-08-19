function collections(page, keyword = "") {

    console.log(page,keyword);

    const token = localStorage.getItem('token')


	let apiUrl = `/api/collections`
    
    const container2 = document.querySelector('#container2')

    fetch(apiUrl, {
        method: 'GET',
        headers: {'Authorization': `Bearer ${token}`}
    })
        .then(response => response.json())
        .then(data => {

			console.log(data)

            for (let i=0;i<data.data.length;i++){
                const div = document.createElement('div')
                div.className = "imgbox"
                const textdiv = document.createElement('div')
                textdiv.className = "textbox"
                const p1 = document.createElement('p')
                p1.className = "p1"
                p1.innerText = data.data[i].country  
                const photo = document.createElement('img')
                photo.className = "myphoto"
                photo.src = data.data[i].image
                photo.innerText          
                div.appendChild(photo)
                div.appendChild(p1)                
                container2.appendChild(div)
                div.appendChild(textdiv)
            }
            nextPage = data.nextPage; 
        })
        .catch(error => {
            console.error('Error:', error)
        });
}