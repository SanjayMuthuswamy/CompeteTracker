import ollama
import sys
import re
import json
import logging
import requests # Still needed for ConnectionError handling

# --- Configuration ---
OLLAMA_MODEL = 'gemma:2b'
OLLAMA_HOST = 'http://localhost:11434' 
MIN_CONTENT_LENGTH = 100

# --- Prompt for Structured JSON Output ---
PROMPT_TEMPLATE = (
    "Summarize the following article in 3 bullet points, then provide 1 key insight, and list 3 relevant tags.\n"
    "Output ONLY a single JSON object. The required keys are: 'bullets' (list of strings), 'insight' (string), and 'tags' (list of strings).\n\n"
    "Article:\n{content}"
)

def summarize_text(text: str) -> dict:
    """
    Sends the text and a summarization prompt to the local Ollama model using
    the official ollama.Client API with JSON output formatting.
    """
    if not text or len(text) < MIN_CONTENT_LENGTH:
        return {"bullets": ["Article content was too short or non-existent."], "insight": "CONTENT_TOO_SHORT", "tags": []}

    # Limit content length to prevent model overflow
    prompt_content = text[:15000]
    prompt = PROMPT_TEMPLATE.format(content=prompt_content)
    
    try:
        client = ollama.Client(host=OLLAMA_HOST)
        
        # Use the /api/generate endpoint for structured JSON output
        response = client.generate(
            model=OLLAMA_MODEL,
            prompt=prompt,
            format='json',
            options={
                'temperature': 0.1 
            }
        )
        
        raw_json_output = response.get('response', '')

        # Attempt to parse the resulting JSON string
        try:
            return json.loads(raw_json_output)
        except json.JSONDecodeError as e:
            # Fallback if the model still messes up the JSON structure
            logging.error(f"Model output was not valid JSON: {raw_json_output[:100]}... Error: {e}")
            return {"bullets": [raw_json_output[:250] + "..."], "insight": "MODEL_OUTPUT_INVALID", "tags": []}
            
    except requests.exceptions.ConnectionError:
        logging.critical(f"Connection Error: Could not connect to Ollama at {OLLAMA_HOST}.")
        # Use the correct insight tag you used previously
        return {"bullets": ["Ollama connection failed. Is the service running?"], "insight": "OLLAMA_CLI_FAILED", "tags": []} 
    except Exception as e:
        logging.error(f"General Summarization Error: {e}")
        return {"bullets": [prompt_content[:250] + "..."], "insight": "GENERAL_ERROR", "tags": []}