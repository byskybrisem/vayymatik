"""Resolve creative notes against the actual voice-driven timeline."""
def manifest(topic, timeline, narration, events):
    specs = {s["id"]: s for s in topic["scenes"]}
    fps = timeline["fps"]
    result = []
    for scene in timeline["scenes"]:
        start, end = scene["from"], scene["from"] + scene["dur"]
        kind = scene["type"]
        backend = {"cinematic": "blender-cycles-cpu", "world3d": "three-r3f"}.get(kind, "remotion")
        notes = specs[scene["id"]].get("direction", {})
        result.append({
            "id": scene["id"], "from_frame": start, "until_frame": end,
            "backend": backend, "direction": notes, "props": scene["props"],
            "narration": [line for line in narration if line["start"] < end/fps and line["end"] > start/fps],
            "captions": [p for p in timeline["captions"] if p["from"] < end and p["to"] > start],
            "sounds": [e for e in events if start <= e["t"]*fps < end],
        })
    return {"schema": 1, "topic": topic["id"], "fps": fps,
            "size": [timeline["width"], timeline["height"]], "scenes": result}
