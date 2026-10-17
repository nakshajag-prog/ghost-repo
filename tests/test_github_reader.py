"""Automated tests for the GitHub reader. They use a FAKE web connection, so
they need no internet and never contact GitHub."""
import json
import unittest

import github_reader as gr
from github_reader import GitHubReader, RepoError, classify_path, parse_github_url


def make_fake_http(info=None, tree=None, files=None, api_status=200):
    """Build a fake http_get that answers like GitHub would."""
    info = info if info is not None else {
        "full_name": "octo/demo", "default_branch": "main",
        "language": "Python", "description": "demo repo", "private": False}
    tree = tree if tree is not None else {"truncated": False, "tree": []}
    files = files or {}
    calls = []

    def fake(url, timeout):
        calls.append(url)
        if url.startswith("https://api.github.com/repos/") and "/git/trees/" in url:
            return api_status, json.dumps(tree).encode(), {}
        if url.startswith("https://api.github.com/repos/"):
            return api_status, json.dumps(info).encode(), {}
        if url.startswith("https://raw.githubusercontent.com/"):
            for path, body in files.items():
                if url.endswith("/" + path):
                    return 200, body if isinstance(body, bytes) else body.encode(), {}
            return 404, b"", {}
        raise AssertionError("unexpected URL requested: " + url)

    fake.calls = calls
    return fake


def blob(path, size=50):
    return {"path": path, "type": "blob", "size": size}


class UrlParsingTests(unittest.TestCase):
    def test_valid_urls(self):
        self.assertEqual(parse_github_url("https://github.com/octo/demo"), ("octo", "demo"))
        self.assertEqual(parse_github_url("https://github.com/octo/demo/"), ("octo", "demo"))
        self.assertEqual(parse_github_url("https://github.com/octo/demo.git"), ("octo", "demo"))
        self.assertEqual(parse_github_url("  https://www.github.com/a-b/c_d.e  "), ("a-b", "c_d.e"))

    def test_rejects_other_sites_and_shapes(self):
        bad = [
            "", None, "   ", "github.com/octo/demo", "http://github.com/octo/demo",
            "https://evil.com/octo/demo", "https://github.com.evil.com/octo/demo",
            "https://github.com/octo", "https://github.com/octo/demo/tree/main",
            "https://github.com/octo/demo?x=1", "https://github.com/../demo",
            "https://github.com/octo/..", "file:///etc/passwd",
            "https://github.com/" + "a" * 300 + "/x",
        ]
        for url in bad:
            with self.subTest(url=url):
                with self.assertRaises(RepoError):
                    parse_github_url(url)


class ClassifyPathTests(unittest.TestCase):
    def test_python_files_allowed(self):
        self.assertIsNone(classify_path("app.py"))
        self.assertIsNone(classify_path("pkg/sub/module.py"))

    def test_skips_dependency_and_generated_dirs(self):
        for path in ["node_modules/x/a.py", "venv/lib/a.py", ".venv/a.py",
                     "build/lib/a.py", "pkg/__pycache__/a.py", ".git/hooks/a.py"]:
            with self.subTest(path=path):
                self.assertIn("folder", classify_path(path))

    def test_skips_secret_names(self):
        for path in [".env", ".env.local", "keys/server.pem", "id_rsa", "credentials.py", "secrets.py"]:
            with self.subTest(path=path):
                self.assertIn("secrets", classify_path(path))

    def test_skips_unsupported_types(self):
        for path in ["README.md", "logo.png", "data.csv", "script.js"]:
            with self.subTest(path=path):
                self.assertIn("unsupported", classify_path(path))


