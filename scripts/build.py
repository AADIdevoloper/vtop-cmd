"""Package only the runtime extension files; no account data or development fixtures."""
from pathlib import Path
import argparse
import json
import shutil
import zipfile
import struct

parser = argparse.ArgumentParser()
parser.add_argument('--firefox', action='store_true', help='build the Firefox extension package')
args = parser.parse_args()

root = Path(__file__).resolve().parent.parent
package_name = 'vtop-command-firefox' if args.firefox else 'vtop-command'
output = root / 'dist' / package_name
output.mkdir(parents=True, exist_ok=True)
files = ['manifest.json', 'brand.js', 'combobox.js', 'search-select.js', 'form-presets.js', 'navigation.js', 'semesters.js', 'enhancements.js', 'content.js', 'dark-readability.js', 'cgpa.js', 'cgpa-ui.js', 'page-enhancements.js', 'page-actions.js', 'page-runtime.js', 'enhancements-ui.js', 'pdf-bridge.js', 'pdf-preview.js', 'extension-action.js', 'pdf-viewer.html', 'pdf-viewer.css', 'pdf-viewer.mjs', 'dark.css', 'README.md', 'docs/dark-mode-audit.md']
manifest = json.loads((root / 'manifest.json').read_text())
assert manifest['manifest_version'] == 3
if args.firefox:
    manifest['background'] = {'scripts': ['extension-action.js']}
    manifest['browser_specific_settings'] = {
        'gecko': {
            'id': 'vtop-command@sid-1524',
            'strict_min_version': '128.0'
        }
    }
for size, name in manifest.get('icons', {}).items():
    data = (root / name).read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    assert struct.unpack('>II', data[16:24]) == (int(size), int(size))
for name in files:
    (output / name).parent.mkdir(parents=True, exist_ok=True)
    if name == 'manifest.json':
        (output / name).write_text(json.dumps(manifest, indent=2) + '\n')
    else:
        shutil.copy2(root / name, output / name)
shutil.copytree(root / 'icons', output / 'icons', dirs_exist_ok=True)
vendor = output / 'vendor'
vendor.mkdir(exist_ok=True)
pdfjs = root / 'node_modules' / 'pdfjs-dist'
for source, target in [('build/pdf.min.mjs', 'pdf.mjs'), ('build/pdf.worker.min.mjs', 'pdf.worker.mjs'), ('LICENSE', 'LICENSE')]:
    shutil.copy2(pdfjs / source, vendor / target)
for directory in ['cmaps', 'standard_fonts']:
    shutil.copytree(pdfjs / directory, vendor / directory, dirs_exist_ok=True)
archive = root / 'dist' / f'{package_name}.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for name in files:
        bundle.write(output / name, f'{package_name}/{name}')
    for directory in [vendor, output / 'icons']:
        for path in directory.rglob('*'):
            if path.is_file():
                bundle.write(path, package_name + '/' + path.relative_to(output).as_posix())
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
versioned_archive = root / 'dist' / f"{package_name}-{manifest['version']}.zip"
shutil.copy2(archive, versioned_archive)
print(f'Built {output}\nBuilt {archive}')
print('VERDICT: PASS')
