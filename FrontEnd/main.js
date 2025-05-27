const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0xFFC0CB, // light pink background :)
  resolution: window.devicePixelRatio || 1,
  antialias: true,
});
document.getElementById('graph-container').appendChild(app.view);

// Load graph JSON from backend
fetch('/api/graph')
  .then(res => res.json())
  .then(graph => {
    drawGraph(graph);
  })
  .catch(err => {
    console.error('Error loading graph:', err);
  });

function drawGraph(graph) {
  const scale = 50; 
  const offsetX = app.renderer.width / 2.1;
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
    circle.beginFill(0xFFFFFF);  // 
    circle.drawCircle(0, 0, 15); 
    circle.endFill();
    nodeContainer.addChild(circle);

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

