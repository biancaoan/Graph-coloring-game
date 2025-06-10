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

document.addEventListener('DOMContentLoaded', () => {
    const startPage = document.getElementById('start-page');
    
    if (!localStorage.getItem('visited')) {
        startPage.style.display = 'flex'; 
    }
});

document.getElementById('start-btn').addEventListener('click', function() {
    localStorage.setItem('visited', 'true');
    document.getElementById('start-page').style.display = 'none';
});


const urlParams = new URLSearchParams(window.location.search);
if (!urlParams.has('level')) {
  urlParams.set('level', '1');
  const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
  window.history.replaceState({}, '', newUrl); 
}
const level = parseInt(urlParams.get('level'), 10);

document.getElementById("level-number").textContent = level;

let nrColors = 3;

if (level == 1) {
  nrColors = 2;
}

document.getElementById("number-of-colors").textContent = nrColors;

const colorMap = {
  white: 0xffffff,
  pastel_blue: 0x92ceff, 
  pastel_red: 0xfc959f,  
  pastel_green: 0x8ecfa4, 
};

const numberMap = {
  white: " ",
  pastel_blue: 1, 
  pastel_red: 2,  
  pastel_green: 3, 
};

function verifyGraph() {
  coloredGraph = true;
  allNodes.forEach(({ node, nodeContainer, setCircleColor, getLabel, setLabel }) => {
    if (node.id < 5 && level != 1) 
      return;
    if(node.colorLabel === colorMap.white || !node.selected) {
      coloredGraph = false;
    }
  });
  return coloredGraph;
}

function animateGraph(onComplete) {
  const amplitude = 12;
  const duration = 600; 
  const waveSpeed = 80;
  const originalYs = allNodes.map(({ nodeContainer }) => nodeContainer.y);

  let startTime = performance.now();

  function animateWave() {
    const elapsed = performance.now() - startTime;
    let allDone = true;

    allNodes.forEach(({ nodeContainer }, i) => {
      const nodeDelay = i * waveSpeed;
      let localElapsed = elapsed - nodeDelay;

      if (localElapsed < 0) {
        nodeContainer.y = originalYs[i];
        allDone = false;
        return;
      }
      if (localElapsed < duration) {
        const progress = localElapsed / duration;
        nodeContainer.y = originalYs[i] + Math.sin(progress * Math.PI) * amplitude;
        allDone = false;
      } else {
        nodeContainer.y = originalYs[i];
      }
    });

    if (allDone) {
      app.ticker.remove(animateWave);
      allNodes.forEach(({ nodeContainer }, i) => {
        nodeContainer.y = originalYs[i];
      });
      if (typeof onComplete === "function") onComplete();
    }
  }

  app.ticker.add(animateWave); 
}

function getNeighbors(node, graph) {
  const neighborIds = new Set();
  for (const edge of graph.edges) {
    if (edge.from === node.id) neighborIds.add(edge.to);
    if (edge.to === node.id) neighborIds.add(edge.from);
  }
  return graph.vertices.filter(n => neighborIds.has(n.id));
}

document.addEventListener("DOMContentLoaded", () => {
    const levelNumberElement = document.getElementById("level-number");
    const thirdColorElement = document.querySelector('.color-swatch.bg-success');

    function updateColorVisibility() {
        const level = parseInt(levelNumberElement.textContent, 10);
        if (level > 1) {
            thirdColorElement.style.display = "inline-block"; 
        } else {
            thirdColorElement.style.display = "none"; 
        }
    }
    updateColorVisibility();
});


let selectedColor = null;

const swatches = document.querySelectorAll('.color-swatch');
swatches.forEach(swatch => {
  swatch.addEventListener('click', () => {
    swatches.forEach(s => s.classList.remove('selected'));
    swatch.classList.add('selected');
    selectedColor = swatch.getAttribute('data-color');
  });
});


let firstColors = [];

let graphRequest = () => fetch(`/api/graph?level=${level}`).then(res => res.json());

if (level >= 2) {
  fetch(`/api/colors?level=${level}`)
    .then(res => res.json())
    .then(data => {
      firstColors = data.first_four_colors || [];
      return graphRequest();
    })
    .then(graph => {
      drawGraph(graph, firstColors);
    })
    .catch(err => {
      console.error('Error loading graph or colors:', err);
    });
} else {
  graphRequest()
    .then(graph => {
      drawGraph(graph, []);
    })
    .catch(err => {
      console.error('Error loading graph:', err);
    });
}


let allNodes = [];

