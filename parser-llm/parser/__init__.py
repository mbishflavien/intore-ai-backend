"""Parser module"""
from parser.qwen_parser import QwenResumeParser, parse_resume, get_parser
from parser.prompts import TALENT_PROFILE_SYSTEM_PROMPT, TALENT_PROFILE_JSON_SCHEMA

__all__ = [
    "QwenResumeParser",
    "parse_resume",
    "get_parser",
    "TALENT_PROFILE_SYSTEM_PROMPT",
    "TALENT_PROFILE_JSON_SCHEMA"
]
