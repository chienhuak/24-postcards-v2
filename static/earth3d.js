import { GLTFLoader } from "https://cdn.skypack.dev/three-stdlib@2.8.5/loaders/GLTFLoader"

let textures = { 
	// tennisBump: await new THREE.TextureLoader().loadAsync("static/image/TennisBallBump.jpg"),
	// tennisColor: await new THREE.TextureLoader().loadAsync("static/image/NewTennisBallColor.jpg"),
	planeTrailMask: await new THREE.TextureLoader().loadAsync("static/assets/mask.png"),  // 使用TextureLoader載入飛機尾跡的遮罩
  }


// 創建場景、相機和渲染器
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)  // 參數：相機視野、螢幕長寬比、可渲染物體最近的距離、可渲染物體最遠的距離
const renderer = new THREE.WebGLRenderer()

const mapid = document.getElementById('mapid')
mapid.appendChild(renderer.domElement)

function resize() {
	const width = mapid.clientWidth
	const height = mapid.clientHeight
	renderer.setSize(width, height)
	camera.aspect = width / height
	camera.updateProjectionMatrix()
}
  
window.addEventListener('resize', resize)
resize()


// 設置場景背景顏色
scene.background = new THREE.Color(0x000000); // 設置背景顏色

// 創建地球模型
const geometry = new THREE.SphereGeometry(5, 32, 32)
const textureLoader = new THREE.TextureLoader()
const earthTexture = textureLoader.load('./static/image/earth.jpg')
const material = new THREE.MeshBasicMaterial({ map: earthTexture })
const earth = new THREE.Mesh(geometry, material)
scene.add(earth)


// 星星的軌道
let radius = 7
const ring1 = new THREE.Mesh(
	new THREE.RingGeometry(radius, 6.99, 70, 1, 0),
	new THREE.MeshPhysicalMaterial({ 
	  color: "#FFCB8E",
	  roughness: 0.25,
	  side: THREE.DoubleSide,
	  transparent: true,
	  opacity: 0.35,
	})
  )
ring1.position.set(0, 0, 0)
ring1.rotation.x = Math.PI/3
earth.add(ring1); 
// console.log("檢查scene中有甚麼？",scene.children); // 檢查是否在場景中
// console.log("檢查",ring1.position);
// console.log("檢查",ring1.rotation);
// console.log("檢查",ring1.material);

const ring2 = new THREE.Mesh(
	new THREE.RingGeometry(radius, 6.99, 70, 1, 0),
	new THREE.MeshPhysicalMaterial({ 
	  color: "#FFCB8E",
	  roughness: 0.25,
	  side: THREE.DoubleSide,
	  transparent: true,
	  opacity: 0.35,
	})
  )
ring2.position.set(0, 0, 0)
ring2.rotation.x = Math.PI/2
earth.add(ring2);


// 建立衛星模型
const satellite = new THREE.Mesh(
	new THREE.SphereGeometry(0.1, 32, 32),
	new THREE.MeshBasicMaterial({ 
		color : 0x696969,
		map : new THREE.TextureLoader().load('./static/image/latlon-base-map.png')
	 })
)
ring1.add(satellite)
satellite.position.set(radius, 0, 0)


const satellite2 = new THREE.Mesh(
	new THREE.SphereGeometry(0.1, 32, 32),
	new THREE.MeshBasicMaterial({ 
		color : 0x696969,
		map : new THREE.TextureLoader().load('./static/image/latlon-base-map.png')
	 })
)
ring2.add(satellite2)
satellite2.position.set(radius, 0, 0)


camera.position.z = 10
// camera.position.set(0,2,10)


const group = new THREE.Group()
group.add(earth)
scene.add(group)

// 做飛機
let planeMesh = (await new GLTFLoader().loadAsync("static/assets/plane/scene.glb")).scene.children[0]
export let planesData = []


// 做座標
async function coordinatePoint(lat,lng,imageUrl,sender,country) {

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
	// console.log({x, y, z})

	// Marker
	const marker = new THREE.Mesh(
		new THREE.PlaneGeometry(1.5, 1),
		new THREE.MeshBasicMaterial({
			map: new THREE.TextureLoader().load(imageUrl),
			transparent: true,
			side: THREE.DoubleSide
		})
	)
	marker.position.set(x * 1.1 ,y * 1.1 ,z * 1.1 ) 

	marker.userData = {
        type: 'postcard',
        sender: sender,
        country: country
    }

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
	// console.log(point.position)

	// planesData.push(makePlane())
}

