from vayy.studio.checkpoint import render_chunks
from vayy.paths import BUILD
from pathlib import Path
import tempfile
BUILD.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(dir=BUILD) as temp:
    d=Path(temp)
    script=d/'fixture.py'
    script.write_text("""import sys,subprocess
from pathlib import Path
args=sys.argv
a,b=map(int,args[args.index('--frames')+1].split('-'))
Path(__file__).with_suffix('.calls').open('a').write(str(a)+'\\n')
subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=size=64x64:rate=30','-frames:v',str(b-a+1),'-c:v','libx264',args[args.index('--out')+1]],check=True)
""")
    cmd=['python',str(script),'--out',str(d/'final.mp4')]
    def run():
        render_chunks(cmd,dict(width=64,height=64,fps=30,durationInFrames=9),d/'cache',d/'final.mp4',3)
    run()
    run()
    sorted((d/'cache').rglob('*.mp4'))[1].write_bytes(b'incomplete')
    run()
    assert script.with_suffix('.calls').read_text().splitlines()==['0','3','6','3']
    print('PASS: cold, warm and corrupt-chunk recovery')
