"""GHOST REPO — public GitHub repository reader (Phase 2).

Reads small public Python repositories using only the Python standard library.
It never needs a GitHub password or token, and it never runs any repository code.

How it stays safe:
  * Only https://github.com/OWNER/REPO URLs are accepted. We build every
    request URL ourselves from the validated owner and repo names, so a user
    cannot point the server at some other website.
  * Hard limits on file count, file size, total size, and time.
  * Files are only READ as text. Nothing is executed.
"""
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request

# ---- Limits (change these numbers if you want a bigger or smaller prototype) ----
MAX_TREE_ENTRIES = 3000          # refuse repositories with more files than this
MAX_FILES = 40                   # most source files we will read
MAX_FILE_BYTES = 100_000         # largest single file (100 KB)
MAX_TOTAL_BYTES = 1_000_000      # largest total download (1 MB)
TOTAL_TIME_SECONDS = 25          # overall time budget
REQUEST_TIMEOUT_SECONDS = 10     # per web request
MAX_DOWNLOAD_BYTES = 5_000_000   # never read more than 5 MB from one response

SUPPORTED_EXTENSIONS = (".py",)

SKIP_DIRS = {
    ".git", ".github", "node_modules", "venv", ".venv", "env", "__pycache__",
    "site-packages", "dist", "build", ".tox", ".mypy_cache", ".pytest_cache",
    ".ruff_cache", ".idea", ".vscode", "vendor", "migrations", ".eggs",
}

SECRET_NAME_PATTERNS = [
    r"^\.env($|\.)", r"\.pem$", r"\.key$", r"\.p12$", r"\.pfx$",
    r"^id_(rsa|dsa|ecdsa|ed25519)", r"^credentials", r"^secrets?\.",
    r"\.keystore$",
]
SECRET_CONTENT_PATTERNS = [
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    r"\bAKIA[0-9A-Z]{16}\b",
    r"\bghp_[A-Za-z0-9]{30,}\b",
    r"\bgithub_pat_[A-Za-z0-9_]{30,}\b",
    r"\bsk-[A-Za-z0-9]{32,}\b",
    r"\bhf_[A-Za-z0-9]{30,}\b",
]

_URL_RE = re.compile(
    r"^https://(?:www\.)?github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?/?$"
)

SKIP_EXAMPLE_LIMIT = 30


