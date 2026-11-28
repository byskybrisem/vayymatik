"""Read-only runtime inventory for Claude and CI."""
import json
import os
import platform
import shutil
import subprocess
from pathlib import Path

from ..paths import ROOT


def inventory():
    tools = {}
    for name, flag in (("blender", "-v"), ("ffmpeg", "-version"), ("ffprobe", "-version"),
                       ("node", "-v"), ("chromium", "--version")):
        path = shutil.which(name)
        if path is None:
            tools[name] = None
            continue
        result = subprocess.run([path, flag], capture_output=True, text=True, timeout=10)
        tools[name] = {"path": path, "version": (result.stdout.splitlines() or [None])[0],
                       "exit_code": result.returncode}
    cgroup = Path("/sys/fs/cgroup")
    limits = {name: (cgroup / name).read_text().strip()
              for name in ("memory.max", "cpu.max") if (cgroup / name).is_file()}
    return {"os": platform.platform(), "python": platform.python_version(),
            "logical_cpus": os.cpu_count(), "limits": limits, "disk_free": shutil.disk_usage(ROOT).free,
            "tools": tools, "configured_browser": os.getenv("REMOTION_BROWSER"),
            "blender_backend": "cycles-cpu", "webgl_probe_performed": False}


if __name__ == "__main__":
    print(json.dumps(inventory(), indent=2))
