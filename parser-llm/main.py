"""
FastAPI server for local resume parsing using Qwen GGUF model

Run: uvicorn main:app --reload --port 5000
"""
import os
import logging
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from parser.qwen_parser import get_parser, QwenResumeParser
from utils.text_extractor import (
    extract_text_from_base64,
    extract_text_from_bytes,
    extract_from_file_path
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting Resume Parser Service...")
    
    # Initialize parser
    parser = get_parser()
    if parser.is_ready():
        logger.info("✅ Qwen model loaded and ready!")
    else:
        logger.warning("⚠️  Qwen model not loaded. Please download GGUF model.")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Resume Parser Service...")


app = FastAPI(
    title="Umurava Resume Parser API",
    description="Local resume parser using Qwen GGUF model",
    version="1.0.0",
    lifespan=lifespan
)

# CORS - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ParseRequest(BaseModel):
    """Request model for text-based parsing"""
    text: str
    mimeType: Optional[str] = "text/plain"


class ParseBase64Request(BaseModel):
    """Request model for base64-encoded file parsing"""
    base64: str
    mimeType: str


class ParseResponse(BaseModel):
    """Response model for parsed resume"""
    success: bool
    profile: Optional[dict] = None
    error: Optional[str] = None
    processing_time_ms: Optional[int] = None


@app.get("/")
def root():
    """Health check endpoint"""
    parser = get_parser()
    return {
        "service": "Umurava Resume Parser",
        "version": "1.0.0",
        "model_loaded": parser.is_ready(),
        "model_path": parser.model_path if parser else None
    }


@app.get("/health")
def health():
    """Health check endpoint"""
    parser = get_parser()
    return {
        "status": "healthy" if parser.is_ready() else "model_not_loaded",
        "model_ready": parser.is_ready()
    }


@app.post("/parse/text", response_model=ParseResponse)
async def parse_text(request: ParseRequest):
    """Parse resume from plain text"""
    import time
    start_time = time.time()
    
    if not request.text or len(request.text.strip()) < 10:
        return ParseResponse(
            success=False,
            error="Resume text too short or empty"
        )
    
    try:
        parser = get_parser()
        
        if not parser.is_ready():
            return ParseResponse(
                success=False,
                error="Model not loaded. Please ensure GGUF model is downloaded and placed in the models folder."
            )
        
        profile = parser.parse(request.text)
        
        processing_time = int((time.time() - start_time) * 1000)
        
        return ParseResponse(
            success=True,
            profile=profile,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Parsing error: {e}")
        return ParseResponse(
            success=False,
            error=str(e)
        )


@app.post("/parse/base64", response_model=ParseResponse)
async def parse_base64(request: ParseBase64Request):
    """Parse resume from base64-encoded file"""
    import time
    start_time = time.time()
    
    try:
        parser = get_parser()
        
        if not parser.is_ready():
            return ParseResponse(
                success=False,
                error="Model not loaded. Please ensure GGUF model is downloaded."
            )
        
        # Extract text from file
        text = extract_text_from_base64(request.base64, request.mimeType)
        
        if not text or len(text.strip()) < 10:
            return ParseResponse(
                success=False,
                error="Could not extract text from file or text too short"
            )
        
        # Parse with Qwen
        profile = parser.parse(text)
        
        processing_time = int((time.time() - start_time) * 1000)
        
        return ParseResponse(
            success=True,
            profile=profile,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Parsing error: {e}")
        return ParseResponse(
            success=False,
            error=str(e)
        )


@app.post("/parse/file", response_model=ParseResponse)
async def parse_file(file: UploadFile = File(...)):
    """Parse resume from uploaded file"""
    import time
    start_time = time.time()
    
    try:
        parser = get_parser()
        
        if not parser.is_ready():
            return ParseResponse(
                success=False,
                error="Model not loaded. Please ensure GGUF model is downloaded."
            )
        
        # Read file content
        content = await file.read()
        
        # Determine mime type
        mime_type = file.content_type or "application/pdf"
        
        # Extract text
        text = extract_text_from_bytes(content, mime_type)
        
        if not text or len(text.strip()) < 10:
            return ParseResponse(
                success=False,
                error="Could not extract text from file or text too short"
            )
        
        # Parse with Qwen
        profile = parser.parse(text)
        
        processing_time = int((time.time() - start_time) * 1000)
        
        return ParseResponse(
            success=True,
            profile=profile,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Parsing error: {e}")
        return ParseResponse(
            success=False,
            error=str(e)
        )


@app.post("/reload-model")
async def reload_model(model_path: Optional[str] = None):
    """Reload the Qwen model"""
    try:
        global _parser_instance
        _parser_instance = QwenResumeParser(model_path)
        
        if _parser_instance.is_ready():
            return {"success": True, "message": "Model reloaded successfully"}
        else:
            return {"success": False, "message": "Model not found at specified path"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)
