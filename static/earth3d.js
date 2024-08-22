// 創建場景、相機和渲染器
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);  // 參數：相機視野、螢幕長寬比、可渲染物體最近的距離、可渲染物體最遠的距離
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 設置場景背景顏色
scene.background = new THREE.Color(0x000000); // 設置背景顏色

// 創建地球模型
const geometry = new THREE.SphereGeometry(5, 32, 32)
const textureLoader = new THREE.TextureLoader()
const earthTexture = textureLoader.load('./static/image/earth.jpg')
const material = new THREE.MeshBasicMaterial({ map: earthTexture })
const earth = new THREE.Mesh(geometry, material)
scene.add(earth)

// 建立行星模型
const planet = new THREE.Mesh(
	new THREE.SphereGeometry(2.5, 32, 32),
	new THREE.MeshBasicMaterial({ 
		color : 0x51B097,
		map : new THREE.TextureLoader().load('./static/image/water.png')
	 })
)
scene.add(planet)
planet.position.set(7, 0, 0)


camera.position.z = 10
// camera.position.set(0,2,10)


const group = new THREE.Group()
group.add(earth)
scene.add(group)




function coordinatePoint(lat,lng,imageUrl) {

	// 創建座標
	const point = new THREE.Mesh(
		// new THREE.SphereGeometry(0.1, 32, 32),
		new THREE.CircleGeometry(0.1),
		new THREE.MeshBasicMaterial({
			color: '#ff0000'
		})
	)



	// 澳洲 -37.901918, -145.051624
	const latitude = (lat / 180) * Math.PI
	const longitude = ((lng + 90) / 180) * Math.PI  // +90 校正
	const radius = 5
	// console.log({latitude, longitude})
	const x = radius * Math.cos(latitude) * Math.sin(longitude)
	const y = radius * Math.sin(latitude)
	const z = radius * Math.cos(latitude) * Math.cos(longitude)
	console.log({x, y, z})

	// Marker
	const marker = new THREE.Mesh(
		new THREE.PlaneGeometry(1, 1.3),
		new THREE.MeshBasicMaterial({
			map: new THREE.TextureLoader().load(imageUrl),
			transparent: true,
			side: THREE.DoubleSide
		})
	)
	marker.position.set(x * 1.1 ,y * 1.1 ,z * 1.1 ) 

	// 讓明信片水平顯示
	const direction = new THREE.Vector3(x, y, z).normalize()
	const up = new THREE.Vector3(0, 0, 1)
	marker.quaternion.setFromUnitVectors(up, direction)

	earth.add(marker)

	point.position.x = x
	point.position.y = y
	point.position.z = z
	// 讓地標跟著地球旋轉
	point.quaternion.setFromUnitVectors(up, direction)
	earth.add(point)

	// console.log(earth.position)
	console.log(point.position)
}


// 開始轉的地方
earth.rotation.y = Math.PI / 3
earth.rotation.x = Math.PI / 10
coordinatePoint(-25.0002052,144.051624,'./static/image/postcard_template.png')  // 澳洲
coordinatePoint(25.0002052,121.3005753,'./static/image/postcard_template.png')  // 台灣
// 0°經線和0°緯線
coordinatePoint(0,0,'./static/image/postcard_template.png')  


// 創建飛機模型
const planeGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.1);
const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
scene.add(plane);


const mouse = {
	x: undefined,
	y: undefined
}

// 動畫循環與飛機移動
function animate() {
	requestAnimationFrame(animate)
	earth.rotation.y += 0.001; // 地球轉速
	
	// 設置飛機的繞地球路徑
	plane.position.x = 6 * Math.cos(Date.now() * 0.001)
	plane.position.z = 6 * Math.sin(Date.now() * 0.001)

	renderer.render(scene, camera)

	// 用游標控制地球
	if (mouse.x !== undefined) {
		// group.rotation.y = mouse.x * 0.5;
		gsap.to(group.rotation,{
		x: mouse.y * 0.3,   // 上下旋轉
		y: mouse.x * 2,   // 水平旋轉
		duration: 2
	})
	}


}
animate()

let isMouseDown = false

window.addEventListener('mousedown', () => {
    isMouseDown = true;
})

window.addEventListener('mouseup', () => {
    isMouseDown = false;
})

addEventListener('mousemove',(event) => {
	if (isMouseDown) {
		mouse.x = (event.clientX / innerWidth) * 2 - 1
		mouse.y = (event.clientY / innerHeight) * 2 + 1
		// console.log(mouse.x, event.clientX)
		// console.log(mouse)
	}
})

