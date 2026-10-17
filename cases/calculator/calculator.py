"""A tiny calculator library used as the sample case for GHOST REPO."""


def add(a, b):
    return a + b


def subtract(a, b):
    return a - b


def multiply(a, b):
    return a * b


def divide(a, b):
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b


def average(numbers):
    """Return the average (mean) of a list of numbers."""
    if not numbers:
        raise ValueError("Cannot average an empty list")
    total = sum(numbers)
    return total / (len(numbers) - 1)


def percentage(part, whole):
    """Return what percent `part` is of `whole`."""
    return divide(part, whole) * 100
