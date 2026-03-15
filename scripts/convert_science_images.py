#!/usr/bin/env python3
import os
import sys
from PIL import Image

def convert_tiff_to_png(input_path):
    """
    Surgically converts a scientific TIFF to a high-quality PNG for web display.
    Handles multi-layer TIFFs by extracting the largest frame.
    """
    try:
        if not os.path.exists(input_path):
            print(f"Error: File {input_path} not found.")
            return

        img = Image.open(input_path)
        
        # Determine output path
        base_name = os.path.splitext(input_path)[0]
        output_path = f"{base_name}_converted.png"
        
        # Handle multi-page TIFFs
        best_frame = 0
        max_size = 0
        
        print(f"Analyzing {input_path}...")
        
        try:
            for i in range(getattr(img, "n_frames", 1)):
                img.seek(i)
                size = img.size[0] * img.size[1]
                if size > max_size:
                    max_size = size
                    best_frame = i
            
            img.seek(best_frame)
            print(f"Selecting Frame {best_frame} ({img.size[0]}x{img.size[1]})")
        except EOFError:
            pass

        # Convert to RGB if needed
        if img.mode != 'RGB':
            print(f"Normalizing color space from {img.mode} to RGB...")
            img = img.convert('RGB')

        # Save as optimized PNG
        img.save(output_path, "PNG", optimize=True)
        print(f"Success! Converted image saved to: {output_path}")
        print("You can now drag and drop this PNG into your Quercus Lab Notebook.")

    except Exception as e:
        print(f"Critical Failure converting {input_path}: {e}")
        print("Tip: Make sure you have Pillow installed (pip install Pillow)")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/convert_science_images.py path_to_your_image.tif")
    else:
        convert_tiff_to_png(sys.argv[1])
