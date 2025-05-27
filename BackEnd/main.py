import os
import json
from fastapi import FastAPI
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

frontend_path = os.path.join(os.path.dirname(__file__), "..", "FrontEnd")

app.mount("/static", StaticFiles(directory=frontend_path), name="static")

@app.get("/")
async def root():
    return FileResponse(os.path.join(frontend_path, "index.html"))

@app.get("/api/graph")
async def get_graph():
    json_path = os.path.join(frontend_path, "graphCoord.json")
    print("Location for graphCoord.json:", json_path)
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            sage_data = json.load(f)
        
        return JSONResponse(content=sage_data)
    except FileNotFoundError:
        return JSONResponse(content={"error": "Graph data not found"}, status_code=404)
