# Umurava Resume Parser - Local Qwen LLM Parser

This is a local resume parser service that uses the Qwen GGUF model for parsing resumes into the TalentProfile schema. It's designed to work with the Umurava AI Hackathon project.

## Why This?

The hackathon rules state:
- **Gemini API** = For screening and ranking only
- **Parser** = Must be local/separate from Gemini

This service provides:
- ✅ 100% local parsing (no external API calls for parsing)
- ✅ Uses Qwen2.5-1.5B GGUF model (excellent JSON schema following)
- ✅ Outputs directly to TalentProfile schema
- ✅ Gemini preserved for its intended purpose (screening/ranking)

## Quick Start

### 1. Install Dependencies

```bash
cd parser-llm
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Download Qwen GGUF Model

Download the Qwen2.5-1.5B GGUF model (Q4_K_M quantization):

```bash
# Create models directory
mkdir -p models
cd models

# Download the model (choose one):

# Option 1: Using wget/curl (from HuggingFace)
wget https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf -O qwen.gguf

# Option 2: Using huggingface-cli
huggingface-cli download Qwen/Qwen2.5-1.5B-Instruct-GGUF qwen2.5-1.5b-instruct-q4_k_m.gguf --local-dir .

# Option 3: Direct download link
# https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf
```

The model file should be: `parser-llm/models/qwen.gguf`

### 3. Start the Parser Service

```bash
cd parser-llm
source venv/bin/activate
python main.py
```

The service will start on `http://localhost:5000`

### 4. Test the Service

```bash
# Health check
curl http://localhost:5000/health

# Parse text
curl -X POST http://localhost:5000/parse/text \
  -H "Content-Type: application/json" \
  -d '{"text": "John Doe - Software Engineer\nEmail: john@example.com\nSkills: Python, JavaScript, React\nExperience: Tech Corp - Developer - 2020-2023", "mimeType": "text/plain"}'
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service info |
| `/health` | GET | Health check |
| `/parse/text` | POST | Parse plain text |
| `/parse/base64` | POST | Parse base64-encoded file |
| `/parse/file` | POST | Parse uploaded file |
| `/reload-model` | POST | Reload the model |

## Integration with Node.js API

The Node.js API (`backend/api/src/resume.ts`) is configured to call this service:

1. Set environment variable in `backend/api/.env`:
   ```
   PARSER_SERVICE_URL=http://localhost:5000
   ```

2. The API will automatically use the local parser for resume parsing
3. Gemini is still used for screening/ranking (as required by the hackathon)

## Troubleshooting

### Model Not Loading

If you see "Model not found" error:
1. Verify the model file exists: `ls -la models/qwen.gguf`
2. Check the file size (should be ~1GB for Q4_K_M)
3. Try restarting the service

### Out of Memory

If you get OOM errors:
1. Use a smaller model (Qwen2.5-0.5B)
2. Reduce `n_threads` in `qwen_parser.py`
3. Use system with more RAM (minimum 4GB, recommended 8GB+)

### Slow Parsing

First parse takes ~10-20 seconds (model loading).
Subsequent parses are faster (~3-5 seconds).

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 4GB | 8GB+ |
| Storage | 2GB | 5GB |
| CPU | 4 cores | 8+ cores |
| OS | Linux/macOS/Windows | Linux/macOS |

## Architecture

```
┌─────────────────────────────────────────┐
│           Node.js Backend               │
│      (backend/api/src/resume.ts)          │
└─────────────────┬───────────────────────┘
                  │ HTTP POST /parse/text
                  ▼
┌─────────────────────────────────────────┐
│      Python FastAPI Service             │
│         (parser-llm/)                   │
│  ┌───────────────────────────────────┐  │
│  │  Qwen2.5-1.5B GGUF Model         │  │
│  │  (llama-cpp-python)               │  │
│  └───────────────────────────────────┘  │
└─────────────────┬───────────────────────┘
                  │ Returns TalentProfile JSON
                  ▼
┌─────────────────────────────────────────┐
│           MongoDB                       │
└─────────────────────────────────────────┘

Gemini API (used only for screening/ranking):
┌─────────────────────────────────────────┐
│      Screening Engine (unchanged)       │
└─────────────────────────────────────────┘
```

## Files Structure

```
parser-llm/
├── main.py                 # FastAPI server
├── requirements.txt        # Python dependencies
├── README.md             # This file
├── parser/
│   ├── __init__.py
│   ├── qwen_parser.py   # Qwen GGUF parser
│   └── prompts.py       # Prompt templates
├── utils/
│   ├── __init__.py
│   └── text_extractor.py # PDF/DOCX extraction
└── models/
    └── qwen.gguf        # Qwen model (download separately)
```

## License

MIT