class RepoError(Exception):
    """An error whose message is safe and helpful to show to the user."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def parse_github_url(url):
    """Return (owner, repo) for a supported GitHub URL, or raise RepoError."""
    if not isinstance(url, str) or not url.strip():
        raise RepoError("Please paste a GitHub repository URL.")
    url = url.strip()
    if len(url) > 200:
        raise RepoError("That URL is too long to be a GitHub repository URL.")
    match = _URL_RE.match(url)
    if not match:
        raise RepoError(
            "Unsupported URL. Use the form https://github.com/OWNER/REPOSITORY "
            "(public repositories only, no extra path such as /tree/main)."
        )
    owner, repo = match.group(1), match.group(2)
    if owner in (".", "..") or repo in (".", ".."):
        raise RepoError("That does not look like a valid GitHub repository URL.")
    return owner, repo


def default_http_get(url, timeout):
    """Fetch a URL. Returns (status_code, body_bytes, headers_dict)."""
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "ghost-repo-hackathon", "Accept": "application/vnd.github+json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read(MAX_DOWNLOAD_BYTES), dict(response.headers)
    except urllib.error.HTTPError as err:
        return err.code, b"", dict(err.headers or {})
    except (urllib.error.URLError, TimeoutError, OSError) as err:
        raise RepoError(
            "Could not reach GitHub (network problem or timeout). "
            "Check your internet connection and try again.", status=502,
        ) from err


def _is_secret_name(filename):
    return any(re.search(p, filename, re.IGNORECASE) for p in SECRET_NAME_PATTERNS)


def _contains_secret(text):
    return any(re.search(p, text) for p in SECRET_CONTENT_PATTERNS)


def classify_path(path):
    """Decide if a repository path may be read. Returns None (ok) or a skip reason."""
    parts = path.split("/")
    if any(part in SKIP_DIRS for part in parts[:-1]):
        return "inside a dependency, generated, or tooling folder"
    filename = parts[-1]
    if _is_secret_name(filename):
        return "file name suggests secrets or credentials"
    if not filename.lower().endswith(SUPPORTED_EXTENSIONS):
        return "unsupported file type (this version reads only .py files)"
    return None


class GitHubReader:
    def __init__(self, http_get=default_http_get, clock=time.monotonic):
        self._http_get = http_get
        self._clock = clock

    # -- helpers -------------------------------------------------------
    def _get_json(self, url):
        status, body, headers = self._http_get(url, REQUEST_TIMEOUT_SECONDS)
        if status == 404:
            raise RepoError(
                "Repository not found. Check the URL, and remember that only "
                "public repositories are supported.", status=404,
            )
        if status in (403, 429):
            raise RepoError(
                "GitHub's rate limit for anonymous requests was reached. "
                "Wait a while (up to an hour) and try again.", status=429,
            )
        if status != 200:
            raise RepoError(f"GitHub returned an unexpected status ({status}).", status=502)
        try:
            return json.loads(body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError) as err:
            raise RepoError("GitHub sent a response we could not understand.", status=502) from err

    # -- main entry point ---------------------------------------------
    def read_repository(self, url):
        owner, repo = parse_github_url(url)
        started = self._clock()

        info = self._get_json(f"https://api.github.com/repos/{owner}/{repo}")
        if info.get("private"):
            raise RepoError("Private repositories are not supported.")
        if "full_name" not in info:
            raise RepoError("GitHub sent an unexpected repository description.", status=502)
        branch = info.get("default_branch") or "main"

        tree_url = (
            f"https://api.github.com/repos/{owner}/{repo}/git/trees/"
            f"{urllib.parse.quote(branch, safe='')}?recursive=1"
        )
        tree = self._get_json(tree_url)
        entries = [e for e in tree.get("tree", []) if e.get("type") == "blob"]
        if tree.get("truncated") or len(entries) > MAX_TREE_ENTRIES:
            raise RepoError(
                f"This repository is too large for the prototype "
                f"(limit: {MAX_TREE_ENTRIES} files). Try a smaller repository."
            )

        counts = {}
        examples = []

        def skip(path, reason):
            counts[reason] = counts.get(reason, 0) + 1
            if len(examples) < SKIP_EXAMPLE_LIMIT:
                examples.append({"path": path, "reason": reason})

        candidates = []
        for entry in sorted(entries, key=lambda e: (e["path"].count("/"), e["path"])):
            path = entry["path"]
            reason = classify_path(path)
            if reason:
                skip(path, reason)
            elif entry.get("size", 0) > MAX_FILE_BYTES:
                skip(path, f"file larger than {MAX_FILE_BYTES // 1000} KB")
            else:
                candidates.append(entry)

        files = []
        total_bytes = 0
        for entry in candidates:
            path = entry["path"]
            if len(files) >= MAX_FILES:
                skip(path, f"file limit reached ({MAX_FILES} files)")
                continue
            if self._clock() - started > TOTAL_TIME_SECONDS:
                skip(path, "time limit reached")
                continue
            if total_bytes + entry.get("size", 0) > MAX_TOTAL_BYTES:
                skip(path, "total size limit reached")
                continue

            raw_url = (
                f"https://raw.githubusercontent.com/{owner}/{repo}/"
                f"{urllib.parse.quote(branch, safe='/')}/{urllib.parse.quote(path)}"
            )
            status, body, _ = self._http_get(raw_url, REQUEST_TIMEOUT_SECONDS)
            if status != 200:
                skip(path, f"could not be downloaded (status {status})")
                continue
            if len(body) > MAX_FILE_BYTES or b"\x00" in body:
                skip(path, "binary, or larger than the size limit")
                continue
            try:
                text = body.decode("utf-8")
            except UnicodeDecodeError:
                skip(path, "binary, or not UTF-8 text")
                continue
            if _contains_secret(text):
                skip(path, "possible secret or key found inside the file")
                continue

            total_bytes += len(body)
            files.append({"name": path, "role": "Source file from the connected repository",
                          "content": text, "size": len(body)})

        return {
            "repo": {
                "owner": owner,
                "name": repo,
                "full_name": info.get("full_name", f"{owner}/{repo}"),
                "url": f"https://github.com/{owner}/{repo}",
                "description": info.get("description") or "",
                "default_branch": branch,
                "github_language": info.get("language") or "Unknown",
            },
            "files": files,
            "skipped": {"total": sum(counts.values()), "counts": counts, "examples": examples},
            "limits": {
                "max_files": MAX_FILES,
                "max_file_kb": MAX_FILE_BYTES // 1000,
                "max_total_kb": MAX_TOTAL_BYTES // 1000,
                "supported_types": list(SUPPORTED_EXTENSIONS),
            },
        }
