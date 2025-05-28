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

function drawGraph(graph) {
  const scale = 30;
  const offsetX = app.renderer.width / 2;
  const offsetY = app.renderer.height / 2;

  for (const node of graph.vertices) {
    node.x = node.x * scale + offsetX;
    node.y = -node.y * scale + offsetY;
    node.label = node.id.toString();
  }

  for (const edge of graph.edges) {
    const sourceNode = graph.vertices.find(n => n.id === edge.from);
    const targetNode = graph.vertices.find(n => n.id === edge.to);

    if (!sourceNode || !targetNode) continue;

    const line = new PIXI.Graphics();
    line.lineStyle(2, 0xffffff, 0.6);
    line.moveTo(sourceNode.x, sourceNode.y);
    line.lineTo(targetNode.x, targetNode.y);
    app.stage.addChild(line);
  }

  for (const node of graph.vertices) {
    const nodeContainer = new PIXI.Container();
    nodeContainer.x = node.x;
    nodeContainer.y = node.y;

    const circle = new PIXI.Graphics();
    circle.beginFill(0xFFFFFF);
    circle.drawCircle(0, 0, 15);
    circle.endFill();
    nodeContainer.addChild(circle);

    circle.interactive = true;
    circle.buttonMode = true;
    circle.on('pointerdown', () => {
      if (!selectedColor) {
        const alertDiv = document.getElementById('no-color-picked-alert');
        alertDiv.style.display = 'block';
        setTimeout(() => {
          alertDiv.style.display = 'none';
        }, 3000); 
        return;
      }
      circle.clear();
      circle.beginFill(colorMap[selectedColor] || 0xFFFFFF);
      circle.drawCircle(0, 0, 15);
      circle.endFill();
    });

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

    app.stage.addChild(nodeContainer);
  }
}
