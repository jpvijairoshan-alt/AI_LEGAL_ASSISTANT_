import os
import sys
from pathlib import Path

# Must be set before app.config is imported anywhere.
os.environ["JWT_SECRET"] = "test-secret-test-secret-test-secret"
os.environ.setdefault("OPENAI_API_KEY", "")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
