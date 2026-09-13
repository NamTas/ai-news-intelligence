"""
Calls Gemini to produce a plain, easy-to-read summary. Falls back to a
clearly-labeled mock response if no API key is set or the call fails,
so the app is always demo-able.
"""
import os
import re
import json
from dotenv import load_dotenv
from google import genai

load_dotenv()  

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Using the new google-genai SDK (google.generativeai is the older, deprecated
# package). Model name confirmed against the current SDK docs as of this build.
MODEL_NAME = "gemini-3.6-flash"


def _extract_json(raw_text: str) -> dict:
    """Gemini sometimes wraps JSON in ```json fences or adds stray text
    around it - this pulls out just the JSON object safely."""
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```json", "", cleaned)
    cleaned = re.sub(r"^```", "", cleaned)
    cleaned = re.sub(r"```$", "", cleaned)
    cleaned = cleaned.strip()

    # If there's still extra text, grab the outermost { ... } block
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        cleaned = match.group(0)

    return json.loads(cleaned)


def _mock_summary(title: str, error: str = None) -> dict:
    if error:
        reason = f"Gemini API call failed with this error: {error}"
    else:
        reason = (
            "This is a demo summary because no GEMINI_API_KEY is configured. "
            "Add a real key to your .env file to get an actual AI-generated summary."
        )
    return {
        "title": title or "Article Summary",
        "executive_summary": reason,
        "key_insights": [
            "This is placeholder text, not a real summary.",
            "See the error above (or your backend terminal) to fix the underlying issue.",
        ],
        "sentiment": "Neutral",
        "impact_analysis": "Not available in demo mode.",
        "entities": [],
        "tags": ["demo-mode"] if not error else ["error"],
    }


def generate_ai_summary(text_or_url: str, title: str = "") -> dict:
    if not GEMINI_API_KEY or GEMINI_API_KEY.startswith("YOUR_"):
        return _mock_summary(title)

    client = genai.Client(api_key=GEMINI_API_KEY)

    # Plain-language prompt: short sentences, no jargon, so the output
    # reads clearly in the UI instead of sounding like a vague "briefing".
    prompt = f"""Summarize this news article in plain, simple English for someone who has 30 seconds to read it.

Article title: {title or "(no title given)"}
Article content:
\"\"\"{text_or_url[:6000]}\"\"\"

Respond with ONLY valid JSON, no markdown fences, matching exactly this structure:
{{
  "title": "a clear, short title for this article",
  "executive_summary": "2-3 plain sentences covering what happened, who is involved, and why it matters",
  "key_insights": ["short, concrete fact 1", "short, concrete fact 2", "short, concrete fact 3"],
  "sentiment": "Positive, Negative, or Neutral",
  "impact_analysis": "one plain sentence on who this affects and how",
  "entities": ["main people/organizations mentioned"],
  "tags": ["2-4 short topic tags"]
}}"""

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        return _extract_json(response.text)
    except Exception as e:
        error_msg = str(e)[:300]
        print(f"[ai_service] Gemini call failed, falling back to mock: {error_msg}")
        return _mock_summary(title, error=error_msg)
