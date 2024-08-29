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
	new THREE.RingGeometry(radius, 6.95, 70, 1, 0),
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


// 建立衛星模型
const satellite = new THREE.Mesh(
	new THREE.SphereGeometry(0.2, 32, 32),
	new THREE.MeshBasicMaterial({ 
		color : 0x696969,
		map : new THREE.TextureLoader().load('./static/image/latlon-base-map.png')
	 })
)
ring1.add(satellite)
satellite.position.set(radius, 0, 0)



camera.position.z = 10
// camera.position.set(0,2,10)


const group = new THREE.Group()
group.add(earth)
scene.add(group)

// 做飛機
let planeMesh = (await new GLTFLoader().loadAsync("static/assets/plane/scene.glb")).scene.children[0]
export let planesData = []


// 做座標
async function coordinatePoint(lat,lng,imageUrl) {

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
		new THREE.PlaneGeometry(1.5, 1),
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

	// planesData.push(makePlane())
}

function nr() { // 返回-1到1之間的隨機數
	return Math.random() * 2 - 1;
}


export function makePlane(userId) {
	let plane = planeMesh.clone();
	plane.scale.set(0.0005, 0.0005, 0.0005)
	// earth.add(plane)
	// plane.position.set(x * 1.2 ,y * 1.2 ,z * 1.2) 
	// const plane_up = new THREE.Vector3(0,0,-1)
	// plane.quaternion.setFromUnitVectors(plane_up, direction)
	// planes.push(plane)

	// // 飛機上顯示 userID
	// const userIdSprite = createTextSprite(userId);
	// userIdSprite.position.set(0, 1, 0);  // Adjust as needed
	// plane.add(userIdSprite);


	let plane_group = new THREE.Group();
	plane_group.add(plane);
	earth.add(plane_group);

	// 設置 userData，才能在 raycaster 中識別 
	plane.userData.isPlane = true;
	plane.userData.userId = userId;

	return {
		group: plane_group,
		yOff: 5.2 + Math.random() * 1.0,
		rot: Math.PI * 2,  // just to set a random starting point
		rad: Math.random() * Math.PI * 0.45 + Math.PI * 0.05,
		randomAxis: new THREE.Vector3(nr(), nr(), nr()).normalize(),
		randomAxisRot: Math.random() * Math.PI * 1.2,
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
raycaster.ray.direction.multiplyScalar(100) // 增加檢測範圍
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
	// const intersects = raycaster.intersectObjects( earth.children.filter((mesh) =>{
	// 	return mesh.geometry.type === 'PlaneGeometry'
	// }) );

	for ( let i = 0; i < intersects.length; i ++ ) {
		// console.log("點到我囉！")
		gsap.set(popupEl, {
			display : 'block'
		})

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
				coordinatePoint(data.data[i].latitude, data.data[i].longitude, data.data[i].image)  
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


// // 添加文字標示
// function createTextSprite(userId) {

//     // Create a canvas element
//     const canvas = document.createElement('canvas');
//     const context = canvas.getContext('2d');
//     const fontSize = 50;
//     canvas.width = 256;
//     canvas.height = 128;

//     // Set font and fill style
//     context.font = `${fontSize}px Arial`;
//     context.fillStyle = 'white';
//     context.textAlign = 'center';
//     context.textBaseline = 'middle';

//     // Render userId on the canvas
//     context.fillText(userId, canvas.width / 2, canvas.height / 2);

// 	// Log canvas for debugging
// 	console.log("確認是否建立文字canvas",canvas.toDataURL())

//     // Create a texture from the canvas
//     const texture = new THREE.CanvasTexture(canvas);

//     // Create sprite material and sprite
//     const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
//     const sprite = new THREE.Sprite(spriteMaterial);

//     // Scale the sprite down so it fits the scene
//     sprite.scale.set(2, 1, 1);  // Adjust scale as needed

//     return sprite;
// }


console.log("scene.children裡面有甚麼：",scene.children)
console.log("earth.children裡面有甚麼：",earth.children)
console.log("group裡面有甚麼：",group)