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
// camera.position.set(10,15,50)


const group = new THREE.Group()
group.add(earth)
scene.add(group)


// 創建座標
const point = new THREE.Mesh(
	new THREE.SphereGeometry(0.1, 32, 32),
	new THREE.MeshBasicMaterial({
		color: '#ff0000'
	})
)


// 澳洲 -37.901918, 145.051624
const latitude = ( -37.901918 / 180) * Math.PI
const longitude = (-145.051624 / 180) * Math.PI
const radius = 5
console.log({latitude, longitude})
const x = radius * Math.cos(latitude) * Math.sin(longitude)
const y = radius * Math.sin(latitude)
const z = radius * Math.cos(latitude) * Math.cos(longitude)
console.log({x, y, z})

point.position.x = x
point.position.y = y
point.position.z = z
// 讓地標跟著地球旋轉
earth.add(point)

console.log(earth.position)
console.log(point.position)


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
		// x: mouse.y * 1,   // 上下旋轉
		y: mouse.x * 1,   // 水平旋轉
		duration: 2
	})
	}


}
animate()


addEventListener('mousemove',(event) => {
	mouse.x = (event.clientX / innerWidth) * 2 - 1
	mouse.y = (event.clientY / innerHeight) * 2 + 1
	// console.log(mouse)
})

