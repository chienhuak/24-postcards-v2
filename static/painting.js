// 初始化畫布和圖形
var graph = new joint.dia.Graph;

var paper = new joint.dia.Paper({
	el: document.getElementById('paper'),
	model: graph,
	width: 610,
	height: 433,
	gridSize: 10,
	drawGrid: true,
	// background: {
	// 	color: 'white'
	// },
	interactive: true,
});


// 背景圖
var img = new Image();
img.crossOrigin = 'anonymous'; // 啟用跨域請求
img.src = '/static/image/vintage-mailing-envelope.png'

img.onload = function() {
    // 將圖片加載到 Canvas
    var canvas = document.createElement('canvas')
    var ctx = canvas.getContext('2d')
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)

    // 將 Canvas 轉為 Base64 URL，並使用 JointJS 添加到畫布上
    var imaged = new joint.shapes.standard.Image()
    imaged.position(-30, -85)
    imaged.resize(670, 600)
    imaged.attr({
        image: {
            xlinkHref: canvas.toDataURL(), // 使用轉換後的 base64 URL
        }
    })
    imaged.addTo(graph)
}


// 貼郵票
var stamp2canvas
var imgStamp = new Image()
imgStamp.crossOrigin = 'anonymous' // 啟用跨域請求

function addStamp(url) {
    if (stamp2canvas) {
        stamp2canvas.remove()
    }


    imgStamp.src = url // 設置圖片 URL

    imgStamp.onload = function() { // 當圖片加載完成後執行
        // 創建一個 Canvas 並將圖片加載到 Canvas
        var canvas = document.createElement('canvas')
        var ctx = canvas.getContext('2d')
        canvas.width = imgStamp.width
        canvas.height = imgStamp.height
        ctx.drawImage(imgStamp, 0, 0)
    
    var stamp2canvas = new joint.shapes.standard.Image()
    stamp2canvas.position(405, 30)
    stamp2canvas.resize(130, 200)
    stamp2canvas.attr({
        image: {
            xlinkHref: canvas.toDataURL(), // 使用轉換後的 base64 URL
        }
    })
    stamp2canvas.addTo(graph)
    }
}


var lastElement;
var selectedElement;

paper.on('element:pointerclick', function(elementView) {

    var element = elementView.model;
    selectedElement = elementView.model;
    
    if (element.isElement()) {
        var type = element.get('type');


        // 只將工具加在編輯中的元素上
        if (lastElement) {
            try {lastElement.findView(paper).removeTools();
              } catch (error) {
                console.error(error)
              }
            lastElement = null;
        }
        
        if (type === 'standard.TextBlock') {
            // 編輯文字
            var currentText = element.attr('label/text');
            var newText = prompt('Edit text:', currentText);
            if (newText !== null) {
                element.attr('label/text', newText);
            }
        } else if (type === 'standard.Image') {

            // 調整大小的工具
            element.findView(paper).addTools(
                new joint.dia.ToolsView({
                    tools: [
                    new ResizeTool({
                        selector: "image"
                    })
                    ]
                })
            );

            lastElement = element;

        }
    }
});


// 刪除
document.addEventListener('keyup', function(evt) {
    if (!selectedElement) return;
    if (evt.code === 'Backspace' || evt.code === 'Delete') {
        selectedElement.remove();
        selectedElement = null;
        lastElement = null;
    }
}, false);


// 按鈕事件綁定
document.getElementById('add-text').addEventListener('click', addText);
document.getElementById('add-image').addEventListener('click', addImage);


function addText() {
    var text = new joint.shapes.standard.TextBlock();
    text.position(405, 210);
    text.resize(140, 160);
    text.attr('label/text','Click to edit!');
    text.attr('body/fill','none');
    text.attr('body/stroke','rgba(0, 0, 0, 0.4)');
    text.addTo(graph);

}


function addImage() {
    var image = new joint.shapes.standard.Image();
    image.position(10, 10);
    image.resize(550, 380);
    image.attr({
        body: {
            fill: 'transparent'
        },
        image: {
            xlinkHref: 'https://via.placeholder.com/550X380'
        }
    });
    image.addTo(graph);
    // image.findView(paper).addTools(
    //     new joint.dia.ToolsView({
    //       tools: [
    //         new ResizeTool({
    //           selector: "image"
    //         })
    //       ]
    //     })
    //   );

}



// 圖片上傳
$('#upload-image').on('change', function(event) {
    var file = event.target.files[0];
    if (file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            //console.log(e.target.result)
            var image = new joint.shapes.standard.Image();
            image.resize(345, 336);
            image.position(45, 55);
            image.attr('image/xlinkHref', e.target.result); // 使用上傳的圖片
            image.addTo(graph);

        };
        reader.readAsDataURL(file); 
    }
});


// 定義 ResizeTool
const ResizeTool = joint.elementTools.Control.extend({
    children: [
        {
            tagName: "image",
            selector: "handle",
            attributes: {
                cursor: "pointer",
                width: 20,
                height: 20,
                "xlink:href": "https://assets.codepen.io/7589991/8725981_image_resize_square_icon.svg"
            }
        },
        {
            tagName: "rect",
            selector: "extras",
            attributes: {
                "pointer-events": "none",
                fill: "none",
                stroke: "#33334F",
                "stroke-dasharray": "2,4",
                rx: 5,
                ry: 5
            }
        }
    ],
    getPosition: function (view) {
        const model = view.model;
        const { width, height } = model.size();
        return { x: width, y: height };
    },
    setPosition: function (view, coordinates) {
        const model = view.model;
        model.resize(
            Math.max(coordinates.x - 10, 1),
            Math.max(coordinates.y - 10, 1)
        );
    }
});


// 上傳圖片到 AWS
document.getElementById('save').addEventListener('click', function() {
    html2canvas(document.querySelector("#paper"), {
        useCORS: true, // 允許跨域請求
        // background: '#ffffff' // 背景色
    }).then(canvas => {
        canvas.toBlob(function(blob) {
            var formData = new FormData();
            formData.append('canvas_image', blob, 'canvas-image.png');

            fetch('/api/saveCanvas', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer YOUR_JWT_TOKEN' // TBD
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => console.log('Save success:', data))
            .catch(error => console.error('Save error:', error));
        });
    });
});