function nr() { // 返回-1到1之間的隨機數
	return Math.random() * 2 - 1;
}


export function makePlane(postcard) {
	let plane = planeMesh.clone();
	plane.scale.set(0.0005, 0.0005, 0.0005)
	// earth.add(plane)
	// plane.position.set(x * 1.2 ,y * 1.2 ,z * 1.2) 
	// const plane_up = new THREE.Vector3(0,0,-1)
	// plane.quaternion.setFromUnitVectors(plane_up, direction)
	// planes.push(plane)

	console.log("飛機顯示：", postcard.mailFrom)

	// 飛機上顯示 userID
	const userIdTag = createTextMesh(postcard.mailFrom);
	userIdTag.position.set(-0.1, 0.1, 0)
	userIdTag.rotateX(Math.PI)  // Canvas 文字只能單面顯示，翻轉 180% 使正面朝上 
	userIdTag.rotateZ(Math.PI/2)
	userIdTag.scale.set(1/0.0005, 1/0.0005, 1/0.0005)
	plane.add(userIdTag)


	let plane_group = new THREE.Group();
	plane_group.add(plane);
	earth.add(plane_group);


	// 設置 userData，才能在 raycaster 中識別 
	plane.userData.isPlane = true;
	plane.userData.userId = postcard.mailFrom;
	plane.userData = { // TBD
		'type':'plane',
	}


	return {
		group: plane_group,
		yOff: 5.2 + Math.random() * 1.0,
		rot: Math.PI * 2,  // just to set a random starting point
		rad: Math.random() * Math.PI * 0.45 + Math.PI * 0.05,
		randomAxis: new THREE.Vector3(nr(), nr(), nr()).normalize(),
		randomAxisRot: Math.random() * Math.PI * 1.2,
		userIdTag: userIdTag,
		postcardID: postcard.postcardID
	}
}


export function removePlane(postcardID) {

	for (let i = 0; i < planesData.length; i++) {
		let plane = planesData[i]
		if (plane.postcardID == postcardID){
			console.log("刪除 plane :",postcardID)
			plane.group.parent.remove(plane.group)	
			planesData.splice(i,1)
			break
		}
	}
}



// 開始轉的地方
earth.rotation.y = Math.PI / 3
// // earth.rotation.x = Math.PI / 10
// coordinatePoint(-25.0002052,144.051624,'./static/image/postcard_template.png')  // 澳洲
// coordinatePoint(25.0002052,121.3005753,'./static/image/postcard_template.png')  // 台灣
// // 0°經線和0°緯線
// coordinatePoint(0,0,'./static/image/postcard_template.png')  
// // console.log(planesData)

// 白色環境光
const ambientLight = new THREE.AmbientLight(0xffffff, 2); 
scene.add(ambientLight)


const raycaster = new THREE.Raycaster()
// raycaster.ray.direction.multiplyScalar(2) // 增加檢測範圍
// console.log(raycaster)
const popupEl = document.querySelector('#popupEl')


const mouse = {
	x: undefined,
	y: undefined
}


// Raycaster : eventlistenser for Raycaster 
const mouseRaycaster = {
	x: undefined,
	y: undefined
}




let clock = new THREE.Clock();


