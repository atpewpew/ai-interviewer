"""
Fetch public GitHub profile and repository data for LLM context.
Uses only the unauthenticated GitHub REST API (60 requests/hour per IP).
"""

import logging
import httpx

logger = logging.getLogger(__name__)

_GITHUB_API = "https://api.github.com"
_TIMEOUT = 10.0


async def fetch_github_context(username: str) -> str:
    """Fetch a candidate's GitHub profile + top repos and return a text summary for LLM context.
    Returns empty string on any failure (non-blocking)."""
    if not username or not username.strip():
        return ""

    username = username.strip()

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            # Fetch profile
            profile_resp = await client.get(
                f"{_GITHUB_API}/users/{username}",
                headers={"Accept": "application/vnd.github.v3+json"},
            )
            if profile_resp.status_code != 200:
                logger.warning("GitHub user %s not found (status %d)", username, profile_resp.status_code)
                return ""

            profile = profile_resp.json()

            # Fetch repos sorted by stars
            repos_resp = await client.get(
                f"{_GITHUB_API}/users/{username}/repos",
                params={"sort": "stars", "direction": "desc", "per_page": 10, "type": "owner"},
                headers={"Accept": "application/vnd.github.v3+json"},
            )
            repos = repos_resp.json() if repos_resp.status_code == 200 else []

        # Build summary text
        lines = [f"GitHub: @{username}"]
        if profile.get("bio"):
            lines.append(f"Bio: {profile['bio']}")
        lines.append(f"Public repos: {profile.get('public_repos', 0)} | Followers: {profile.get('followers', 0)}")

        if repos:
            lines.append("\nTop repositories:")
            for repo in repos[:8]:
                if repo.get("fork"):
                    continue
                name = repo.get("name", "")
                desc = repo.get("description", "") or "No description"
                lang = repo.get("language", "N/A")
                stars = repo.get("stargazers_count", 0)
                lines.append(f"  - {name}: {desc} [Language: {lang}, Stars: {stars}]")

        return "\n".join(lines)

    except Exception as exc:
        logger.warning("Failed to fetch GitHub data for %s: %s", username, exc)
        return ""
