import os

def fix_webp_extensions(root_dir):
    for root, _, files in os.walk(root_dir):
        if 'node_modules' in root or '.git' in root or '.next' in root:
            continue
        for file in files:
            if not file.endswith(('.tsx', '.ts')):
                continue
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Simple string replace
            content = content.replace("replace(/\\.[^/.]+$/, '.jpg')", "replace(/\\.[^/.]+$/, '.webp')")
            
            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Fixed {filepath}")

fix_webp_extensions('src')