// 動畫循環與飛機移動
function animate() {
	requestAnimationFrame(animate)
	earth.rotation.y += 0.001; // 地球轉速
	ring1.rotation.z += 0.009;
	ring2.rotation.z += 0.007;

	

	// 設置飛機的繞地球路徑
	let delta = clock.getDelta();

	if (planesData) {
		planesData.forEach(planeData => {
			let plane = planeData.group;
			plane.position.set(0,0,0);
			plane.rotation.set(0,0,0);
			plane.updateMatrixWorld();
			planeData.rot += delta * 0.25;
			plane.rotateOnAxis(planeData.randomAxis, planeData.randomAxisRot); // random axis // 使飛機圍繞 planeData.randomAxis（一個隨機選定的軸）旋轉 planeData.randomAxisRot 弧度
			plane.rotateOnAxis(new THREE.Vector3(0, 1, 0), planeData.rot);    // y-axis rotation // 使飛機圍繞 y 軸（即 new THREE.Vector3(0, 1, 0)）旋轉 planeData.rot 弧度
			plane.rotateOnAxis(new THREE.Vector3(0, 0, 1), planeData.rad);    // this decides the radius
			plane.translateY(planeData.yOff);
			plane.rotateOnAxis(new THREE.Vector3(1,0,0), 2*Math.PI);
			// const tag = planeData.userIdTag
			// tag.quaternion.copy(camera.quaternion); // 永遠正面顯示
		});
	};

	renderer.render(scene, camera);


	// 用游標控制地球
	if (mouse.x !== undefined) {
		// group.rotation.y = mouse.x * 0.5;
		gsap.to(group.rotation,{
		x: mouse.y * 0.3,   // 上下旋轉
		y: mouse.x * 2,   // 水平旋轉
		duration: 2
	})
	}

	// 使用 raycaster 照亮 scene 裡滑鼠所在位置 (製造 hover 的效果)
	raycaster.setFromCamera( mouseRaycaster, camera );

	gsap.set(popupEl, {
		display : 'none'
	})

	const intersects = raycaster.intersectObjects( earth.children, true);
	// 在 raycaster.intersectObjects 中，第二个參數 true，則檢查所有子對象

	// 篩選 raycaster.intersectObjects 類別 (e.g. Mesh...)
	// const intersects = raycaster.intersectObjects( earth.children.filter((mesh) =>{
	// 	return mesh.geometry.type === 'PlaneGeometry'
	// }) )

    // 預設透明
    earth.children.forEach(obj => {
        if (obj.material && obj.userData.type === "landscope") {
            obj.material.opacity = 0;
        }
    })

	for ( let i = 0; i < intersects.length; i ++ ) {

		// 取得 userData
		const intersectedObject = intersects[i].object
		// console.log(intersectedObject.userData)
		// console.log(intersectedObject.userData.type)

		if (intersectedObject.userData && intersectedObject.userData.type === 'landscope') {

			intersects[i].object.material.opacity = 1;
			// intersects[i].object.material.color.set(0xffc0cb); // hover 時變粉紅色
		}

		else if (intersectedObject.userData && intersectedObject.userData.type === 'postcard') {

			const { sender, country, type } = intersectedObject.userData

			gsap.set(popupEl, {
				display : 'block'
			})

			popupEl.innerHTML = `<p>你收到來自<strong> ${country} </strong>的明信片<strong> BY ${sender}</strong></p>`
		}
		// 如果物件的 userData 是 undefined，檢查是否是 Group 的子物件
		else if (intersectedObject.parent && intersectedObject.parent.userData.type === 'plane') {
			console.log(intersectedObject.parent.userData.type);

			gsap.set(popupEl, { display: 'block' });
			popupEl.innerHTML = `<p>某個用戶寄出一封明信片，郵差正在加班寄送中 :)</p>`

		}

		// // console.log("點到我囉！")
		// gsap.set(popupEl, {
		// 	display : 'block'
		// })

		// intersects[ i ].object.material.color.set( 0xff0000 );
	}

	renderer.render( scene, camera );
	

}
animate()

// Raycaster 於滑鼠位置
window.addEventListener('mousemove', (event) => {
	mouseRaycaster.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouseRaycaster.y = -(event.clientY / window.innerHeight) * 2 + 1;
	// console.log("Ray游標位置 X:", event.clientX, "Ray游標位置 Y:", event.clientY) 
	gsap.set(popupEl, {
		x: event.clientX,
		y: event.clientY - 700 // 修正偏移量
	})
	// console.log("popupEl transform:", popupEl.style.transform)
  });


// 滑鼠轉動地球
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


// 監聽 scroll 動作，並進行 zoom in / zoom out
const minZoom = 7
const maxZoom = 12
let zoomSpeed = 0.01 // 控制縮放速度
let targetZoom = camera.position.z
let throttleTimeout;
const throttleDelay = 50; // 設置截流延遲（毫秒）