function drawGraph(graph, firstColors = []) {
  allNodes = []; 
  const scale = 30;
  const offsetX = app.renderer.width / 2;
  const offsetY = app.renderer.height / 2;

  const colorKeys = Object.keys(colorMap).filter(k => k !== "white");

  for (const node of graph.vertices) {
    node.x = node.x * scale + offsetX;
    node.y = -node.y * scale + offsetY;
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
    node.colorLabel = colorMap.white; 
    let nodeLabel = null;
    const nodeContainer = new PIXI.Container();
    nodeContainer.x = node.x;
    nodeContainer.y = node.y;

    const circle = new PIXI.Graphics();
    circle.lineStyle(1, 0x000000);

    let isLocked = false;
    if (node.id < 5 && colorKeys[firstColors[node.id]] && level != 1) {
      const colorKey = colorKeys[firstColors[node.id]];
      node.colorLabel = colorMap[colorKey];
      node.selected = true;
      isLocked = true;
    }

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

    circle.interactive = !isLocked;

    let originalColor = node.colorLabel;

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
    });

    if (!isLocked) {
      circle.on('pointerdown', () => {
        if (!selectedColor) {
          const alertDiv = document.getElementById('no-color-picked-alert');
          alertDiv.style.display = 'block';
          setTimeout(() => {
            alertDiv.style.display = 'none';
          }, 3000);
          return;
        }
        const neighbors = getNeighbors(node, graph);
        for (const n of neighbors) {
          if (n.colorLabel === colorMap[selectedColor] && n.selected && colorMap[selectedColor] !== colorMap.white) {
            const alertColor = document.getElementById('adjacent-nodes-alert');
            alertColor.style.display = 'block';
            setTimeout(() => {
              alertColor.style.display = 'none';
            }, 3000);
            return;
          }
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

         if (verifyGraph()) {
          animateGraph(() => {
            const alertDiv = document.getElementById('level-completed-alert');
            alertDiv.style.display = 'block';
            setTimeout(() => {
              alertDiv.style.display = 'none';
            }, 4500);
          });
        } 
    });
  }

    if (level != 1 && node.selected && node.id < 5 && colorKeys[firstColors[node.id]]) {
      const colorKey = colorKeys[firstColors[node.id]];
      const style = new PIXI.TextStyle({
        fill: "#000000",
        fontSize: 14,
        fontWeight: "bold",
        align: "center"
      });
      nodeLabel = new PIXI.Text(numberMap[colorKey], style);
      nodeLabel.anchor.set(0.5);
      nodeLabel.x = 0;
      nodeLabel.y = 0;
      nodeContainer.addChild(nodeLabel);
    }

    app.stage.addChild(nodeContainer);
    allNodes.push({
      node,
      nodeContainer,
      circle,
      setCircleColor,
      getLabel: () => nodeLabel,
      setLabel: (lbl) => { nodeLabel = lbl; }
    });
  }
 
}


function whiteGraph() {
  selectedColor = null;
  const swatches = document.querySelectorAll('.color-swatch');
  swatches.forEach(swatch => swatch.classList.remove('selected'));
  allNodes.forEach(({ node, nodeContainer, setCircleColor, getLabel, setLabel }) => {
    if (node.id < 5 && level > 1) 
      return;
    node.selected = false;
    node.colorLabel = colorMap.white;
    setCircleColor(colorMap.white);

    const label = getLabel();
    if (label && nodeContainer.children.includes(label)) {
      nodeContainer.removeChild(label);
      setLabel(null);
    }
  });
}

document.getElementById('start-over-btn').addEventListener('click', () => {
  document.getElementById('adjacent-nodes-alert').style.display = 'none';
  document.getElementById('no-color-picked-alert').style.display = 'none';
  document.getElementById('modal-backdrop').style.display = 'block';
  document.getElementById('start-over').style.display = 'block';
});

document.getElementById('confirm-reset-btn').addEventListener('click', () => {
  whiteGraph();
  document.getElementById('start-over').style.display = 'none';
  document.getElementById('modal-backdrop').style.display = 'none';
});

document.getElementById('cancel-reset-btn').addEventListener('click', () => {
  document.getElementById('start-over').style.display = 'none';
  document.getElementById('modal-backdrop').style.display = 'none';

  
});

document.getElementById("next-level").addEventListener("click", () => {
  if (verifyGraph()) {
  const nextLevel = level + 1;
  const newUrl = `${window.location.pathname}?level=${nextLevel}`;
  window.location.href = newUrl;
} 
});


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
//  }

