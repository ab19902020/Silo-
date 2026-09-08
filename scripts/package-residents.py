"""Package the exported cast with reproducible metadata and byte verification."""
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
source = root / 'models' / 'cast'
manifest = json.loads((source / 'manifest.json').read_text())
files = [source / row['file'] for row in manifest] + [source / 'manifest.json']
archive = root / 'models' / 'silo18-cast.zip'
with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=9) as bundle:
    for path in sorted(files):
        info = ZipInfo(path.name, date_time=(2026, 9, 8, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        bundle.writestr(info, path.read_bytes(), compresslevel=9)
with ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    for path in files:
        assert bundle.read(path.name) == path.read_bytes(), path.name
print(f'{len(manifest)} models verified; {archive.stat().st_size:,} archive bytes.')
