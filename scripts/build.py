"""Package only the runtime extension files; no account data or development fixtures."""
from pathlib import Path
import json
import shutil
import zipfile
import struct

root = Path(__file__).resolve().parent.parent
package_name = 'vtop-command-firefox'
output = root / 'dist' / package_name
shutil.rmtree(output, ignore_errors=True)
output.mkdir(parents=True, exist_ok=True)
files = ['deadline-cache.js', 'deadline-cache-client.js', 'manifest.json', 'brand.js', 'combobox.js', 'search-select.js', 'form-presets.js', 'navigation.js', 'semesters.js', 'enhancements.js', 'content.js', 'dark-readability.js', 'cgpa.js', 'cgpa-ui.js', 'page-enhancements.js', 'page-actions.js', 'page-runtime.js', 'enhancements-ui.js', 'pdf-bridge.js', 'pdf-preview.js', 'extension-action.js', 'pdf-viewer.html', 'pdf-viewer.css', 'pdf-viewer.mjs', 'pptx-viewer.mjs', 'dark.css', 'README.md', 'docs/dark-mode-audit.md']
manifest = json.loads((root / 'manifest.json').read_text())
assert manifest['manifest_version'] == 3
assert manifest.get('browser_specific_settings', {}).get('gecko')
assert manifest.get('background') == {'scripts': ['deadline-cache.js', 'extension-action.js']}
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
shutil.copytree(root / 'vendor', vendor, dirs_exist_ok=True)
archive = root / 'dist' / f"{package_name}-{manifest['version']}.zip"
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for name in files:
        bundle.write(output / name, f'{package_name}/{name}')
    for directory in [vendor, output / 'icons']:
        for path in directory.rglob('*'):
            if path.is_file():
                bundle.write(path, package_name + '/' + path.relative_to(output).as_posix())
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    for name in bundle.namelist():
        parts = Path(name).parts
        assert not any(part in {'.git', 'node_modules', 'dist'} for part in parts), name
        assert Path(name).suffix.lower() not in {'.xpi', '.zip'}, name
for obsolete in (root / 'dist').glob(f'{package_name}*.zip'):
    if obsolete != archive:
        obsolete.unlink()
print(f'Built {output}\nBuilt {archive}')
print('VERDICT: PASS')
