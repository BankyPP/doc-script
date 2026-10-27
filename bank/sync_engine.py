#!/usr/bin/env python3
"""Copy the old-exam site engine (BankyPP/ac-mdcu) into bank/ — run whenever a feature is added to the old-exam sites so NL & Compre stay 100% the same.
python3 bank/sync_engine.py <path to an ac-mdcu checkout>
Copies template.html, build_site.py and site/* unchanged (theme/gate differences are applied at build time by bank/build.py, not here)."""
import os, shutil, subprocess, sys
SRC = os.path.abspath(sys.argv[1]); HERE = os.path.dirname(os.path.abspath(__file__))
for f in ('template.html', 'build_site.py'): shutil.copy(os.path.join(SRC, f), os.path.join(HERE, f))
d = os.path.join(HERE, 'site'); shutil.rmtree(d, ignore_errors=True); shutil.copytree(os.path.join(SRC, 'site'), d)
try: rev = subprocess.check_output(['git', '-C', SRC, 'log', '-1', '--format=%h %cd %s', '--date=short'], text=True).strip()
except Exception: rev = '?'
open(os.path.join(HERE, 'ENGINE_VERSION.txt'), 'w', encoding='utf-8').write('BankyPP/ac-mdcu ' + rev + '\n')
print('engine synced from', rev)
