import json
import logging
from groq import AsyncGroq
from config import GROQ_API_KEY

logger = logging.getLogger(__name__)

client = AsyncGroq(api_key=GROQ_API_KEY)
MODEL = "llama-3.3-70b-versatile"


async def generate_first_question(
    job_role: str,
    job_description: str,
    topics: list[str],
    difficulty: str,
    resume_summary: str,
) -> dict:
    """Generate the first interview question."""
    system_prompt = _interviewer_system_prompt(job_role, job_description)
    user_prompt = f"""You are starting an interview. Generate the first question.

Job Role: {job_role}
Topics to cover: {', '.join(topics)}
Difficulty: {difficulty}
Candidate Resume Summary: {resume_summary}

Return JSON:
{{
  "question": "your question here",
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
) -> dict:
    """Evaluate the current answer and generate the next question."""
    system_prompt = _interviewer_system_prompt(job_role, job_description)

    history_str = ""
    for q in questions_asked:
        history_str += f"- Q{q['turn']}: [{q['topic']}] {q['question']} (scores: tech={q.get('tech_score', 'N/A')}, comm={q.get('comm_score', 'N/A')}, depth={q.get('depth_score', 'N/A')})\n"

    is_last = turn_number >= total_questions

    user_prompt = f"""Evaluate the candidate's answer and {"DO NOT generate a next question since this is the last question" if is_last else "generate the next question"}.

Job Role: {job_role}
Topics to cover: {', '.join(topics)}
Difficulty setting: {difficulty}
Candidate Resume Summary: {resume_summary}

Previous questions:
{history_str}

Current question (Turn {turn_number}/{total_questions}):
Topic: {current_topic}
Question: {current_question}

Candidate's answer transcript:
\"{answer_transcript}\"

Return JSON:
{{
  "technical_score": <0-10>,
  "communication_score": <0-10>,
  "depth_score": <0-10>,
  "technical_feedback": "one line feedback",
  "communication_feedback": "one line feedback",
  "depth_feedback": "one line feedback",
  "advance_topic": true/false,
  {"" if is_last else '"next_question": "your next question",'} 
  {"" if is_last else '"next_topic": "topic of next question",'} 
  {"" if is_last else '"next_difficulty": "easy|medium|hard",'} 
  {"" if is_last else '"next_rationale": "why this question"'}
}}

ADAPTIVE RULES:
- If the answer is weak (scores < 6), drill deeper on the SAME topic with an easier question
- If the answer is strong (scores >= 8), advance to a NEW topic or increase difficulty
- Otherwise, stay on the same topic at the same difficulty
- Cover as many topics as possible across the interview"""

    return await _call_llm(system_prompt, user_prompt)


async def generate_report_data(
    job_role: str,
    job_description: str,
    all_turns: list[dict],
    proctoring_flags: list[dict],
) -> dict:
    """Generate a comprehensive interview report."""
    system_prompt = "You are an expert interview evaluator. Analyze the complete interview and generate a detailed report."

    turns_str = ""
    for t in all_turns:
        turns_str += f"""Turn {t['turn_number']}:
  Topic: {t['topic']} | Difficulty: {t['difficulty']}
  Question: {t['question']}
  Answer: {t['answer_transcript']}
  Scores: Technical={t['scores']['technical']}, Communication={t['scores']['communication']}, Depth={t['scores']['depth']}
  Feedback: {t['llm_feedback']}
---
"""

    proctoring_str = "None" if not proctoring_flags else "\n".join(
        [f"- {f['type']} at {f['timestamp']} (severity: {f['severity']})" for f in proctoring_flags]
    )

    user_prompt = f"""Generate a comprehensive interview report.

Job Role: {job_role}
Job Description: {job_description}

Interview Turns:
{turns_str}

Proctoring Flags:
{proctoring_str}

Calculate proctoring_score: Start at 100, deduct 5 for low severity, 10 for medium, 20 for high severity flags.

Return JSON:
{{
  "overall_score": <0-100>,
  "dimension_scores": {{
    "technical": <0-100>,
    "communication": <0-100>,
    "depth": <0-100>,
    "consistency": <0-100>
  }},
  "recommendation": "Hire" | "Hold" | "Reject",
  "strengths": ["strength 1", "strength 2", ...],
  "red_flags": ["flag 1", ...],
  "proctoring_score": <0-100>,
  "full_summary": "A detailed 3-5 sentence summary of the candidate's performance"
}}"""

    return await _call_llm(system_prompt, user_prompt)


def _interviewer_system_prompt(job_role: str, job_description: str) -> str:
    return f"""You are an expert AI technical interviewer conducting a structured interview for the role of {job_role}.

Job Description: {job_description}

Your interviewing style:
- Ask clear, specific questions that test real understanding
- Adapt difficulty based on candidate performance
- Be fair but thorough — probe weak answers, acknowledge strong ones
- Focus on practical knowledge and problem-solving ability
- Always respond with valid JSON as requested"""


async def _call_llm(system_prompt: str, user_prompt: str) -> dict:
    """Make a Groq LLM call and parse JSON response."""
    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=1024,
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except json.JSONDecodeError:
        logger.error("LLM returned invalid JSON: %s", content)
        return {"error": "Invalid JSON from LLM"}
    except Exception as e:
        logger.error("LLM call failed: %s", str(e))
        return {"error": str(e)}