addEventListener('wheel', (event) => {
    if (throttleTimeout) clearTimeout(throttleTimeout)
    throttleTimeout = setTimeout(() => {
        let zoomChange = event.deltaY * zoomSpeed
        targetZoom += zoomChange

        targetZoom = Math.max(minZoom, Math.min(maxZoom, targetZoom))

        gsap.to(camera.position, {
            z: targetZoom,
            duration: 0.5,
            ease: "power2.out"
        })

        event.preventDefault()
    }, throttleDelay)
}, { passive: false });


// 動態建立明信片
function map_marker() {

    const token = localStorage.getItem('token')

    fetch('/api/collections', {
        method: 'GET',
        headers: {'Authorization': `Bearer ${token}`}
    })
        .then(response => response.json())
        .then(data => {

			console.log(data)

            for (let i=0;i<data.data.length;i++){
				// 新增傳入參數 : 增加 USER DATA
				coordinatePoint(data.data[i].latitude, data.data[i].longitude, data.data[i].image, data.data[i].mailFrom, data.data[i].country) 
            }
            // nextPage = data.nextPage
        })
        .catch(error => {
            console.error('Error:', error)
        })
}

map_marker()


// // 載入大氣層 shader
// // Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/plain"
// import atmosphereVertexShader from '/static/assets/shaders/atmosphereVertex.glsl'

const atmosphereVertexShader = `
varying vec3 vertexNormal;

void main() {
  vertexNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 0.9 );
}
`

const atmosphereFragmentShader = `
varying vec3 vertexNormal; // (0, 0, 0)
void main() {
  float intensity = pow(0.75 - dot(vertexNormal, vec3(0, 0, 1.0)), 2.0);
  gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
}
`

// create atmosphere
const atmosphere = new THREE.Mesh(
	new THREE.SphereGeometry(5, 50, 50),
	new THREE.ShaderMaterial({
	  vertexShader: atmosphereVertexShader,
	  fragmentShader: atmosphereFragmentShader,
	  blending: THREE.AdditiveBlending,
	  side: THREE.BackSide
	})
  )
  
  atmosphere.scale.set(1.1, 1.1, 1.1)
  
  scene.add(atmosphere)


// // 測試顯示文字 
// const canvas = document.createElement('canvas')
// const context = canvas.getContext('2d')
// canvas.width = 30
// canvas.height = 30
// context.fillStyle = 'white'
// context.font = '18px Arial'
// context.fillText('Hello', 150, 100)

// const texture = new THREE.CanvasTexture(canvas)

// const geometry2 = new THREE.PlaneGeometry(5, 5)
// const material2 = new THREE.MeshBasicMaterial({ map: texture, transparent: true })

// const mesh = new THREE.Mesh(geometry2, material2)
// mesh.position.set(8,0,0)
// scene.add(mesh)



function createTextMesh(userId) {
	
	const canvas = document.createElement('canvas')
	const context = canvas.getContext('2d')
	context.fillStyle = 'yellow'
	context.font = '18px Arial'
	context.fillText(userId, 140, 90)

	// 將 canvas 當作紋裡
	const texture = new THREE.CanvasTexture(canvas)

	// 建立平面，應用紋理
	const geometry2 = new THREE.PlaneGeometry(5, 5)
	const material2 = new THREE.MeshBasicMaterial({ map: texture, transparent: true })

	// 建立網格
	const mesh = new THREE.Mesh(geometry2, material2)
	return mesh
}


