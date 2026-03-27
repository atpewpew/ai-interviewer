import json
import logging
from groq import AsyncGroq
from config import GROQ_API_KEY

logger = logging.getLogger(__name__)

client = AsyncGroq(api_key=GROQ_API_KEY)
MODEL = "llama-3.3-70b-versatile"
FALLBACK_MODEL = "llama-3.1-8b-instant"


def _build_compact_history(questions_asked: list[dict], keep_full_last_n: int = 3) -> str:
    """Build a token-efficient history string.
    Only the last `keep_full_last_n` turns include full Q&A text.
    Older turns get a one-line summary with scores only."""
    if not questions_asked:
        return "(first question)"

    lines = []
    cutoff = max(0, len(questions_asked) - keep_full_last_n)

    for i, q in enumerate(questions_asked):
        if i < cutoff:
            # Compact: scores + topic only
            lines.append(
                f"- Q{q['turn']}: [{q['topic']}] scores: tech={q.get('tech_score','N/A')}, "
                f"comm={q.get('comm_score','N/A')}, depth={q.get('depth_score','N/A')}"
            )
        else:
            # Full: include question + answer text for cross-referencing
            answer_text = q.get('answer', 'N/A')
            # Truncate very long answers to ~200 chars
            if len(answer_text) > 200:
                answer_text = answer_text[:200] + "..."
            lines.append(
                f"- Q{q['turn']}: [{q['topic']}] \"{q['question']}\"\n"
                f"  Answer: \"{answer_text}\"\n"
                f"  Scores: tech={q.get('tech_score','N/A')}, comm={q.get('comm_score','N/A')}, depth={q.get('depth_score','N/A')}"
            )
    return "\n".join(lines)


async def generate_first_question(
    job_role: str,
    job_description: str,
    topics: list[str],
    difficulty: str,
    resume_summary: str,
    github_context: str = "",
) -> dict:
    """Generate the first interview question."""
    system_prompt = _interviewer_system_prompt(job_role, job_description)

    context_block = f"\nCandidate Resume Summary:\n{resume_summary[:500]}" if resume_summary else ""
    if github_context:
        context_block += f"\n\nCandidate GitHub Profile & Projects:\n{github_context[:300]}"

    user_prompt = f"""You are starting an interview. Generate the first question.

Job Role: {job_role}
Topics to cover: {', '.join(topics)}
Difficulty: {difficulty}
{context_block}

RULES:
- If the candidate has a resume, tailor the first question to their background
- If GitHub data is available, you may reference specific projects
- Start with a question that puts the candidate at ease while being technically relevant
- QUESTION MUST BE SHORT: Maximum 25 words. Conversational, like speaking aloud. Not academic.

Return JSON:
{{
  "question": "your short question here (max 25 words)",
  "topic": "which topic this covers",
  "difficulty": "{difficulty}",
  "rationale": "why you chose this question"
}}"""

    return await _call_llm(system_prompt, user_prompt)


