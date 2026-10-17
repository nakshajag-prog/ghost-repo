<<<<<<< HEAD
# GHOST REPO — Every Bug Leaves a Trace

A software-detective web app. It examines a broken Python project, runs real tests,
and (in later steps) asks an open-weight AI model to investigate the failure.

**Status: Step 1 of 8 — interface and sample case only.**
Test running, AI investigation, and patch verification are not built yet.

## Setup
1. Install Python 3.10 or newer.
2. In this folder, run: `pip install -r requirements.txt`
3. Start the app: `python app.py`
4. Open http://127.0.0.1:5000

## Dependencies
- Flask (BSD-3-Clause license)

## License / model terms
To be completed once the AI model is chosen (Step 3).
=======

# GHOST REPO — Every Bug Leaves a Trace

A software-detective web app. It examines Python projects, and in later phases runs
real tests and asks an open-weight AI model to investigate failures.

**Status: Phase 2 of 8.** Built so far: the interface, the sample broken calculator,
and a reader for small public GitHub repositories. Test running, static analysis,
the AI detective, patch review, verification and XP are **not built yet**.

## Setup
1. Install Python 3.10 or newer.
2. In this folder run: `pip install -r requirements.txt`
3. Start the app: `python3 app.py`
4. Open http://127.0.0.1:5000

## Run the automated tests
`python3 -m unittest discover`
(These use a fake web connection and need no internet.)

## What the GitHub reader does
- Accepts only `https://github.com/OWNER/REPOSITORY` for public repositories.
- Uses GitHub's public web API and raw file downloads. No password or token.
- Reads `.py` files as text only. It never runs repository code.
- Limits: 40 files, 100 KB per file, 1 MB total, 3000 files in the repository, 25 seconds.
- Skips dependency/generated folders, binary or non-UTF-8 files, files whose names or
  contents look like secrets, and unsupported file types. Every skip is reported in the app.
- Anonymous GitHub API requests are rate limited (about 60 per hour per network).

## Dependencies
- Flask (BSD-3-Clause license)
- Everything else uses the Python standard library.

## Project layout
- `app.py` — web server and routes
- `github_reader.py` — GitHub repository reader (separate from the interface)
- `static/` — interface (HTML, CSS, JavaScript)
- `cases/calculator/` — built-in sample broken project
- `tests/` — automated tests

## License / model terms
To be completed (MIT license planned; model terms once the AI model is chosen).
=======
# ghost-repo
Turn real software repositories into AI-powered mysteries. Investigate code, uncover bugs, follow evidence, and verify fixes.
>>>>>>> origin/main
>>>>>>> a29dc896b4095539c02e693fd877b33393dfdbea
