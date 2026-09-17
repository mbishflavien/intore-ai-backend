"""Qwen-based resume parser using GGUF model"""
import json
import os
import logging
from typing import Optional

from llama_cpp import Llama

from parser.prompts import TALENT_PROFILE_SYSTEM_PROMPT

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class QwenResumeParser:
    """Resume parser using Qwen GGUF model"""
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the Qwen parser
        
        Args:
            model_path: Path to GGUF model file. If None, looks for default path.
        """
        if model_path is None:
            # Default path - look in models folder
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_path = os.path.join(base_dir, "models", "qwen.gguf")
        
        self.model_path = model_path
        self.llm: Optional[Llama] = None
        
        if os.path.exists(model_path):
            logger.info(f"Loading Qwen model from: {model_path}")
            self._load_model()
        else:
            logger.warning(f"Model not found at: {model_path}")
            logger.info("Please download the Qwen GGUF model and place it in the models folder")
    
    def _load_model(self):
        """Load the GGUF model into memory"""
        try:
            import subprocess
            try:
                result = subprocess.run(['nvidia-smi'], capture_output=True, timeout=5)
                n_gpu = 1 if result.returncode == 0 else 0
            except:
                n_gpu = 0
            
            self.llm = Llama(
                model_path=self.model_path,
                n_ctx=2048,
                n_threads=10,
                n_gpu_layers=n_gpu,
                verbose=False
            )
            
            # Warmup with dummy prompt to optimize first inference
            logger.info("Warming up model...")
            self.llm.create_chat_completion(
                messages=[{"role": "system", "content": "You are a helpful assistant."}, {"role": "user", "content": "Hi"}],
                max_tokens=1,
                temperature=0.1
            )
            logger.info(f"Qwen model loaded (GPU: {n_gpu > 0}) and warm!")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def is_ready(self) -> bool:
        """Check if model is loaded and ready"""
        return self.llm is not None
    
    def parse(self, resume_text: str) -> dict:
        """
        Parse resume text into TalentProfile JSON
        
        Args:
            resume_text: Raw text extracted from resume
            
        Returns:
            Dictionary matching TalentProfile schema
        """
        if not self.is_ready():
            raise RuntimeError("Model not loaded. Please ensure GGUF model is downloaded.")
        
        # Truncate if too long (model context limit)
        max_chars = 4000  # Balanced for 2048 context
        if len(resume_text) > max_chars:
            logger.warning(f"Resume text too long ({len(resume_text)} chars), truncating to {max_chars}")
            resume_text = resume_text[:max_chars]
        
        # Build prompt using chat format (works better with Qwen)
        messages = [
            {
                "role": "system",
                "content": TALENT_PROFILE_SYSTEM_PROMPT
            },
            {
                "role": "user", 
                "content": f"Parse this resume and return ONLY the JSON. Pay special attention to extracting the availability startDate if mentioned (like 'immediately'):\n\n{resume_text}"
            }
        ]
        
        logger.info(f"Parsing resume ({len(resume_text)} chars)...")
        
        try:
            # Use chat format - works better with instruct models
            response = self.llm.create_chat_completion(
                messages=messages,
                max_tokens=1024,
                temperature=0.1,
                top_p=0.9,
                repeat_penalty=1.0,  # Reduced for faster generation
                stop=["<|im_end|>", "<|endoftext|>", "```"]
            )
            
            # Extract JSON from response
            response_text = response['choices'][0]['message']['content'].strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith("```"):
                import re
                match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
                if match:
                    response_text = match.group(1)
            
            # Try to parse JSON
            try:
                # First try direct parse
                parsed = json.loads(response_text)
            except json.JSONDecodeError:
                # Try to extract JSON from response text
                parsed = self._extract_json(response_text)
            
            # Validate and normalize
            profile = self._normalize_profile(parsed)
            
            logger.info(f"Successfully parsed profile: {profile.get('firstName', 'Unknown')} {profile.get('lastName', '')}")
            return profile
            
        except Exception as e:
            logger.error(f"Parsing failed: {e}")
            raise
    
    def _extract_json(self, text: str) -> dict:
        """Extract JSON from text that might contain extra content"""
        # Try to find JSON block
        import re
        
        # Look for JSON object
        json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        matches = re.finditer(json_pattern, text)
        
        for match in matches:
            try:
                return json.loads(match.group())
            except:
                continue
        
        # If no JSON found, return empty dict (will use defaults)
        logger.warning("No valid JSON found in response")
        return {}
    
    def _normalize_profile(self, parsed: dict) -> dict:
        """Normalize and validate the parsed profile"""
        # Normalize skills
        skills = parsed.get("skills") or []
        if isinstance(skills, dict):
            skills = [skills]
        
        normalized_skills = []
        for skill in skills:
            if isinstance(skill, str):
                normalized_skills.append({"name": skill, "level": "Intermediate", "yearsOfExperience": 0})
            elif isinstance(skill, dict):
                name = skill.get("name", "")
                level = skill.get("level", "Intermediate")
                years = skill.get("yearsOfExperience") or skill.get("years", 0)
                
                if isinstance(level, str) and "year" in level.lower():
                    import re
                    match = re.search(r'(\d+)', level)
                    if match:
                        years = int(match.group())
                
                if years == 0 and level:
                    if isinstance(level, str):
                        level_lower = level.lower()
                        if "expert" in level_lower or "advanced" in level_lower:
                            level = "Advanced"
                        elif "beginner" in level_lower or "basic" in level_lower:
                            level = "Beginner"
                        else:
                            level = "Intermediate"
                
                normalized_skills.append({
                    "name": name,
                    "level": level if isinstance(level, str) else "Intermediate",
                    "yearsOfExperience": years
                })

        # Normalize experience - handle simplified field names
        experience = parsed.get("experience", []) or []
        if isinstance(experience, dict):
            experience = [experience]
        normalized_exp = []
        for exp in experience:
            if isinstance(exp, dict):
                normalized_exp.append({
                    "company": exp.get("company", ""),
                    "role": exp.get("role", ""),
                    "startDate": exp.get("startDate") or exp.get("start", ""),
                    "endDate": exp.get("endDate") or exp.get("end", ""),
                    "description": exp.get("description") or exp.get("desc", ""),
                    "technologies": exp.get("technologies") or exp.get("tech", []),
                    "isCurrent": exp.get("endDate", "").lower() == "present" or exp.get("end", "").lower() == "present"
                })
        
        # Normalize education - handle simplified field names
        education = parsed.get("education", [])
        if isinstance(education, dict):
            education = [education]
        elif not isinstance(education, list):
            education = []
        
        normalized_edu = []
        for edu in education:
            if not isinstance(edu, dict):
                continue
                
            # Improved year extraction
            def extract_year(val):
                if not val:
                    return None
                if isinstance(val, int):
                    return val
                if isinstance(val, str):
                    # Look for 4-digit years
                    import re
                    matches = re.findall(r'\b(19\d{2}|20\d{2})\b', val)
                    if matches:
                        # For end year, if multiple years found, take the last one
                        return int(matches[-1])
                    # Fallback to digits
                    match = re.search(r'(\d{4})', val)
                    if match:
                        return int(match.group(1))
                return None

            start_val = edu.get("startYear") or edu.get("start")
            end_val = edu.get("endYear") or edu.get("end")
            
            start_year = extract_year(start_val)
            end_year = extract_year(end_val)
            
            # Handle cases where start year might be in end year string (e.g., "2015-2019")
            if not start_year and isinstance(end_val, str) and "-" in end_val:
                import re
                years = re.findall(r'\b(19\d{2}|20\d{2})\b', end_val)
                if len(years) >= 2:
                    start_year = int(years[0])
                    end_year = int(years[1])

            field = edu.get("fieldOfStudy") or edu.get("field", "")
            if not field:
                field = edu.get("degree", "").replace("Bachelor's", "").replace("Master's", "").replace("PhD", "").replace("Diploma", "").strip()

            normalized_edu.append({
                "institution": edu.get("institution") or edu.get("school", ""),
                "degree": edu.get("degree", ""),
                "fieldOfStudy": field,
                "startYear": start_year,
                "endYear": end_year
            })
        
        # Normalize certifications - handle simplified field names
        certs = parsed.get("certifications") or parsed.get("certs", [])
        if isinstance(certs, dict):
            certs = [certs]
        elif not isinstance(certs, list):
            certs = []
            
        normalized_certs = []
        for cert in certs:
            if isinstance(cert, dict):
                normalized_certs.append({
                    "name": cert.get("name", ""),
                    "issuer": cert.get("issuer") or cert.get("org", "") or cert.get("issuer", ""),
                    "issueDate": cert.get("issueDate") or cert.get("date", "")
                })
        
        # Normalize languages - handle simplified field names
        languages = parsed.get("languages", [])
        if languages and isinstance(languages, list):
            for lang in languages:
                if isinstance(lang, dict) and "proficiency" not in lang:
                    lang["proficiency"] = lang.get("level", "Fluent")
        elif not isinstance(languages, list):
            languages = []
        
        # Normalize social links
        social = parsed.get("socialLinks", {})
        if not isinstance(social, dict):
            social = {"linkedin": "", "github": "", "portfolio": ""}
        
        # Normalize projects
        projects = parsed.get("projects", [])
        if not isinstance(projects, list):
            projects = []
        
        # Normalize availability
        availability = parsed.get("availability", {})
        if isinstance(availability, str):
            availability = {"status": availability, "type": "Full-time", "startDate": None}
        elif not isinstance(availability, dict):
            availability = {"status": "Available", "type": "Full-time", "startDate": None}
        
        # Normalize status
        status = availability.get("status", "")
        if isinstance(status, str):
            status_lower = status.lower()
            if "not available" in status_lower:
                availability["status"] = "Not Available"
            elif "open" in status_lower or "opportunity" in status_lower:
                availability["status"] = "Open to Opportunities"
            else:
                availability["status"] = "Available"
        else:
            availability["status"] = "Available"
        
        # Normalize type
        avail_type = availability.get("type", "Full-time")
        if isinstance(avail_type, str):
            type_lower = avail_type.lower()
            if "part" in type_lower:
                availability["type"] = "Part-time"
            elif "contract" in type_lower:
                availability["type"] = "Contract"
            else:
                availability["type"] = "Full-time"
        else:
            availability["type"] = "Full-time"
        
        # Normalize startDate - handle "immediately", "now", etc.
        start_date = availability.get("startDate") or availability.get("start")
        from datetime import datetime
        current_date_str = datetime.now().strftime("%Y-%m-%d")

        if isinstance(start_date, str):
            sd_lower = start_date.lower()
            if "immediate" in sd_lower or "now" in sd_lower:
                availability["startDate"] = current_date_str
            else:
                availability["startDate"] = start_date
        elif start_date is None:
            # Fallback: if status is Available, default to current date if not provided
            if availability.get("status") == "Available":
                availability["startDate"] = current_date_str
            else:
                availability["startDate"] = None

        # Normalize location - handle object format
        location = parsed.get("location", "Unknown")
        if isinstance(location, dict):
            location = location.get("city") or location.get("country") or location.get("name") or str(location)
        elif not isinstance(location, str):
            location = str(location)
        
        profile = {
            "firstName": parsed.get("firstName", "Unknown"),
            "lastName": parsed.get("lastName", ""),
            "email": parsed.get("email", ""),
            "phone": parsed.get("phone"),
            "headline": parsed.get("headline", f"{parsed.get('firstName', '')} {parsed.get('lastName', '')}".strip() or "Professional"),
            "bio": parsed.get("bio"),
            "location": location,
            "skills": normalized_skills,
            "languages": languages,
            "experience": normalized_exp,
            "education": normalized_edu,
            "certifications": normalized_certs,
            "projects": projects,
            "availability": availability,
            "socialLinks": social
        }

        return profile
    
    def _extract_json_simple(self, text: str) -> dict:
        """Simple JSON extraction with fallback"""
        import re
        try:
            return json.loads(text)
        except:
            pass
        
        # Try to find JSON in text
        match = re.search(r'\{[^{}]*\}', text)
        if match:
            try:
                return json.loads(match.group())
            except:
                pass
        
        return {}
    
    def _extract_json(self, text: str) -> dict:
        """Extract JSON from text that might contain extra content"""
        return self._extract_json_simple(text)


# Global parser instance
_parser_instance: Optional[QwenResumeParser] = None


def get_parser() -> QwenResumeParser:
    """Get or create the global parser instance"""
    global _parser_instance
    if _parser_instance is None:
        _parser_instance = QwenResumeParser()
    return _parser_instance


def parse_resume(resume_text: str) -> dict:
    """Convenience function to parse resume text"""
    parser = get_parser()
    return parser.parse(resume_text)
