"""Bake a vertical ball drop in metres, with a fixed plane and restitution."""
import math


def bake_drop(height, radius, fps, frames, restitution=.53):
    if not height > radius > 0 or not 0 <= restitution < 1 or fps < 1:
        raise ValueError("Invalid drop parameters")
    y, velocity, resting = height, 0., False
    positions, hits = [height], []
    for frame in range(1, frames):
        if not resting:
            dt = 1 / fps
            while dt > 1e-10:
                contact = (velocity + math.sqrt(velocity**2 + 19.62 * max(0, y-radius))) / 9.81
                if contact > dt:
                    y += velocity * dt - 4.905 * dt**2
                    velocity -= 9.81 * dt
                    break
                y = radius
                velocity = (9.81 * contact - velocity) * restitution
                dt -= contact
                if velocity < .18:
                    resting = True
                    break
                hits.append((frame, velocity))
        positions.append(y)
    return positions, hits


def expand(scene, fps, events, spec):
    props = scene["props"]
    for actor in props.get("objects", []):
        gait = actor.get("contact")
        if actor.get("kind") == "character" and gait:
            for step in range(1, gait["steps"] + 1):
                frame = round(step * gait["stepTime"] * fps)
                if frame < scene["dur"]:
                    props.setdefault("beats", []).append(frame)
                    events.append({"type": "footstep", "t": (scene["from"] + frame) / fps,
                                   "seed": 100 + step, "gain": -15})
    if not spec:
        return
    ball = next(o for o in props["objects"] if o["kind"] == "dropBench")
    last = ball["track"][-1]
    x, height, z = last["v"]
    release = last["t"]
    ys, hits = bake_drop(height, .078, fps, scene["dur"] - release)
    ball["track"].extend({"t": release+i, "v": [x,y,z], "e": "linear"}
                         for i,y in enumerate(ys[1:], 1))
    for frame, speed in hits:
        when = release + frame
        props.setdefault("beats", []).append(when)
        events.append({"type": "ball_contact", "t": (scene["from"] + when)/fps,
                       "seed": 72 + frame, "gain": -18 + 10*math.log10(speed)})
