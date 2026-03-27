"""
Python code execution via subprocess — no external API needed.

Writes candidate code to a temp file, runs it with a timeout,
compares stdout against expected output.
Python only (MVP).

Uses synchronous subprocess.run inside asyncio.to_thread to avoid
asyncio.create_subprocess_exec issues on Windows (ProactorEventLoop).
"""
import asyncio
import logging
import subprocess
import sys
import tempfile
import time
from pathlib import Path

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 5  # hard limit per test case


def _run_python_sync(source_code: str, stdin: str, timeout: float) -> dict:
    """Synchronous subprocess execution — called via asyncio.to_thread."""
    with tempfile.TemporaryDirectory() as tmpdir:
        code_file = Path(tmpdir) / "solution.py"
        code_file.write_text(source_code, encoding="utf-8")

        try:
            start = time.perf_counter()
            result = subprocess.run(
                [sys.executable, str(code_file)],
                input=stdin,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=tmpdir,
            )
            elapsed = round((time.perf_counter() - start) * 1000, 1)
            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "timed_out": False,
                "error": None,
                "time_ms": elapsed,
            }
        except subprocess.TimeoutExpired:
            elapsed = round((time.perf_counter() - start) * 1000, 1)
            return {"stdout": "", "stderr": "", "timed_out": True, "error": "Time limit exceeded", "time_ms": elapsed}
        except Exception as e:
            logger.error("Execution error: %s", e)
            return {"stdout": "", "stderr": str(e), "timed_out": False, "error": str(e), "time_ms": 0}


async def run_python(source_code: str, stdin: str = "", timeout: float = TIMEOUT_SECONDS) -> dict:
    """
    Execute Python source code in a subprocess.
    Returns {stdout, stderr, timed_out, error, time_ms}
    """
    return await asyncio.to_thread(_run_python_sync, source_code, stdin, timeout)


async def run_custom_input(source_code: str, stdin: str = "", timeout: float = TIMEOUT_SECONDS) -> dict:
    """Run code with custom stdin — returns raw stdout/stderr without comparison."""
    result = await run_python(source_code, stdin, timeout)
    return {
        "stdout": result["stdout"],
        "stderr": result["stderr"],
        "timed_out": result["timed_out"],
        "error": result["error"],
        "time_ms": result["time_ms"],
    }


async def run_against_test_cases(
    source_code: str,
    language: str,          # kept for API compatibility — only "python" used
    test_cases: list[dict],
    time_limit: float = TIMEOUT_SECONDS,
) -> list[dict]:
    """Run code against multiple test cases. Returns per-test pass/fail results."""
    results = []
    for tc in test_cases:
        result = await run_python(source_code, tc.get("input", ""), timeout=time_limit)

        actual = result["stdout"].strip()
        expected = tc.get("expected_output", "").strip()

        if result["timed_out"]:
            status = "time_limit"
            passed = False
        elif result["error"] and not result["stderr"]:
            status = "runtime_error"
            passed = False
        elif result["stderr"]:
            if "SyntaxError" in result["stderr"] or "IndentationError" in result["stderr"]:
                status = "compile_error"
            else:
                status = "runtime_error"
            passed = False
        else:
            passed = actual == expected
            status = "accepted" if passed else "wrong_answer"

        results.append({
            "input": tc.get("input", ""),
            "expected": expected,
            "actual": actual,
            "passed": passed,
            "status": status,
            "time_ms": result.get("time_ms"),
            "stderr": result["stderr"][:500] if result["stderr"] else "",
            "compile_output": "",
            "is_hidden": tc.get("is_hidden", False),
            "memory_kb": None,
        })
    return results