async def evaluate_and_next(
    job_role: str,
    job_description: str,
    topics: list[str],
    difficulty: str,
    resume_summary: str,
    current_question: str,
    current_topic: str,
    answer_transcript: str,
    questions_asked: list[dict],
    turn_number: int,
    total_questions: int,
    speech_metrics: dict | None = None,
    github_context: str = "",
) -> dict:
    """Evaluate the current answer and generate the next question."""
    system_prompt = _interviewer_system_prompt(job_role, job_description)

    # Build token-efficient history (only last 3 turns get full text)
    history_str = _build_compact_history(questions_asked)

    # Track covered vs uncovered topics
    covered_topics = set(q["topic"] for q in questions_asked)
    covered_topics.add(current_topic)
    uncovered_topics = [t for t in topics if t not in covered_topics]

    is_last = turn_number >= total_questions

    # Only include resume summary in first 3 turns to save tokens
    context_block = ""
    if resume_summary and turn_number <= 3:
        context_block = f"\nCandidate Resume Summary (abbreviated):\n{resume_summary[:500]}"
    if github_context and turn_number <= 3:
        context_block += f"\n\nGitHub (abbreviated):\n{github_context[:300]}"

    # Speech metrics context
    speech_block = ""
    if speech_metrics and speech_metrics.get("total_words", 0) > 0:
        speech_block = f"""
Speech Analysis: {speech_metrics['total_words']} words, {speech_metrics['words_per_minute']:.0f} wpm, {speech_metrics['filler_word_count']} fillers, ASR confidence {speech_metrics['avg_confidence']:.0%}"""

    # Topic rotation enforcement
    questions_remaining = total_questions - turn_number
    topic_instruction = ""
    if uncovered_topics and questions_remaining > 0:
        topic_instruction = f"\n** MANDATORY: The next question MUST be on one of these UNCOVERED topics: {', '.join(uncovered_topics)}. Do NOT ask about '{current_topic}' again until all topics are covered. **"
    elif len(covered_topics) > 1:
        # All topics covered — pick the least-covered one
        topic_counts = {}
        for q in questions_asked:
            topic_counts[q["topic"]] = topic_counts.get(q["topic"], 0) + 1
        topic_counts[current_topic] = topic_counts.get(current_topic, 0) + 1
        least_covered = min(topics, key=lambda t: topic_counts.get(t, 0))
        topic_instruction = f"\n** All topics covered. Prefer asking about '{least_covered}' (least explored) or test a DIFFERENT aspect of any topic. **"

    user_prompt = f"""Evaluate the candidate's answer and {"DO NOT generate a next question since this is the last question" if is_last else "generate the next question"}.

Job Role: {job_role}
All topics: {', '.join(topics)}
Covered: {', '.join(covered_topics) if covered_topics else 'none'}
Uncovered: {', '.join(uncovered_topics) if uncovered_topics else 'all covered'}
Difficulty: {difficulty}
{context_block}

=== INTERVIEW HISTORY ===
{history_str}

=== CURRENT (Turn {turn_number}/{total_questions}) ===
Topic: {current_topic}
Q: {current_question}

=== ANSWER ===
"{answer_transcript}"
{speech_block}

Return JSON:
{{
  "technical_score": <0-10>,
  "communication_score": <0-10>,
  "depth_score": <0-10>,
  "technical_justification": "2-3 sentence justification referencing the answer",
  "communication_justification": "2-3 sentence justification",
  "depth_justification": "2-3 sentence justification",
  "contradiction_detected": true/false,
  "contradiction_note": "explanation if found, else empty string",
  {"" if is_last else '"next_question": "SHORT question (max 25 words, spoken aloud)",'} 
  {"" if is_last else '"next_topic": "topic of next question",'} 
  {"" if is_last else '"next_difficulty": "easy|medium|hard",'} 
  {"" if is_last else '"next_rationale": "why this question"'}
}}

=== RULES ===
1. ADAPTIVE: scores < 5 → easier on same topic. scores >= 8 → harder or new topic. 5-7 → same level.
2. TOPIC ROTATION: {f"You MUST switch to an uncovered topic ({', '.join(uncovered_topics)})." if uncovered_topics else "All covered — vary aspects."}{topic_instruction}
3. NO REPEATS: Each question must test a DIFFERENT concept/aspect.
4. CROSS-REFERENCE: Flag contradictions with previous answers.
5. SHORT QUESTIONS: Max 25 words. Conversational, not academic. Like a real interviewer speaking aloud.
6. JUSTIFICATIONS: Reference the actual answer content. No generic feedback."""

    return await _call_llm(system_prompt, user_prompt)


