#!/usr/bin/env python3
"""
Test script for Word document extraction
This script demonstrates how to use the word_extractor.py module
"""

import base64
import json
from word_extractor import decode_base64_file, extract_word_content

def test_with_sample_docx():
    """Test with a sample .docx file"""
    try:
        # Load a sample docx file (you would replace this with your actual file)
        with open('test-rfp.docx', 'rb') as f:
            file_bytes = f.read()
        
        # Extract content
        result = extract_word_content(file_bytes)
        
        print("=== Word Document Extraction Result ===")
        print(f"Paragraph Count: {result['paragraph_count']}")
        print(f"Table Count: {result['table_count']}")
        print("\n=== Metadata ===")
        for key, value in result['metadata'].items():
            print(f"{key}: {value}")
        
        print("\n=== Sample Text Content ===")
        # Show first 500 characters of text content
        print(result['text_content'][:500] + "..." if len(result['text_content']) > 500 else result['text_content'])
        
        # Save full result to a file
        with open('extraction_result.json', 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, default=str)
        
        print("\nFull extraction result saved to 'extraction_result.json'")
        
    except FileNotFoundError:
        print("Sample file 'test-rfp.docx' not found. Skipping this test.")
    except Exception as e:
        print(f"Error in test_with_sample_docx: {e}")

def test_with_base64_string(base64_string):
    """Test with a base64 encoded string"""
    try:
        # Decode base64 string
        file_bytes = decode_base64_file(base64_string)
        
        # Extract content
        result = extract_word_content(file_bytes)
        
        print("=== Base64 Decoded Word Document Extraction Result ===")
        print(f"Paragraph Count: {result['paragraph_count']}")
        print(f"Table Count: {result['table_count']}")
        print("\n=== Sample Text Content ===")
        # Show first 500 characters of text content
        print(result['text_content'][:500] + "..." if len(result['text_content']) > 500 else result['text_content'])
        
        return result
        
    except Exception as e:
        print(f"Error in test_with_base64_string: {e}")
        return None

if __name__ == '__main__':
    print("Testing Word Document Extraction")
    print("=" * 40)
    
    # Test with sample docx file if available
    test_with_sample_docx()
    
    # Example of how to use with base64 string (uncomment and replace with actual base64 data)
    # base64_data = "your_base64_encoded_word_document_here"
    # result = test_with_base64_string(base64_data)