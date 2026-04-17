#!/usr/bin/env python3
"""
Dev server launcher for FTC Sponsorship Portal.
Starts the Next.js dev server and prints useful local URLs.
"""

import subprocess
import sys
import os
import signal

PORT = 3000
APP_URL = f"http://localhost:{PORT}"

ROUTES = [
    ("Home",              "/"),
    ("Login",             "/login"),
    ("Signup",            "/signup"),
    ("Coach Dashboard",   "/dashboard"),
    ("Pitch Builder",     "/pitches/new"),
    ("Sponsor Browser",   "/sponsors/browse"),
    ("Sponsor Apply",     "/sponsors/apply"),
    ("Admin Moderation",  "/admin/moderation"),
    ("Admin Analytics",   "/admin/analytics"),
    ("Onboarding",        "/onboarding"),
]

def print_urls():
    width = 50
    print("\n" + "=" * width)
    print("  FTC Sponsorship Portal — Dev Server")
    print("=" * width)
    for label, path in ROUTES:
        print(f"  {label:<22} {APP_URL}{path}")
    print("=" * width + "\n")

def main():
    print_urls()

    project_dir = os.path.dirname(os.path.abspath(__file__))
    cmd = ["npm", "run", "dev", "--", "--port", str(PORT)]

    try:
        proc = subprocess.Popen(cmd, cwd=project_dir)
        proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down dev server...")
        proc.send_signal(signal.SIGTERM)
        proc.wait()
        sys.exit(0)

if __name__ == "__main__":
    main()
