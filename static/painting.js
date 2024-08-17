// 初始化畫布和圖形
var graph = new joint.dia.Graph;

var paper = new joint.dia.Paper({
	el: document.getElementById('paper'),
	model: graph,
	width: 800,
	height: 400,
	gridSize: 10,
	drawGrid: true,
	background: {
		color: 'white'
	},
	interactive: true,
});


// 畫布 OK 就顯示的圖片
// var text = new joint.shapes.standard.TextBlock();
// text.position(50, 50);
// text.resize(100, 40);
// text.attr('label/text', 'Click me!');
// text.addTo(graph);


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
    text.position(50, 50);
    text.resize(100, 40);
    text.attr('label/text', 'Edit me!');
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
            var image = new joint.shapes.standard.Image();
            image.resize(100, 100);
            image.position(100, 100);
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

