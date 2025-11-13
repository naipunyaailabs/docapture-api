#!/usr/bin/env python3
"""
Example script demonstrating how to extract content from a base64-encoded Word document
"""

import base64
import json
from word_extractor import extract_word_content, decode_base64_file

# Example base64-encoded Word document (this is just a placeholder)
# In practice, you would get this from your file upload or database
sample_base64 = """UEsDBAoAAAAAALJdHFYAAAAA
AAAAAAAIAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAwQUAAAACABkXRxa6jY+
KwYBAABMAQAACwAAAF9yZWxzLy5yZWxzhI/NCsIwEITvgu8Q9m7TehCRJr2I
0GvRBxjTbBvaxE3+hPj2hqJHwVvMDPN9s7Buz7hxgkWQpUFa3jCUJR32RN+H
x9IPufgTZwnSWOZETsGWDEtVP7NIGyhKl3hrzLgcrygHSMZZL/HKYxnVxbvH
yfoEAAD//w=="""

def example_with_base64_string():
    """Example of extracting content from a base64 string"""
    print("Example: Extracting content from base64-encoded Word document")
    print("=" * 60)
    
    try:
        # Decode the base64 string
        file_bytes = decode_base64_file(sample_base64)
        print("✓ Successfully decoded base64 data")
        
        # Extract content from the Word document
        extracted_data = extract_word_content(file_bytes)
        print("✓ Successfully extracted content from Word document")
        
        # Display results
        print(f"\nDocument Statistics:")
        print(f"  Paragraphs: {extracted_data['paragraph_count']}")
        print(f"  Tables: {extracted_data['table_count']}")
        
        print(f"\nMetadata:")
        for key, value in extracted_data['metadata'].items():
            print(f"  {key}: {value}")
        
        print(f"\nText Content Preview:")
        preview = extracted_data['text_content'][:200]
        print(f"  {preview}{'...' if len(extracted_data['text_content']) > 200 else ''}")
        
        # Save to file
        with open('example_extraction_result.json', 'w', encoding='utf-8') as f:
            json.dump(extracted_data, f, indent=2, default=str)
        print(f"\n✓ Full extraction result saved to 'example_extraction_result.json'")
        
    except Exception as e:
        print(f"Error: {e}")

def example_with_file():
    """Example of extracting content from a .docx file"""
    print("\n\nExample: Extracting content from a .docx file")
    print("=" * 50)
    
    try:
        # This would work if you have an actual .docx file
        # For demonstration purposes, we'll just show the code structure
        print("To extract from a .docx file, use:")
        print("  with open('document.docx', 'rb') as f:")
        print("      file_bytes = f.read()")
        print("  extracted_data = extract_word_content(file_bytes)")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    example_with_base64_string()
    example_with_file()