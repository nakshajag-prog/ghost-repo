import unittest

from calculator import add, subtract, multiply, divide, average, percentage


class TestCalculator(unittest.TestCase):
    def test_add(self):
        self.assertEqual(add(2, 3), 5)

    def test_subtract(self):
        self.assertEqual(subtract(10, 4), 6)

    def test_multiply(self):
        self.assertEqual(multiply(6, 7), 42)

    def test_divide(self):
        self.assertEqual(divide(20, 4), 5)

    def test_divide_by_zero(self):
        with self.assertRaises(ValueError):
            divide(1, 0)

    def test_average(self):
        self.assertEqual(average([2, 4, 6]), 4)

    def test_percentage(self):
        self.assertEqual(percentage(25, 200), 12.5)


if __name__ == "__main__":
    unittest.main()
