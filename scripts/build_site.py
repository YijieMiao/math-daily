"""Package only public website files; keep source tools out of the deployment."""
from pathlib import Path
import shutil
import subprocess

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'_site'

def build():
    if OUTPUT.exists():shutil.rmtree(OUTPUT)
    OUTPUT.mkdir()
    for path in ROOT.iterdir():
        if path.is_file() and path.suffix in {'.html','.css','.js'}:shutil.copy2(path,OUTPUT/path.name)
    for name in ('assets','content','data'):shutil.copytree(ROOT/name,OUTPUT/name)
    (OUTPUT/'.nojekyll').touch()
    (OUTPUT/'release.txt').write_text(subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True))
    return OUTPUT

if __name__=='__main__':print(build())
