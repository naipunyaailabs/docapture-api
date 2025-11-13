# Word Document Extraction Service

This service provides functionality to decode base64-encoded Word documents (.docx) and extract their content while preserving formatting and metadata.

## Features

- Decode base64-encoded Word documents
- Extract text content from paragraphs
- Extract table data
- Retrieve document metadata (title, author, creation date, etc.)
- Preserve document structure

## Installation

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

This will install:
- fastapi
- uvicorn
- pdf2image
- pillow
- python-docx

## Usage

### Method 1: Using the FastAPI Service

Start the service:
```bash
python word_extractor.py
```

The service will be available at `http://localhost:8001`

#### Endpoints:

1. `/extract-word` - POST endpoint to upload and extract a Word document
   - Accepts file uploads (binary .docx files or base64 text files)

2. `/decode-and-extract` - POST endpoint to decode a base64 string and extract content
   - Accepts a JSON payload with `base64_data` field

### Method 2: Direct Module Usage

You can also use the extraction functions directly in your Python code:

```python
import base64
from word_extractor import decode_base64_file, extract_word_content

# If you have a base64 string:
base64_data = "your_base64_encoded_data_here"
file_bytes = decode_base64_file(base64_data)
result = extract_word_content(file_bytes)

# If you have binary file data:
with open('document.docx', 'rb') as f:
    file_bytes = f.read()
result = extract_word_content(file_bytes)

# Access the extracted data:
text_content = result['text_content']
tables = result['tables']
metadata = result['metadata']
```

## Response Format

The extraction functions return a dictionary with the following structure:

```json
{
  "text_content": "All text content from the document",
  "paragraph_count": 42,
  "table_count": 3,
  "tables": [
    [
      ["Cell 1", "Cell 2"],
      ["Cell 3", "Cell 4"]
    ]
  ],
  "metadata": {
    "title": "Document Title",
    "author": "Author Name",
    "created": "2023-01-01T00:00:00",
    "modified": "2023-01-02T00:00:00",
    "subject": "Document Subject",
    "keywords": "keyword1, keyword2"
  }
}
```

## Testing

Run the test script to verify functionality:
```bash
python test_word_extractor.py
```

## Error Handling

The service handles common errors such as:
- Invalid base64 encoding
- Corrupted Word documents
- Unsupported file formats
- File access issues

All errors are returned as JSON with an error message and appropriate HTTP status codes.