class ReadRepositoryTests(unittest.TestCase):
    def test_happy_path_reads_real_content_and_reports_skips(self):
        http = make_fake_http(
            tree={"truncated": False, "tree": [
                blob("app.py"), blob("README.md"), blob("node_modules/z/a.py"),
                blob(".env"), blob("tests/test_app.py"), {"path": "src", "type": "tree"}]},
            files={"app.py": "print('hi')\n", "tests/test_app.py": "def test(): pass\n"})
        result = GitHubReader(http_get=http).read_repository("https://github.com/octo/demo")
        self.assertEqual([f["name"] for f in result["files"]], ["app.py", "tests/test_app.py"])
        self.assertEqual(result["files"][0]["content"], "print('hi')\n")
        self.assertEqual(result["repo"]["default_branch"], "main")
        self.assertEqual(result["repo"]["full_name"], "octo/demo")
        self.assertEqual(result["skipped"]["total"], 3)
        reasons = " | ".join(result["skipped"]["counts"])
        self.assertIn("unsupported", reasons)
        self.assertIn("folder", reasons)
        self.assertIn("secrets", reasons)

    def test_only_expected_hosts_are_contacted(self):
        http = make_fake_http(tree={"tree": [blob("a.py")]}, files={"a.py": "x=1"})
        GitHubReader(http_get=http).read_repository("https://github.com/octo/demo")
        for url in http.calls:
            self.assertTrue(url.startswith(("https://api.github.com/", "https://raw.githubusercontent.com/")))

    def test_repo_not_found(self):
        http = make_fake_http(api_status=404)
        with self.assertRaises(RepoError) as ctx:
            GitHubReader(http_get=http).read_repository("https://github.com/octo/nope")
        self.assertEqual(ctx.exception.status, 404)
        self.assertIn("not found", ctx.exception.message)

    def test_rate_limit_message(self):
        http = make_fake_http(api_status=403)
        with self.assertRaises(RepoError) as ctx:
            GitHubReader(http_get=http).read_repository("https://github.com/octo/demo")
        self.assertEqual(ctx.exception.status, 429)

    def test_private_repo_rejected(self):
        http = make_fake_http(info={"full_name": "octo/demo", "private": True})
        with self.assertRaises(RepoError):
            GitHubReader(http_get=http).read_repository("https://github.com/octo/demo")

    def test_too_large_repository_rejected(self):
        tree = {"truncated": False, "tree": [blob(f"f{i}.py") for i in range(gr.MAX_TREE_ENTRIES + 1)]}
        with self.assertRaises(RepoError) as ctx:
            GitHubReader(http_get=make_fake_http(tree=tree)).read_repository("https://github.com/octo/demo")
        self.assertIn("too large", ctx.exception.message)

    def test_truncated_tree_rejected(self):
        http = make_fake_http(tree={"truncated": True, "tree": [blob("a.py")]})
        with self.assertRaises(RepoError):
            GitHubReader(http_get=http).read_repository("https://github.com/octo/demo")

    def test_big_file_skipped_without_downloading(self):
        http = make_fake_http(tree={"tree": [blob("big.py", size=gr.MAX_FILE_BYTES + 1)]})
        result = GitHubReader(http_get=http).read_repository("https://github.com/octo/demo")
        self.assertEqual(result["files"], [])
        self.assertFalse(any("big.py" in u for u in http.calls if "raw." in u))
        self.assertIn("larger", " ".join(result["skipped"]["counts"]))

    def test_binary_and_non_utf8_skipped(self):
        http = make_fake_http(
            tree={"tree": [blob("a.py"), blob("b.py"), blob("c.py")]},
            files={"a.py": b"abc\x00def", "b.py": b"\xff\xfe\xfa", "c.py": "ok = 1\n"})
        result = GitHubReader(http_get=http).read_repository("https://github.com/octo/demo")
        self.assertEqual([f["name"] for f in result["files"]], ["c.py"])
        self.assertEqual(result["skipped"]["total"], 2)

    def test_secret_content_skipped(self):
        http = make_fake_http(
            tree={"tree": [blob("a.py"), blob("b.py")]},
            files={"a.py": 'KEY = "AKIAABCDEFGHIJKLMNOP"\n', "b.py": "fine = True\n"})
        result = GitHubReader(http_get=http).read_repository("https://github.com/octo/demo")
        self.assertEqual([f["name"] for f in result["files"]], ["b.py"])
        self.assertIn("secret", " ".join(result["skipped"]["counts"]))

    def test_file_count_limit(self):
        n = gr.MAX_FILES + 5
        files = {f"f{i:02d}.py": "x = 1\n" for i in range(n)}
        http = make_fake_http(tree={"tree": [blob(p) for p in files]}, files=files)
        result = GitHubReader(http_get=http).read_repository("https://github.com/octo/demo")
        self.assertEqual(len(result["files"]), gr.MAX_FILES)
        self.assertEqual(result["skipped"]["total"], 5)

    def test_time_limit_stops_downloads(self):
        # Clock readings: start=0, first file check=0 (in time), second file check=100 (too late).
        ticks = iter([0, 0, 100, 100, 100])
        http = make_fake_http(tree={"tree": [blob("a.py"), blob("b.py")]}, files={"a.py": "1", "b.py": "2"})
        result = GitHubReader(http_get=http, clock=lambda: next(ticks)).read_repository("https://github.com/octo/demo")
        self.assertEqual([f["name"] for f in result["files"]], ["a.py"])
        self.assertEqual(result["skipped"]["counts"], {"time limit reached": 1})

    def test_repo_without_python_files_returns_empty_list_honestly(self):
        http = make_fake_http(tree={"tree": [blob("index.js"), blob("README.md")]})
        result = GitHubReader(http_get=http).read_repository("https://github.com/octo/demo")
        self.assertEqual(result["files"], [])
        self.assertEqual(result["skipped"]["total"], 2)


if __name__ == "__main__":
    unittest.main()
