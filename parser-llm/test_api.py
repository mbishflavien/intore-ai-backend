import httpx
import json

resume_text = """JOHN KAGABA
Kigali, Rwanda
Email: john.kagaba@email.com
Phone: +250 789 123 456
LinkedIn: https://linkedin.com/in/johnkagaba
GitHub: https://github.com/johnkagaba

SOFTWARE ENGINEER - PYTHON & DATA SCIENCE

Results-driven Software Engineer with 5 years of experience in developing scalable web applications and machine learning solutions. Passionate about building AI-powered products and solving complex problems.

TECHNICAL SKILLS
- Python (Advanced, 5 years)
- JavaScript (Intermediate, 3 years)
- PostgreSQL (Advanced, 4 years)
- Machine Learning (Intermediate, 2 years)
- Docker (Advanced, 3 years)
- Flask (Expert, 4 years)
- React (Beginner, 1 year)

LANGUAGES
- English: Fluent
- Kinyarwanda: Native
- French: Basic

WORK EXPERIENCE

TECH INNOVATIONS LTD, Kigali
Senior Software Engineer
2022-01 to Present

- Led development of an AI-powered recruitment platform serving 50,000+ users
- Built RESTful APIs using Flask and PostgreSQL, handling 1M+ requests daily
- Implemented machine learning models for candidate matching using scikit-learn
- Mentored junior developers and conducted code reviews
- Technologies: Python, Flask, PostgreSQL, Docker, scikit-learn

AFRICAN TECH HUB, Kigali
Software Developer
2019-06 to 2022-12

- Developed and maintained multiple client web applications
- Created real-time dashboard using React and Node.js
- Integrated third-party APIs including payment gateways
- Collaborated with cross-functional teams to deliver projects on time
- Technologies: JavaScript, Node.js, React, MongoDB

EDUCATION

UNIVERSITY OF RWANDA, Kigali
Bachelor's Degree in Computer Science
2015-09 to 2019-06

CERTIFICATIONS

AWS Certified Solutions Architect, Amazon Web Services, 2021-03
Google Data Analytics Certificate, Google, 2020-09

PROJECTS

AI Recruitment System
Next.js, Node.js, Gemini API
Full-stack developer
2023-06 to 2023-09
Built an AI-powered candidate screening platform that reduced hiring time by 40%
https://github.com/johnkagaba/ai-recruitment

Weather Prediction Model
Python, TensorFlow
Machine Learning Engineer
2022-01 to 2022-04
Developed a deep learning model for weather forecasting with 85% accuracy
https://github.com/johnkagaba/weather-ai

AVAILABILITY

Available for full-time positions
Can start immediately"""

response = httpx.post(
    "http://localhost:5000/parse/text",
    json={"text": resume_text},
    timeout=600.0  # 10 minutes timeout
)

print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    print(json.dumps(response.json(), indent=2))
else:
    print(response.text)
