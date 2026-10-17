<<<<<<< HEAD
"""GHOST REPO backend (Step 1: serves the interface and the sample case)."""
from pathlib import Path

from flask import Flask, jsonify, send_from_directory
=======
"""GHOST REPO backend (Phase 2: sample case + public GitHub repository reader)."""
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from github_reader import GitHubReader, RepoError
>>>>>>> a29dc896b4095539c02e693fd877b33393dfdbea

BASE = Path(__file__).parent
CASE_DIR = BASE / "cases" / "calculator"

app = Flask(__name__, static_folder="static", static_url_path="/static")

# Only these files can ever be sent to the browser.
CASE_FILES = [
    {"name": "calculator.py", "role": "Source code under investigation"},
    {"name": "test_calculator.py", "role": "Tests that define correct behavior"},
]

CASE_INFO = {
    "id": "GR-0001",
    "title": "The Calculator That Cannot Count",
    "summary": "A small Python calculator library. Its test suite is expected "
               "to pass, but something in the code does not add up.",
    "language": "Python",
}


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/case")
def get_case():
    files = []
    for f in CASE_FILES:
        text = (CASE_DIR / f["name"]).read_text(encoding="utf-8")
        files.append({**f, "content": text})
    return jsonify({**CASE_INFO, "files": files})


<<<<<<< HEAD
=======
@app.route("/api/repo/connect", methods=["POST"])
def connect_repo():
    payload = request.get_json(silent=True) or {}
    try:
        result = GitHubReader().read_repository(payload.get("url"))
    except RepoError as err:
        return jsonify({"error": err.message}), err.status
    except Exception:  # never leak internal details to the browser
        app.logger.exception("Unexpected error while reading repository")
        return jsonify({"error": "Something went wrong while reading the repository."}), 500
    return jsonify(result)


>>>>>>> a29dc896b4095539c02e693fd877b33393dfdbea
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