async def generate_report_data(
    job_role: str,
    job_description: str,
    all_turns: list[dict],
    proctoring_flags: list[dict],
    proctoring_score: float = 100,
    per_question_proctoring: list[dict] | None = None,
    speech_metrics_summary: dict | None = None,
) -> dict:
    """Generate a comprehensive interview report."""
    system_prompt = "You are an expert interview evaluator. Analyze the complete interview and generate a detailed report."

    turns_str = ""
    for t in all_turns:
        answer_abbrev = t['answer_transcript'][:200] + "..." if len(t['answer_transcript']) > 200 else t['answer_transcript']
        turns_str += f"""T{t['turn_number']}: [{t['topic']}|{t['difficulty']}] Q: {t['question']}
  A: {answer_abbrev}
  Scores: Tech={t['scores']['technical']}, Comm={t['scores']['communication']}, Depth={t['scores']['depth']}
"""
        if t.get("contradiction_note"):
            turns_str += f"  Contradiction: {t['contradiction_note']}\n"
        turns_str += "---\n"

    proctoring_str = "None" if not proctoring_flags else "\n".join(
        [f"- {f['type']} at {f['timestamp']} (severity: {f['severity']})" for f in proctoring_flags]
    )

    speech_block = ""
    if speech_metrics_summary:
        speech_block = f"""
Speech Analysis Summary:
- Average confidence (ASR): {speech_metrics_summary.get('avg_confidence', 0):.1%}
- Average speaking rate: {speech_metrics_summary.get('avg_wpm', 0):.0f} words/min
- Total filler words: {speech_metrics_summary.get('total_fillers', 0)}
- Total words spoken: {speech_metrics_summary.get('total_words', 0)}
"""

    per_q_proctor_block = ""
    if per_question_proctoring:
        lines = []
        for pq in per_question_proctoring:
            q_num = pq.get("question_number", "?")
            q_score = pq.get("score", 100)
            events = pq.get("events", [])
            evt_str = ", ".join(f"{e['type']}({e.get('severity','?')})" for e in events) if events else "none"
            lines.append(f"  Q{q_num}: proctoring={q_score}/100, events=[{evt_str}]")
        per_q_proctor_block = "\nPer-Question Proctoring:\n" + "\n".join(lines)

    user_prompt = f"""Generate a comprehensive interview report.

Job Role: {job_role}
Job Description: {job_description}

Interview Turns:
{turns_str}

Proctoring Flags:
{proctoring_str}
{per_q_proctor_block}
{speech_block}

Proctoring score: {proctoring_score}/100 (100 = clean session, 0 = severe issues). Use this exact value.
PROCTORING RULES:
- If proctoring_score >= 90: do NOT mention proctoring in red_flags or summary.
- If proctoring_score < 90: you MUST include proctoring violations (tab switches, window blurs) in red_flags. Mention the number and severity of incidents.
- If specific questions have low per-question proctoring scores (below 80), mention which questions were affected and correlate with answer quality.
- The summary MUST accurately reflect the proctoring situation — do NOT say "clean session" if there were multiple violations.

Return JSON:
{{
  "overall_score": <0-100>,
  "dimension_scores": {{
    "technical": <0-100>,
    "communication": <0-100>,
    "depth": <0-100>,
    "consistency": <0-100>
  }},
  "dimension_justifications": {{
    "technical": "3-4 sentence detailed justification for technical score",
    "communication": "3-4 sentence detailed justification for communication score",
    "depth": "3-4 sentence detailed justification for depth score",
    "consistency": "3-4 sentence detailed justification for consistency score"
  }},
  "recommendation": "Hire" | "Hold" | "Reject",
  "strengths": ["strength 1", "strength 2", ...],
  "red_flags": ["flag 1", ...],
  "full_summary": "A detailed 3-5 sentence summary of the candidate's performance"
}}"""

    return await _call_llm(system_prompt, user_prompt, max_tokens=2048)


def _interviewer_system_prompt(job_role: str, job_description: str) -> str:
    return f"""You are a senior technical interviewer for the role of {job_role}.
Job: {job_description}

Style: conversational, rigorous, SHORT questions (max 25 words each — spoken aloud, not written).
You cross-reference answers, detect contradictions, ensure broad topic coverage, never repeat questions, adapt difficulty, and give justified scores. Always return valid JSON."""


async def _call_llm(system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> dict:
    """Make a Groq LLM call. Falls back to smaller model on rate limit (429)."""
    for model in [MODEL, FALLBACK_MODEL]:
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=max_tokens,
            )
            content = response.choices[0].message.content
            return json.loads(content)
        except json.JSONDecodeError:
            logger.error("LLM returned invalid JSON (model=%s): %s", model, content)
            return {"error": "Invalid JSON from LLM"}
        except Exception as e:
            err_str = str(e)
            # Rate limit — try fallback model
            if ("429" in err_str or "rate_limit" in err_str.lower()) and model == MODEL:
                logger.warning("Rate limited on %s, falling back to %s", MODEL, FALLBACK_MODEL)
                continue
            logger.error("LLM call failed (model=%s): %s", model, err_str)
            return {"error": err_str}
    return {"error": "All models rate limited"}
