"""
Judge0 CE integration for secure code execution.

Supports both RapidAPI-hosted Judge0 and self-hosted instances.
Language IDs: Python(71), JavaScript(63), C++(54), Java(62)
"""
import asyncio
import base64
import logging
import httpx
from config import JUDGE0_API_URL, JUDGE0_API_KEY

logger = logging.getLogger(__name__)

LANGUAGE_IDS = {
    "python": 71,
    "javascript": 63,
    "cpp": 54,
    "java": 62,
    "c": 50,
    "go": 60,
    "rust": 73,
    "typescript": 74,
}

# Judge0 status IDs
STATUS_ACCEPTED = 3
STATUS_WRONG_ANSWER = 4
STATUS_TIME_LIMIT = 5
STATUS_COMPILATION_ERROR = 6
STATUS_RUNTIME_ERROR = {7, 8, 9, 10, 11, 12}
STATUS_QUEUED = 1
STATUS_PROCESSING = 2


def _headers() -> dict:
    h = {"Content-Type": "application/json"}
    if JUDGE0_API_KEY:
        # RapidAPI hosted
        h["X-RapidAPI-Key"] = JUDGE0_API_KEY
        h["X-RapidAPI-Host"] = "judge0-ce.p.rapidapi.com"
    return h


def _encode(text: str) -> str:
    return base64.b64encode(text.encode()).decode()


def _decode(b64: str) -> str:
    if not b64:
        return ""
    try:
        return base64.b64decode(b64).decode(errors="replace")
    except Exception:
        return b64


async def submit_code(
    source_code: str,
    language: str,
    stdin: str = "",
    expected_output: str = "",
    time_limit: float = 5.0,
    memory_limit: int = 262144,
) -> dict:
    """
    Submit code to Judge0 and wait for result.
    Returns: {status, stdout, stderr, time, memory, compile_output, exit_code}
    """
    lang_id = LANGUAGE_IDS.get(language)
    if not lang_id:
        return {"status": "error", "stderr": f"Unsupported language: {language}"}

    payload = {
        "source_code": _encode(source_code),
        "language_id": lang_id,
        "stdin": _encode(stdin),
        "expected_output": _encode(expected_output) if expected_output else None,
        "cpu_time_limit": time_limit,
        "memory_limit": memory_limit,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Create submission
            resp = await client.post(
                f"{JUDGE0_API_URL}/submissions?base64_encoded=true&wait=false",
                json=payload,
                headers=_headers(),
            )
            resp.raise_for_status()
            token = resp.json().get("token")
            if not token:
                return {"status": "error", "stderr": "No token returned from Judge0"}

            # Poll for result (max 30s)
            for _ in range(30):
                await asyncio.sleep(1)
                result_resp = await client.get(
                    f"{JUDGE0_API_URL}/submissions/{token}?base64_encoded=true",
                    headers=_headers(),
                )
                result_resp.raise_for_status()
                data = result_resp.json()
                status_id = data.get("status", {}).get("id", 0)

                if status_id not in (STATUS_QUEUED, STATUS_PROCESSING):
                    return {
                        "status": _map_status(status_id),
                        "stdout": _decode(data.get("stdout", "")),
                        "stderr": _decode(data.get("stderr", "")),
                        "compile_output": _decode(data.get("compile_output", "")),
                        "time": data.get("time"),
                        "memory": data.get("memory"),
                        "exit_code": data.get("exit_code"),
                    }

            return {"status": "time_limit", "stderr": "Execution timed out waiting for result"}

    except httpx.HTTPStatusError as e:
        logger.error("Judge0 HTTP error: %s", e.response.text)
        return {"status": "error", "stderr": f"Judge0 API error: {e.response.status_code}"}
    except Exception as e:
        logger.error("Judge0 error: %s", str(e))
        return {"status": "error", "stderr": str(e)}


def _map_status(status_id: int) -> str:
    if status_id == STATUS_ACCEPTED:
        return "accepted"
    elif status_id == STATUS_WRONG_ANSWER:
        return "wrong_answer"
    elif status_id == STATUS_TIME_LIMIT:
        return "time_limit"
    elif status_id == STATUS_COMPILATION_ERROR:
        return "compile_error"
    elif status_id in STATUS_RUNTIME_ERROR:
        return "runtime_error"
    else:
        return "error"


async def run_against_test_cases(
    source_code: str,
    language: str,
    test_cases: list[dict],
    time_limit: float = 5.0,
) -> list[dict]:
    """Run code against multiple test cases. Returns list of results."""
    results = []
    for tc in test_cases:
        result = await submit_code(
            source_code=source_code,
            language=language,
            stdin=tc["input"],
            expected_output=tc["expected_output"],
            time_limit=time_limit,
        )
        actual_output = result.get("stdout", "").strip()
        expected = tc["expected_output"].strip()
        passed = actual_output == expected and result["status"] == "accepted"

        results.append({
            "input": tc["input"],
            "expected": expected,
            "actual": actual_output,
            "passed": passed,
            "status": result["status"],
            "time_ms": float(result.get("time", 0) or 0) * 1000,
            "stderr": result.get("stderr", ""),
            "compile_output": result.get("compile_output", ""),
            "is_hidden": tc.get("is_hidden", False),
        })
    return results
