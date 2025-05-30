const container = document.getElementById('graph-container');

const app = new PIXI.Application({
  width: container.clientWidth,
  height: container.clientHeight,
  backgroundAlpha: 0, 
  resolution: window.devicePixelRatio || 1,
  antialias: true,
});

container.appendChild(app.view);

window.addEventListener('resize', () => {
  app.renderer.resize(container.clientWidth, container.clientHeight);
});

const colorMap = {
  pastel_blue: 0x92ceff, 
  pastel_red: 0xfc959f,  
  pastel_green: 0x8ecfa4, 
};

const numberMap = {
  pastel_blue: 1, 
  pastel_red: 2,  
  pastel_green: 3, 
};

let selectedColor = null;

const swatches = document.querySelectorAll('.color-swatch');
swatches.forEach(swatch => {
  swatch.addEventListener('click', () => {
    swatches.forEach(s => s.classList.remove('selected'));
    swatch.classList.add('selected');
    selectedColor = swatch.getAttribute('data-color');
  });
});

fetch('/api/graph')
  .then(res => res.json())
  .then(graph => {
    drawGraph(graph);
  })
  .catch(err => {
    console.error('Error loading graph:', err);
  });

function resetGraph() {
  app.stage.removeChildren();
  selectedColor = null;
  const swatches = document.querySelectorAll('.color-swatch');
  swatches.forEach(swatch => swatch.classList.remove('selected'));
}


function drawGraph(graph) {
  const scale = 30;
  const offsetX = app.renderer.width / 2;
  const offsetY = app.renderer.height / 2;

  for (const node of graph.vertices) {
    node.x = node.x * scale + offsetX;
    node.y = -node.y * scale + offsetY;
   // node.label = node.id.toString();
  }

  for (const edge of graph.edges) {
    const sourceNode = graph.vertices.find(n => n.id === edge.from);
    const targetNode = graph.vertices.find(n => n.id === edge.to);

    if (!sourceNode || !targetNode) continue;

    const line = new PIXI.Graphics();
    line.lineStyle(2, 0x000000, 0.6);
    line.moveTo(sourceNode.x, sourceNode.y);
    line.lineTo(targetNode.x, targetNode.y);
    app.stage.addChild(line);
  }

for (const node of graph.vertices) {
  node.selected = false;
  node.colorLabel = 0xFFFFFF; 

  const nodeContainer = new PIXI.Container();
  nodeContainer.x = node.x;
  nodeContainer.y = node.y;

  const circle = new PIXI.Graphics();
  circle.lineStyle(1, 0x000000);
  circle.beginFill(node.colorLabel);
  circle.drawCircle(0, 0, 15);
  circle.endFill();
  nodeContainer.addChild(circle);

  circle.interactive = true;
  circle.hitArea = new PIXI.Circle(0, 0, 15);

  function setCircleColor(color) {
    circle.clear();
    circle.lineStyle(1, 0x000000);
    circle.beginFill(color);
    circle.drawCircle(0, 0, 15);
    circle.endFill();
  }

  let originalColor = node.colorLabel;

  let nodeLabel = null; 

  circle.on('pointerover', () => {
    container.style.cursor = 'pointer';
    nodeContainer.scale.set(1.1);
    if (selectedColor) {
      originalColor = node.colorLabel; 
      setCircleColor(colorMap[selectedColor]);
    }
    nodeContainer.children
      .filter(child => child instanceof PIXI.Text)
      .forEach(child => {
        nodeLabel = child; 
        nodeContainer.removeChild(child);
      });
});

circle.on('pointerout', () => {
  container.style.cursor = 'default';
  nodeContainer.scale.set(1);
  setCircleColor(node.colorLabel);
  if (node.selected && nodeLabel && !nodeContainer.children.includes(nodeLabel)) {
    nodeContainer.addChild(nodeLabel);
  }
  nodeLabel = null;
});

circle.on('pointerdown', () => {
  if (!selectedColor) {
    const alertDiv = document.getElementById('no-color-picked-alert');
    alertDiv.style.display = 'block';
    setTimeout(() => {
      alertDiv.style.display = 'none';
    }, 3000);
    return;
  }
  node.selected = true;
  node.colorLabel = colorMap[selectedColor]; 
  setCircleColor(node.colorLabel); 

  nodeContainer.children
    .filter(child => child instanceof PIXI.Text)
    .forEach(child => nodeContainer.removeChild(child));

  const style = new PIXI.TextStyle({
    fill: "#000000",
    fontSize: 14,
    fontWeight: "bold",
    align: "center"
  });

  nodeLabel = new PIXI.Text(numberMap[selectedColor], style);
  nodeLabel.anchor.set(0.5);
  nodeLabel.x = 0;
  nodeLabel.y = 0;
  nodeContainer.addChild(nodeLabel);
});

  app.stage.addChild(nodeContainer);
}
 /* 
    const style = new PIXI.TextStyle({
      fill: "#000000",
      fontSize: 14,
      fontWeight: "bold",
      align: "center"
    });
  const label = new PIXI.Text(node.label, style);
    label.anchor.set(0.5);
    label.x = 0;
    label.y = 0;
    nodeContainer.addChild(label);
    */
//    app.stage.addChild(nodeContainer);
  }

// 1. adauga culoarea alba
// 2. adauga buton de reset graph
// 3. nu lasa utilizatorul sa coloreze prost graful