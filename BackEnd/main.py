import os
import json
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

frontend_path = os.path.join(os.path.dirname(__file__), "..", "FrontEnd")

app.mount("/static", StaticFiles(directory=frontend_path), name="static")

@app.get("/")
async def root():
    return FileResponse(os.path.join(frontend_path, "index.html"))

@app.get("/api/graph")
async def get_graph(level: int = Query(1)):
    json_path = os.path.join(frontend_path, f"graphCoord_level{level}.json")
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            sage_data = json.load(f)
        return JSONResponse(content=sage_data)
    except FileNotFoundError:
        return JSONResponse(content={"error": f"Graph data for level {level} not found"}, status_code=404)

@app.get("/api/colors")
async def get_first_four_colors(level: int = Query(1)):
    json_path = os.path.join(frontend_path, f"coloring_level{level}.json")
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            color_dict = json.load(f)
        color_to_index = {color: idx for idx, color in enumerate(color_dict.keys())}
        node_color_indices = {}
        for color, nodes in color_dict.items():
            for node in nodes:
                node_color_indices[node] = color_to_index[color]
        first_four = [node_color_indices.get(i) for i in range(5)]
        return JSONResponse(content={"first_four_colors": first_four})
    except FileNotFoundError:
        return JSONResponse(content={"error": f"Coloring data for level {level} not found"}, status_code=404)