// let data2 = {"type":"FeatureCollection","features":[
// 	{"type":"Feature","id":"ARE","properties":{"name":"United Arab Emirates"},"geometry":{"type":"Polygon","coordinates":[[[51.579519,24.245497],[51.757441,24.294073],[51.794389,24.019826],[52.577081,24.177439],[53.404007,24.151317],[54.008001,24.121758],[54.693024,24.797892],[55.439025,25.439145],[56.070821,26.055464],[56.261042,25.714606],[56.396847,24.924732],[55.886233,24.920831],[55.804119,24.269604],[55.981214,24.130543],[55.528632,23.933604],[55.525841,23.524869],[55.234489,23.110993],[55.208341,22.70833],[55.006803,22.496948],[52.000733,23.001154],[51.617708,24.014219],[51.579519,24.245497]]]}},
// 	{"type":"Feature","id":"CHN","properties":{"name":"China"},"geometry":{"type":"MultiPolygon","coordinates":[[[[110.339188,18.678395],[109.47521,18.197701],[108.655208,18.507682],[108.626217,19.367888],[109.119056,19.821039],[110.211599,20.101254],[110.786551,20.077534],[111.010051,19.69593],[110.570647,19.255879],[110.339188,18.678395]]],[[[127.657407,49.76027],[129.397818,49.4406],[130.582293,48.729687],[130.987282,47.790132],[132.506672,47.78897],[133.373596,48.183442],[135.026311,48.47823],[134.500814,47.57844],[134.112362,47.212467],[133.769644,46.116927],[133.097127,45.144066],[131.883454,45.321162],[131.025212,44.967953],[131.288555,44.11152],[131.144688,42.92999],[130.633866,42.903015],[130.640016,42.395009],[129.994267,42.985387],[129.596669,42.424982],[128.052215,41.994285],[128.208433,41.466772],[127.343783,41.503152],[126.869083,41.816569],[126.182045,41.107336],[125.079942,40.569824],[124.265625,39.928493],[122.86757,39.637788],[122.131388,39.170452],[121.054554,38.897471],[121.585995,39.360854],[121.376757,39.750261],[122.168595,40.422443],[121.640359,40.94639],[120.768629,40.593388],[119.639602,39.898056],[119.023464,39.252333],[118.042749,39.204274],[117.532702,38.737636],[118.059699,38.061476],[118.87815,37.897325],[118.911636,37.448464],[119.702802,37.156389],[120.823457,37.870428],[121.711259,37.481123],[122.357937,37.454484],[122.519995,36.930614],[121.104164,36.651329],[120.637009,36.11144],[119.664562,35.609791],[119.151208,34.909859],[120.227525,34.360332],[120.620369,33.376723],[121.229014,32.460319],[121.908146,31.692174],[121.891919,30.949352],[121.264257,30.676267],[121.503519,30.142915],[122.092114,29.83252],[121.938428,29.018022],[121.684439,28.225513],[121.125661,28.135673],[120.395473,27.053207],[119.585497,25.740781],[118.656871,24.547391],[117.281606,23.624501],[115.890735,22.782873],[114.763827,22.668074],[114.152547,22.22376],[113.80678,22.54834],[113.241078,22.051367],[111.843592,21.550494],[110.785466,21.397144],[110.444039,20.341033],[109.889861,20.282457],[109.627655,21.008227],[109.864488,21.395051],[108.522813,21.715212],[108.05018,21.55238],[107.04342,21.811899],[106.567273,22.218205],[106.725403,22.794268],[105.811247,22.976892],[105.329209,23.352063],[104.476858,22.81915],[103.504515,22.703757],[102.706992,22.708795],[102.170436,22.464753],[101.652018,22.318199],[101.80312,21.174367],[101.270026,21.201652],[101.180005,21.436573],[101.150033,21.849984],[100.416538,21.558839],[99.983489,21.742937],[99.240899,22.118314],[99.531992,22.949039],[98.898749,23.142722],[98.660262,24.063286],[97.60472,23.897405],[97.724609,25.083637],[98.671838,25.918703],[98.712094,26.743536],[98.68269,27.508812],[98.246231,27.747221],[97.911988,28.335945],[97.327114,28.261583],[96.248833,28.411031],[96.586591,28.83098],[96.117679,29.452802],[95.404802,29.031717],[94.56599,29.277438],[93.413348,28.640629],[92.503119,27.896876],[91.696657,27.771742],[91.258854,28.040614],[90.730514,28.064954],[90.015829,28.296439],[89.47581,28.042759],[88.814248,27.299316],[88.730326,28.086865],[88.120441,27.876542],[86.954517,27.974262],[85.82332,28.203576],[85.011638,28.642774],[84.23458,28.839894],[83.898993,29.320226],[83.337115,29.463732],[82.327513,30.115268],[81.525804,30.422717],[81.111256,30.183481],[79.721367,30.882715],[78.738894,31.515906],[78.458446,32.618164],[79.176129,32.48378],[79.208892,32.994395],[78.811086,33.506198],[78.912269,34.321936],[77.837451,35.49401],[76.192848,35.898403],[75.896897,36.666806],[75.158028,37.133031],[74.980002,37.41999],[74.829986,37.990007],[74.864816,38.378846],[74.257514,38.606507],[73.928852,38.505815],[73.675379,39.431237],[73.960013,39.660008],[73.822244,39.893973],[74.776862,40.366425],[75.467828,40.562072],[76.526368,40.427946],[76.904484,41.066486],[78.187197,41.185316],[78.543661,41.582243],[80.11943,42.123941],[80.25999,42.349999],[80.18015,42.920068],[80.866206,43.180362],[79.966106,44.917517],[81.947071,45.317027],[82.458926,45.53965],[83.180484,47.330031],[85.16429,47.000956],[85.720484,47.452969],[85.768233,48.455751],[86.598776,48.549182],[87.35997,49.214981],[87.751264,49.297198],[88.013832,48.599463],[88.854298,48.069082],[90.280826,47.693549],[90.970809,46.888146],[90.585768,45.719716],[90.94554,45.286073],[92.133891,45.115076],[93.480734,44.975472],[94.688929,44.352332],[95.306875,44.241331],[95.762455,43.319449],[96.349396,42.725635],[97.451757,42.74889],[99.515817,42.524691],[100.845866,42.663804],[101.83304,42.514873],[103.312278,41.907468],[104.522282,41.908347],[104.964994,41.59741],[106.129316,42.134328],[107.744773,42.481516],[109.243596,42.519446],[110.412103,42.871234],[111.129682,43.406834],[111.829588,43.743118],[111.667737,44.073176],[111.348377,44.457442],[111.873306,45.102079],[112.436062,45.011646],[113.463907,44.808893],[114.460332,45.339817],[115.985096,45.727235],[116.717868,46.388202],[117.421701,46.672733],[118.874326,46.805412],[119.66327,46.69268],[119.772824,47.048059],[118.866574,47.74706],[118.064143,48.06673],[117.295507,47.697709],[116.308953,47.85341],[115.742837,47.726545],[115.485282,48.135383],[116.191802,49.134598],[116.678801,49.888531],[117.879244,49.510983],[119.288461,50.142883],[119.279366,50.582908],[120.18205,51.643566],[120.738191,51.964115],[120.725789,52.516226],[120.177089,52.753886],[121.003085,53.251401],[122.245748,53.431726],[123.571507,53.458804],[125.068211,53.161045],[125.946349,52.792799],[126.564399,51.784255],[126.939157,51.353894],[127.287456,50.739797],[127.657407,49.76027]]]]}},
// 	{"type":"Feature","id":"AUT","properties":{"name":"Austria"},"geometry":{"type":"Polygon","coordinates":[[[16.979667,48.123497],[16.903754,47.714866],[16.340584,47.712902],[16.534268,47.496171],[16.202298,46.852386],[16.011664,46.683611],[15.137092,46.658703],[14.632472,46.431817],[13.806475,46.509306],[12.376485,46.767559],[12.153088,47.115393],[11.164828,46.941579],[11.048556,46.751359],[10.442701,46.893546],[9.932448,46.920728],[9.47997,47.10281],[9.632932,47.347601],[9.594226,47.525058],[9.896068,47.580197],[10.402084,47.302488],[10.544504,47.566399],[11.426414,47.523766],[12.141357,47.703083],[12.62076,47.672388],[12.932627,47.467646],[13.025851,47.637584],[12.884103,48.289146],[13.243357,48.416115],[13.595946,48.877172],[14.338898,48.555305],[14.901447,48.964402],[15.253416,49.039074],[16.029647,48.733899],[16.499283,48.785808],[16.960288,48.596982],[16.879983,48.470013],[16.979667,48.123497]]]}}
// 	]}

