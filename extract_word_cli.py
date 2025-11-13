#!/usr/bin/env python3
"""
Command-line utility for extracting content from Word documents
Can handle both binary .docx files and base64-encoded files
"""

import sys
import base64
import json
import argparse
from word_extractor import extract_word_content, decode_base64_file

def main():
    parser = argparse.ArgumentParser(description='Extract content from Word documents')
    parser.add_argument('file', help='Path to the Word document (.docx) or base64 text file')
    parser.add_argument('--base64', action='store_true', 
                        help='Indicate that the input file contains base64-encoded data')
    parser.add_argument('--output', '-o', help='Output file for extracted content (JSON format)')
    
    args = parser.parse_args()
    
    try:
        if args.base64:
            # Read base64 data from file
            with open(args.file, 'r', encoding='utf-8') as f:
                base64_data = f.read().strip()
            
            # Decode base64 data
            file_bytes = decode_base64_file(base64_data)
        else:
            # Read binary data from file
            with open(args.file, 'rb') as f:
                file_bytes = f.read()
        
        # Extract content
        result = extract_word_content(file_bytes)
        
        # Output result
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, default=str)
            print(f"Extraction result saved to {args.output}")
        else:
            # Pretty print to console
            print("=== Word Document Extraction Result ===")
            print(f"Paragraph Count: {result['paragraph_count']}")
            print(f"Table Count: {result['table_count']}")
            
            print("\n=== Metadata ===")
            for key, value in result['metadata'].items():
                print(f"{key}: {value}")
            
            print("\n=== Text Content ===")
            print(result['text_content'])
            
            if result['tables']:
                print("\n=== Tables ===")
                for i, table in enumerate(result['tables']):
                    print(f"Table {i+1}:")
                    for row in table:
                        print("  | " + " | ".join(row) + " |")
        
        return 0
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(main())