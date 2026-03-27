"""
Seed script — inserts 10 easy DSA problems into MongoDB.
Run from the backend directory:
    python seed_dsa_problems.py
"""
import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "")
SEED_USER_ID = "seed"

PROBLEMS = [
    {
        "title": "Sum of Two Numbers",
        "description": (
            "Read two integers from input and print their sum.\n\n"
            "**Input:**\n"
            "Two integers on separate lines.\n\n"
            "**Output:**\n"
            "A single integer — the sum.\n\n"
            "**Example:**\n"
            "Input:\n```\n3\n7\n```\n"
            "Output:\n```\n10\n```"
        ),
        "constraints": "−10⁹ ≤ a, b ≤ 10⁹",
        "starter_code": {
            "python": "a = int(input())\nb = int(input())\n# your code here\n"
        },
        "test_cases": [
            {"input": "3\n7",   "expected_output": "10",   "is_hidden": False},
            {"input": "0\n0",   "expected_output": "0",    "is_hidden": False},
            {"input": "-5\n5",  "expected_output": "0",    "is_hidden": True},
            {"input": "100\n200","expected_output": "300", "is_hidden": True},
        ],
    },
    {
        "title": "Reverse a String",
        "description": (
            "Read a string and print it reversed.\n\n"
            "**Input:**\nA single line string.\n\n"
            "**Output:**\nThe reversed string.\n\n"
            "**Example:**\n"
            "Input:\n```\nhello\n```\n"
            "Output:\n```\nolleh\n```"
        ),
        "constraints": "1 ≤ len(s) ≤ 1000",
        "starter_code": {
            "python": "s = input()\n# your code here\n"
        },
        "test_cases": [
            {"input": "hello",    "expected_output": "olleh",    "is_hidden": False},
            {"input": "abcde",    "expected_output": "edcba",    "is_hidden": False},
            {"input": "a",        "expected_output": "a",        "is_hidden": True},
            {"input": "racecar",  "expected_output": "racecar",  "is_hidden": True},
        ],
    },
    {
        "title": "Count Vowels",
        "description": (
            "Count the number of vowels (a, e, i, o, u — both uppercase and lowercase) in the given string.\n\n"
            "**Input:**\nA single line string.\n\n"
            "**Output:**\nA single integer — the count of vowels.\n\n"
            "**Example:**\n"
            "Input:\n```\nHello World\n```\n"
            "Output:\n```\n3\n```"
        ),
        "constraints": "1 ≤ len(s) ≤ 1000",
        "starter_code": {
            "python": "s = input()\n# your code here\n"
        },
        "test_cases": [
            {"input": "Hello World",  "expected_output": "3",  "is_hidden": False},
            {"input": "aeiou",        "expected_output": "5",  "is_hidden": False},
            {"input": "rhythm",       "expected_output": "0",  "is_hidden": True},
            {"input": "Programming",  "expected_output": "3",  "is_hidden": True},
        ],
    },
    {
        "title": "FizzBuzz",
        "description": (
            "Given a number N, print integers from 1 to N. For multiples of 3 print `Fizz`, "
            "for multiples of 5 print `Buzz`, for multiples of both print `FizzBuzz`.\n\n"
            "**Input:**\nA single integer N.\n\n"
            "**Output:**\nN lines, one per number.\n\n"
            "**Example (N=5):**\n"
            "```\n1\n2\nFizz\n4\nBuzz\n```"
        ),
        "constraints": "1 ≤ N ≤ 100",
        "starter_code": {
            "python": "n = int(input())\n# your code here\n"
        },
        "test_cases": [
            {"input": "5",  "expected_output": "1\n2\nFizz\n4\nBuzz",                             "is_hidden": False},
            {"input": "15", "expected_output": "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz", "is_hidden": False},
            {"input": "1",  "expected_output": "1",                                                "is_hidden": True},
            {"input": "3",  "expected_output": "1\n2\nFizz",                                       "is_hidden": True},
        ],
    },
    {
        "title": "Factorial",
        "description": (
            "Compute the factorial of a non-negative integer N.\n\n"
            "**Input:**\nA single non-negative integer N.\n\n"
            "**Output:**\nA single integer — N!\n\n"
            "**Example:**\n"
            "Input:\n```\n5\n```\n"
            "Output:\n```\n120\n```"
        ),
        "constraints": "0 ≤ N ≤ 20",
        "starter_code": {
            "python": "n = int(input())\n# your code here\n"
        },
        "test_cases": [
            {"input": "5",  "expected_output": "120",   "is_hidden": False},
            {"input": "0",  "expected_output": "1",     "is_hidden": False},
            {"input": "1",  "expected_output": "1",     "is_hidden": True},
            {"input": "10", "expected_output": "3628800", "is_hidden": True},
        ],
    },
    {
        "title": "Check Palindrome",
        "description": (
            "Check whether a given string is a palindrome (reads the same forwards and backwards, "
            "case-insensitive, ignoring spaces).\n\n"
            "**Input:**\nA single line string.\n\n"
            "**Output:**\n`True` or `False`\n\n"
            "**Example:**\n"
            "Input:\n```\nRacecar\n```\n"
            "Output:\n```\nTrue\n```"
        ),
        "constraints": "1 ≤ len(s) ≤ 1000",
        "starter_code": {
            "python": "s = input()\n# your code here\n"
        },
        "test_cases": [
            {"input": "Racecar",    "expected_output": "True",  "is_hidden": False},
            {"input": "hello",      "expected_output": "False", "is_hidden": False},
            {"input": "A man a plan a canal Panama", "expected_output": "True", "is_hidden": True},
            {"input": "python",     "expected_output": "False", "is_hidden": True},
        ],
    },
    {
        "title": "Find Maximum",
        "description": (
            "Given a list of integers, find and print the maximum value.\n\n"
            "**Input:**\nSpace-separated integers on a single line.\n\n"
            "**Output:**\nA single integer — the maximum.\n\n"
            "**Example:**\n"
            "Input:\n```\n3 1 4 1 5 9 2 6\n```\n"
            "Output:\n```\n9\n```"
        ),
        "constraints": "1 ≤ len(nums) ≤ 1000, −10⁶ ≤ each value ≤ 10⁶",
        "starter_code": {
            "python": "nums = list(map(int, input().split()))\n# your code here\n"
        },
        "test_cases": [
            {"input": "3 1 4 1 5 9 2 6",  "expected_output": "9",    "is_hidden": False},
            {"input": "10",                "expected_output": "10",   "is_hidden": False},
            {"input": "-3 -1 -4 -1 -5",   "expected_output": "-1",   "is_hidden": True},
            {"input": "0 0 0 0 1",         "expected_output": "1",    "is_hidden": True},
        ],
    },
    {
        "title": "Two Sum Indices",
        "description": (
            "Given a list of integers and a target, find two indices whose values add up to the target. "
            "Print the two indices (0-based) separated by a space. Guaranteed exactly one solution exists.\n\n"
            "**Input:**\n"
            "Line 1: Space-separated integers.\n"
            "Line 2: Target integer.\n\n"
            "**Output:**\nTwo indices separated by a space (smaller index first).\n\n"
            "**Example:**\n"
            "Input:\n```\n2 7 11 15\n9\n```\n"
            "Output:\n```\n0 1\n```"
        ),
        "constraints": "2 ≤ len(nums) ≤ 1000, values fit in int",
        "starter_code": {
            "python": "nums = list(map(int, input().split()))\ntarget = int(input())\n# your code here\n"
        },
        "test_cases": [
            {"input": "2 7 11 15\n9",   "expected_output": "0 1", "is_hidden": False},
            {"input": "3 2 4\n6",       "expected_output": "1 2", "is_hidden": False},
            {"input": "1 5 3 7\n8",     "expected_output": "1 3", "is_hidden": True},
            {"input": "0 4 3 0\n0",     "expected_output": "0 3", "is_hidden": True},
        ],
    },
    {
        "title": "Count Words",
        "description": (
            "Count the number of words in a sentence. Words are separated by one or more spaces.\n\n"
            "**Input:**\nA single line string.\n\n"
            "**Output:**\nA single integer — the word count.\n\n"
            "**Example:**\n"
            "Input:\n```\nthe quick brown fox\n```\n"
            "Output:\n```\n4\n```"
        ),
        "constraints": "0 ≤ len(s) ≤ 1000",
        "starter_code": {
            "python": "s = input()\n# your code here\n"
        },
        "test_cases": [
            {"input": "the quick brown fox",  "expected_output": "4", "is_hidden": False},
            {"input": "hello",               "expected_output": "1", "is_hidden": False},
            {"input": "  spaces   here  ",   "expected_output": "2", "is_hidden": True},
            {"input": "one two three four five", "expected_output": "5", "is_hidden": True},
        ],
    },
    {
        "title": "Fibonacci Number",
        "description": (
            "Print the N-th Fibonacci number (0-indexed: F(0)=0, F(1)=1, F(2)=1, F(3)=2, …).\n\n"
            "**Input:**\nA single non-negative integer N.\n\n"
            "**Output:**\nA single integer — the N-th Fibonacci number.\n\n"
            "**Example:**\n"
            "Input:\n```\n6\n```\n"
            "Output:\n```\n8\n```"
        ),
        "constraints": "0 ≤ N ≤ 35",
        "starter_code": {
            "python": "n = int(input())\n# your code here\n"
        },
        "test_cases": [
            {"input": "0",  "expected_output": "0",   "is_hidden": False},
            {"input": "6",  "expected_output": "8",   "is_hidden": False},
            {"input": "1",  "expected_output": "1",   "is_hidden": True},
            {"input": "10", "expected_output": "55",  "is_hidden": True},
        ],
    },
]


async def seed():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.interviewos

    now = datetime.now(timezone.utc)
    inserted = 0

    for p in PROBLEMS:
        # Skip if same title already exists
        existing = await db.dsa_problems.find_one({"title": p["title"]})
        if existing:
            print(f"  SKIP (already exists): {p['title']}")
            continue

        doc = {
            **p,
            "difficulty": "easy",
            "time_limit_seconds": 5,
            "memory_limit_kb": 262144,
            "created_by": SEED_USER_ID,
            "created_at": now,
        }
        result = await db.dsa_problems.insert_one(doc)
        print(f"  INSERTED: {p['title']} -> {result.inserted_id}")
        inserted += 1

    print(f"\nDone — {inserted} problems inserted, {len(PROBLEMS) - inserted} skipped.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