landscope()

function landscope() {

// drawCountries(data2)
// drawShapes(data2)

fetch('/static/countries.json')
    .then(response => response.json())
    .then(data => {
		drawCountries(data)
		// drawShapes(data)
	}
	)



// 繪製國家多邊形
function drawCountries(data) {

    const radius = 5.2

    data.features.forEach((country) => {

		// 儲存國家的幾何數據 (BufferGeometry 使用緩衝區（BufferAttribute）來存儲幾何數據，直接與 GPU 進行交互)
        const geometry = new THREE.BufferGeometry()

		// 類別一：MultiPolygon
		if (country.geometry.type === "MultiPolygon") {
			country.geometry.coordinates.forEach(polygon => {
				// 存儲頂點的坐標數據
				const verticesArray = []
	
				// 多邊形的所有頂點坐標
				polygon[0].forEach(coord => {
					const lat = coord[1]
					const lon = coord[0]
					const vertex = latLong2vector3(lat, lon)
					verticesArray.push(vertex.x, vertex.y, vertex.z)  // Push x, y, z coordinates into the array
				})
	
				// 建立 BufferGeometry Object，並且每個頂點的坐標數據，包含 x, y, z 屬性
				const geometry = new THREE.BufferGeometry()
	
				const lineGeometry = new THREE.BufferGeometry()
				lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(verticesArray, 3))
	
				const lineMaterial = new THREE.LineBasicMaterial({ // 設為隱形
					color: 0xffffeb,
					opacity: 0,
					transparent: true 
				})
				const line = new THREE.LineLoop(lineGeometry, lineMaterial)
	
				line.userData = {
					type: "landscope"
				}
	
				earth.add(line)
	
			})

		}

		else {  // 類別二：Polygon  // country.geometry.type === "Polygon"
				const verticesArray = []
	
				country.geometry.coordinates[0].forEach(coord => {
					const lat = coord[1]
					const lon = coord[0]
					const vertex = latLong2vector3(lat, lon)
					verticesArray.push(vertex.x, vertex.y, vertex.z)
				})
	
				// 建立 BufferGeometry Object，並且每個頂點的坐標數據，包含 x, y, z 屬性
				const geometry = new THREE.BufferGeometry()
	
				const lineGeometry = new THREE.BufferGeometry()
				lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(verticesArray, 3))
	
				const lineMaterial = new THREE.LineBasicMaterial({ 
					color: 0xffffeb,
					opacity: 0,
					transparent: true 
				})
				const line = new THREE.LineLoop(lineGeometry, lineMaterial)
	
				line.userData = {
					type: "landscope"
				}
	
				earth.add(line)


		}
        

})
}


