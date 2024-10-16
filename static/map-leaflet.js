var mymap = L.map('mapid', {
	// options can go in here
  }).setView(
	[25.000205219171278,121.30057531237935], // center is set here   // 經緯度
  4);   // 縮放

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'    // 地圖樣式圖層
  }).addTo(mymap);


  // L.marker([25.000205219171278,121.30057531237935]).addTo(mymap).bindPopup('Hi 我在這裡').openPopup(); // create marker here
  // L.marker([25.000205219171278,100.30057531237935]).addTo(mymap).bindPopup('來自朋友的明信片 <img src="http://via.placeholder.com/100x50">'); // create marker here
  // L.marker([40.000205219171278,80.30057531237935]).addTo(mymap).bindPopup('來自朋友的明信片 <img src="http://via.placeholder.com/100x50">'); // create marker here
  // L.marker([-37.901918, 145.051624]).addTo(mymap).bindPopup('我在澳洲有好可愛的袋鼠！ <img src="http://via.placeholder.com/100x50">'); // create marker here


  function map_marker(selectmap, apiUrl) {

    const token = localStorage.getItem('token')


	// let apiUrl = `/api/collections`
    
    const container2 = document.querySelector('#container2')

    fetch(apiUrl, {
        method: 'GET',
        headers: {'Authorization': `Bearer ${token}`}
    })
        .then(response => response.json())
        .then(data => {

			console.log(data)

            for (let i=0;i<data.data.length;i++){

              // L.marker([data.data[i].latitude, data.data[i].longitude]).addTo(mymap).bindPopup(`動態明信片  <img src="${data.data[i].image}">`);

              const marker = L.marker([data.data[i].latitude, data.data[i].longitude])
                .addTo(selectmap)
                .bindPopup(`
                  <div style="width: 200px; height: 200px; display: flex; align-items: center; justify-content: center;">
                    <img src="${data.data[i].image}" style="width: 180px; height: 140px;" alt="Postcard Image">
                  </div>
                `)
                // .openPopup(); // 自動打開彈出框


              // 在短時間內依次打開每個彈出框
              setTimeout(() => marker.openPopup(), i * 3000); // 每個標記延遲3秒打開

            }
            nextPage = data.nextPage; 
        })
        .catch(error => {
            console.error('Error:', error)
        });
}



var mymap2 = L.map('mapid2', {
	// options can go in here
  }).setView(
	[25.000205219171278,121.30057531237935], // center is set here   // 經緯度
  4);   // 縮放

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'    // 地圖樣式圖層
  }).addTo(mymap2);


