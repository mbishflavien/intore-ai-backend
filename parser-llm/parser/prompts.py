TALENT_PROFILE_SYSTEM_PROMPT = """Extract info from this resume. Return ONLY this JSON format:
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "email",
  "phone": "phone",
  "headline": "SOFTWARE ENGINEER - job title not name",
  "bio": "1 sentence description",
  "location": "City, Country like Nairobi, Kenya",
  "skills": [{"name": "Python", "level": "Advanced", "yearsOfExperience": 3}],
  "languages": [{"name": "English", "proficiency": "Fluent"}],
  "experience": [{"company": "Company", "role": "Title", "start": "2020-01", "end": "2022-05 or Present", "desc": "duties", "tech": ["Python"], "isCurrent": false}],
  "education": [{"school": "University", "degree": "Bachelor's", "field": "CS", "start": 2020, "end": 2024}],
  "certifications": [{"name": "AWS", "issuer": "Amazon", "issueDate": "2023-01"}],
  "projects": [{"name": "Project Name", "description": "Short description", "technologies": ["React"], "role": "Developer"}],
  "availability": {"status": "Available", "type": "Full-time", "startDate": "Immediately"}
}

Rules:
- headline = PROFESSIONAL TITLE (e.g., "Data Scientist", "Software Engineer")
- location = "City, Country" like "Nairobi, Kenya"
- For availability: if they can start "immediately", set startDate to "Immediately"
- For experience: if end="Present", set isCurrent=true
- Only include fields where information is actually present in the resume. Do NOT use example data from this prompt.
- Output ONLY JSON, no text"""

TALENT_PROFILE_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "firstName": {"type": "string"},
        "lastName": {"type": "string"},
        "email": {"type": "string"},
        "phone": {"type": ["string", "null"]},
        "headline": {"type": "string"},
        "bio": {"type": ["string", "null"]},
        "location": {"type": "string"},
        "skills": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "level": {"type": "string", "enum": ["Beginner", "Intermediate", "Advanced", "Expert"]},
                    "yearsOfExperience": {"type": "number"}
                }
            }
        },
        "languages": {
            "type": ["array", "null"],
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "proficiency": {"type": "string", "enum": ["Basic", "Conversational", "Fluent", "Native"]}
                }
            }
        },
        "experience": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "company": {"type": "string"},
                    "role": {"type": "string"},
                    "startDate": {"type": "string"},
                    "endDate": {"type": "string"},
                    "description": {"type": "string"},
                    "technologies": {"type": "array", "items": {"type": "string"}},
                    "isCurrent": {"type": "boolean"}
                }
            }
        },
        "education": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "institution": {"type": "string"},
                    "degree": {"type": "string"},
                    "fieldOfStudy": {"type": "string"},
                    "startYear": {"type": "number"},
                    "endYear": {"type": "number"}
                }
            }
        },
        "certifications": {
            "type": ["array", "null"],
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "issuer": {"type": "string"},
                    "issueDate": {"type": "string"}
                }
            }
        },
        "projects": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "technologies": {"type": "array", "items": {"type": "string"}},
                    "role": {"type": "string"},
                    "link": {"type": ["string", "null"]},
                    "startDate": {"type": "string"},
                    "endDate": {"type": "string"}
                }
            }
        },
        "availability": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "enum": ["Available", "Open to Opportunities", "Not Available"]},
                "type": {"type": "string", "enum": ["Full-time", "Part-time", "Contract"]},
                "startDate": {"type": ["string", "null"]}
            }
        },
        "socialLinks": {
            "type": ["object", "null"],
            "properties": {
                "linkedin": {"type": ["string", "null"]},
                "github": {"type": ["string", "null"]},
                "portfolio": {"type": ["string", "null"]}
            }
        }
    },
    "required": ["firstName", "lastName", "email", "headline", "location", "skills", "experience", "education", "projects", "availability"]
}
