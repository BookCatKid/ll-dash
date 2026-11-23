"""WSGI entrypoint — used by PythonAnywhere (and any WSGI server).

On every reload this best-effort `git pull`s the deploy directory, so the
GitHub Action only needs to trigger a reload — no SSH or build step on the
host. If the directory isn't a git checkout (e.g. manual upload), the pull
fails silently and the existing code is served.
"""
import os
import subprocess

try:
    here = os.path.dirname(os.path.abspath(__file__))
    subprocess.run(
        ['git', 'pull', '--ff-only'],
        cwd=here,
        capture_output=True,
        timeout=30,
    )
except Exception:
    pass

from app import create_app

application = create_app()
