"""Tests for the Flask routes (no internet needed)."""
import unittest
from unittest import mock

import app as ghost_app
from github_reader import RepoError


class RouteTests(unittest.TestCase):
    def setUp(self):
        self.client = ghost_app.app.test_client()

    def test_home_page_loads(self):
        self.assertEqual(self.client.get("/").status_code, 200)

    def test_sample_case_has_real_source_files(self):
        data = self.client.get("/api/case").get_json()
        names = [f["name"] for f in data["files"]]
        self.assertEqual(names, ["calculator.py", "test_calculator.py"])
        self.assertIn("def average", data["files"][0]["content"])

    def test_connect_rejects_bad_url(self):
        resp = self.client.post("/api/repo/connect", json={"url": "https://evil.com/a/b"})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("error", resp.get_json())

    def test_connect_rejects_missing_body(self):
        resp = self.client.post("/api/repo/connect", data="not json")
        self.assertEqual(resp.status_code, 400)

    def test_connect_passes_through_reader_errors(self):
        with mock.patch.object(ghost_app.GitHubReader, "read_repository",
                               side_effect=RepoError("nope", status=404)):
            resp = self.client.post("/api/repo/connect", json={"url": "https://github.com/a/b"})
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(resp.get_json()["error"], "nope")

    def test_connect_hides_unexpected_errors(self):
        with mock.patch.object(ghost_app.GitHubReader, "read_repository",
                               side_effect=RuntimeError("secret internal detail")):
            resp = self.client.post("/api/repo/connect", json={"url": "https://github.com/a/b"})
        self.assertEqual(resp.status_code, 500)
        self.assertNotIn("secret internal detail", resp.get_data(as_text=True))


if __name__ == "__main__":
    unittest.main()
