const urlParams = new URLSearchParams(window.location.search);
if (!urlParams.has('level')) {
  urlParams.set('level', '1');
  const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
  window.history.replaceState({}, '', newUrl); 
}
const level = parseInt(urlParams.get('level'), 10);

document.getElementById("level-number").textContent = level;

const container1 = document.getElementById('graph-container-1');
const container2 = document.getElementById('graph-container-2');

const app1 = new PIXI.Application({ 
  width: container1.clientWidth, 
  height: container1.clientHeight, 
  backgroundAlpha: 0, 
  resolution: window.devicePixelRatio || 1, 
  antialias: true });
const app2 = new PIXI.Application({ 
  width: container2.clientWidth, 
  height: container2.clientHeight, 
  backgroundAlpha: 0, 
  resolution: window.devicePixelRatio || 1, 
  antialias: true 
});

container1.appendChild(app1.view);
container2.appendChild(app2.view);

const allNodes1 = [];
const allNodes2 = [];

Promise.all([
  fetch(`/api/graph?level=${level}`),
  fetch(`/api/graph?level=${level + 1}`),
  level >= 2 ? fetch(`/api/colors?level=${level}`) : Promise.resolve({ json: () => ({ first_four_colors: [] }) }),
  fetch(`/api/colors?level=${level + 1}`)
])
.then(async ([res1, res2, res3, res4]) => {
  const [graph1, graph2, colorData1, colorData2] = await Promise.all([
    res1.json(), res2.json(), res3.json(), res4.json()
  ]);
  
  drawGraph(graph1, colorData1.first_four_colors || [], app1, allNodes1, container1);
  drawGraph(graph2, colorData2.first_four_colors || [], app2, allNodes2, container2);
});


window.addEventListener('resize', () => {
  app1.renderer.resize(container1.clientWidth, container1.clientHeight);
  app2.renderer.resize(container2.clientWidth, container2.clientHeight);
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
  return allNodesList.every(({ node }) => {
  if (node.id < 5 && level != 1) return true;
    return node.colorLabel !== colorMap.white && node.selected;
  });
}

function animateGraph(appInstance, allNodesList, onComplete) {
  const amplitude = 12;
  const duration = 600; 
  const waveSpeed = 80;
  const originalYs = allNodesList.map(({ nodeContainer }) => nodeContainer.y);
  let startTime = performance.now();

  function animateWave() {
    const elapsed = performance.now() - startTime;
    let allDone = true;

    allNodesList.forEach(({ nodeContainer }, i) => {
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
      appInstance.ticker.remove(animateWave);
      allNodesList.forEach(({ nodeContainer }, i) => {
        nodeContainer.y = originalYs[i];
      });
      if (typeof onComplete === "function") onComplete();
    }
  }

  appInstance.ticker.add(animateWave); 
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

let allNodes = allNodes1; 

function drawGraph(graph, firstColors = [], appInstance, allNodesList, container) {
  allNodesList.length = 0; 
  const scale = 30;
  const offsetX = appInstance.renderer.width / 2;
  const offsetY = appInstance.renderer.height / 2;
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
    appInstance.stage.addChild(line);
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
    if (node.id < 5 && colorKeys[firstColors[node.id]] && level !== 1) {
      const colorKey = colorKeys[firstColors[node.id]];
      node.colorLabel = colorMap[colorKey];
      node.selected = true;
      isLocked = true;
    }

    circle.beginFill(node.colorLabel);
    circle.drawCircle(0, 0, 15);
    circle.endFill();
    nodeContainer.addChild(circle);

    circle.interactive = !isLocked;
    circle.hitArea = new PIXI.Circle(0, 0, 15);

    function setCircleColor(color) {
      circle.clear();
      circle.lineStyle(1, 0x000000);
      circle.beginFill(color);
      circle.drawCircle(0, 0, 15);
      circle.endFill();
    }

    circle.on('pointerover', () => {
      container.style.cursor = 'pointer';
      nodeContainer.scale.set(1.1);
      if (selectedColor) {
        setCircleColor(colorMap[selectedColor]);
      }
      if (nodeLabel) nodeContainer.removeChild(nodeLabel);
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

        if (nodeLabel) nodeContainer.removeChild(nodeLabel);

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

        if (verifyGraph(allNodesList)) {
  animateGraph(appInstance, allNodesList, () => {
    document.getElementById('level-completed-alert').style.display = 'block';
      setTimeout(() => {
        document.getElementById('level-completed-alert').style.display = 'none';
      }, 4500);
    });
  }
});
    }

    if (level !== 1 && node.selected && node.id < 5 && colorKeys[firstColors[node.id]]) {
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

    appInstance.stage.addChild(nodeContainer);
    allNodesList.push({
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
/*
document.getElementById("next-level").addEventListener("click", () => {
  const graph = document.getElementById('graph-container-1');
  graph.classList.add('flip');

  setTimeout(() => {
    graph.classList.remove('flip');
    graph.style.zIndex = '20';  
    graph.classList.add('continue-flip');

    setTimeout(() => {
      const userConfirmed = confirm("Ready to go to the next level?");
      if (userConfirmed) {
        const nextLevel = level + 1;
        const newUrl = `${window.location.pathname}?level=${nextLevel}`;
        window.location.href = newUrl;
      } else {
        graph.classList.remove('continue-flip');
      }
    }, 1000);  
  }, 1000);  
});

*/

document.getElementById("next-level").addEventListener("click", () => {
  const graph = document.getElementById('graph-container-1');
  const lines = document.getElementById('lines');
  const linesV = document.getElementById('linesV');

  // Step 1: Trigger initial flip
  graph.classList.add('flip');
  lines.classList.add('flip');
  linesV.classList.add('flip');

  setTimeout(() => {
    // Step 2: Switch to continuous flip
    graph.classList.remove('flip');
    lines.classList.remove('flip');
    linesV.classList.remove('flip');

    graph.classList.add('continue-flip');
    lines.classList.add('continue-flip');
    linesV.classList.add('continue-flip');

    graph.style.zIndex = '20';

    setTimeout(() => {
      const userConfirmed = confirm("Ready to go to the next level?");
      if (userConfirmed) {
        const nextLevel = level + 1;
        const newUrl = `${window.location.pathname}?level=${nextLevel}`;
        window.location.href = newUrl;
      } else {
        graph.classList.remove('continue-flip');
        lines.classList.remove('continue-flip');
        linesV.classList.remove('continue-flip');
      }
    }, 1000);
  }, 1000);
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