// 經緯度轉換Vector3
function latLong2vector3(lat,lng) {

	// console.log({lat, lng})
	const latitude = (lat / 180) * Math.PI
	const longitude = ((lng + 90) / 180) * Math.PI  // +90 校正
	const radius = 5.2
	// console.log({latitude, longitude})
	const x = radius * Math.cos(latitude) * Math.sin(longitude)
	const y = radius * Math.sin(latitude)
	const z = radius * Math.cos(latitude) * Math.cos(longitude)
	// console.log({x, y, z})

	return new THREE.Vector3(x, y, z)

}



// function drawShapes(data2) {

// 	// console.log("取得資料，繪製國家形狀 : ",data2)

//     const radius = 5.2

//     data2.features.forEach((country) => {
		
// 		if (country.geometry.type === "MultiPolygon") {
// 			country.geometry.coordinates.forEach(polygon => {
// 				// 存儲頂點的坐標數據
// 				const verticesArray = []
	
// 				// 多邊形的所有頂點坐標
// 				polygon[0].forEach(coord => {
// 					const lat = coord[1]
// 					const lon = coord[0]
// 					const vertex = (lat, lon)
// 					verticesArray.push(vertex) 
// 				})
	
// 				console.log("取得 verticesArray : ", verticesArray)	

//                 // 從頂點創建 Shape
//                 const shape = new THREE.Shape(verticesArray.map(v => new THREE.Vector2(v.x, v.z)));
	
// 				// 如果你想創建帶有厚度的形狀，可以使用 ExtrudeGeometry
// 				const extrudeSettings = { depth: 1, bevelEnabled: false }
// 				const extrudeGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
// 				const shapeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide })
	
// 				// 創建 Mesh
// 				const shapeMesh = new THREE.Mesh(extrudeGeometry, shapeMaterial)
	
// 				shapeMesh.userData = {
// 					type: "landshape"
// 				}
	
// 				// 將 shape Mesh 添加到場景中
// 				earth.add(shapeMesh)
// 			})
// 		}

// 		//
//     })
// }

}

