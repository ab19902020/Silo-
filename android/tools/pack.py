#!/usr/bin/env python3
"""Pack Silo 18 into an unsigned, aligned APK without the Android SDK.

An APK is a zip with three Android-specific files in it: a compiled binary
manifest, a compiled resource table and Dalvik bytecode. The bytecode comes
from dx; the other two are small enough to write by hand, which is what this
does — so the build needs a JDK and Python and nothing from Google's servers.

    pack.py --dex classes.dex --icon icon.png --www ../dist --out unsigned.apk \
            [--version-code N] [--version-name X]
"""
import argparse, os, struct, zipfile

PACKAGE = 'com.silo18.game'
LABEL = 'Silo 18'
MIN_SDK, TARGET_SDK = 24, 34

ANDROID_NS = 'http://schemas.android.com/apk/res/android'
# android.R.attr — read out of android.jar with javap.
ATTR = {
    'theme': 0x01010000, 'label': 0x01010001, 'icon': 0x01010002, 'name': 0x01010003,
    'exported': 0x01010010, 'launchMode': 0x0101001d, 'screenOrientation': 0x0101001e,
    'configChanges': 0x0101001f, 'minSdkVersion': 0x0101020c, 'versionCode': 0x0101021b,
    'versionName': 0x0101021c, 'targetSdkVersion': 0x01010270, 'allowBackup': 0x01010280,
    'hardwareAccelerated': 0x010102d3, 'largeHeap': 0x0101035a,
}
THEME_FULLSCREEN = 0x0103000a          # @android:style/Theme.Black.NoTitleBar.Fullscreen
ICON = 0x7f010000                      # @drawable/icon, from the table below
SENSOR_LANDSCAPE = 6
SINGLE_TOP = 1
# orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|
# screenLayout|uiMode|navigation|density — turning the phone must not reload
# the page and lose the game.
CONFIG_CHANGES = 0x1ff0

STRING, REFERENCE, INT_DEC, INT_HEX, BOOLEAN = 0x03, 0x01, 0x10, 0x11, 0x12


def pad4(b):
    return b + b'\0' * (-len(b) % 4)


def string_pool(strings):
    """A UTF-16 ResStringPool chunk."""
    offsets, data = [], b''
    for s in strings:
        offsets.append(len(data))
        units = s.encode('utf-16-le')
        data += struct.pack('<H', len(units) // 2) + units + b'\0\0'
    data = pad4(data)
    header = 28
    start = header + 4 * len(strings)
    body = b''.join(struct.pack('<I', o) for o in offsets) + data
    return struct.pack('<HHIIIIII', 0x0001, header, header + len(body), len(strings), 0, 0, start, 0) + body


# --- the manifest -----------------------------------------------------------

def element(tag, attrs, children=()):
    return (tag, attrs, list(children))


def a(name, kind, value):
    """An android: attribute."""
    return ('android', name, kind, value)


def raw(name, value):
    """A plain attribute with no namespace, like the manifest's package."""
    return (None, name, STRING, value)


def manifest(version_code, version_name):
  return element('manifest', [
    a('versionCode', INT_DEC, version_code), a('versionName', STRING, version_name), raw('package', PACKAGE)], [
    element('uses-sdk', [a('minSdkVersion', INT_DEC, MIN_SDK), a('targetSdkVersion', INT_DEC, TARGET_SDK)]),
    element('uses-permission', [a('name', STRING, 'android.permission.VIBRATE')]),
    element('application', [
        a('theme', REFERENCE, THEME_FULLSCREEN), a('label', STRING, LABEL), a('icon', REFERENCE, ICON),
        a('allowBackup', BOOLEAN, True), a('hardwareAccelerated', BOOLEAN, True), a('largeHeap', BOOLEAN, True)], [
        element('activity', [
            a('theme', REFERENCE, THEME_FULLSCREEN), a('label', STRING, LABEL),
            a('name', STRING, PACKAGE + '.MainActivity'), a('exported', BOOLEAN, True),
            a('launchMode', INT_DEC, SINGLE_TOP), a('screenOrientation', INT_DEC, SENSOR_LANDSCAPE),
            a('configChanges', INT_HEX, CONFIG_CHANGES)], [
            element('intent-filter', [], [
                element('action', [a('name', STRING, 'android.intent.action.MAIN')]),
                element('category', [a('name', STRING, 'android.intent.category.LAUNCHER')]),
            ]),
        ]),
    ]),
  ])


def binary_manifest(root):
    # Attribute names that carry a resource ID go first in the string pool, in
    # the same order as the resource map that follows it.
    mapped, others = [], []

    def collect(node):
        tag, attrs, children = node
        for ns, name, kind, value in attrs:
            if ns and name not in mapped:
                mapped.append(name)
            elif not ns and name not in others:
                others.append(name)
            if kind == STRING and value not in others:
                others.append(value)
        if tag not in others:
            others.append(tag)
        for c in children:
            collect(c)
    collect(root)
    mapped.sort(key=lambda n: ATTR[n])
    strings = mapped + [s for s in ['android', ANDROID_NS] + others if s not in mapped]
    strings = list(dict.fromkeys(strings))
    index = {s: i for i, s in enumerate(strings)}

    chunks = [string_pool(strings)]
    resmap = b''.join(struct.pack('<I', ATTR[n]) for n in mapped)
    chunks.append(struct.pack('<HHI', 0x0180, 8, 8 + len(resmap)) + resmap)
    NONE = 0xffffffff
    chunks.append(struct.pack('<HHIIIII', 0x0100, 16, 24, 1, NONE, index['android'], index[ANDROID_NS]))

    def emit(node, line=[1]):
        tag, attrs, children = node
        line[0] += 1
        # Attributes in resource-ID order, unnamespaced ones last: the platform
        # walks them alongside its own sorted list and misses any out of order.
        attrs = sorted(attrs, key=lambda t: (0, ATTR[t[1]]) if t[0] else (1, 0))
        body = b''
        for ns, name, kind, value in attrs:
            raw_value = index[value] if kind == STRING else NONE
            if kind == STRING:
                data = index[value]
            elif kind == BOOLEAN:
                data = 0xffffffff if value else 0
            else:
                data = value
            body += struct.pack('<IIIHBBI', index[ANDROID_NS] if ns else NONE, index[name], raw_value, 8, 0, kind, data)
        ext = struct.pack('<IIHHHHHH', NONE, index[tag], 20, 20, len(attrs), 0, 0, 0)
        size = 16 + len(ext) + len(body)
        chunks.append(struct.pack('<HHIII', 0x0102, 16, size, line[0], NONE) + ext + body)
        for c in children:
            emit(c)
        line[0] += 1
        chunks.append(struct.pack('<HHIIIII', 0x0103, 16, 24, line[0], NONE, NONE, index[tag]))
    emit(root)
    chunks.append(struct.pack('<HHIIIII', 0x0101, 16, 24, 99, NONE, index['android'], index[ANDROID_NS]))
    body = b''.join(chunks)
    return struct.pack('<HHI', 0x0003, 8, 8 + len(body)) + body


# --- the resource table: one drawable, the launcher icon --------------------

def resource_table(icon_path):
    values = string_pool([icon_path])
    type_names = string_pool(['drawable'])
    key_names = string_pool(['icon'])
    spec = struct.pack('<HHIBBHI', 0x0202, 16, 16 + 4, 1, 0, 0, 1) + struct.pack('<I', 0)
    config = struct.pack('<I', 64) + b'\0' * 60          # the default configuration
    header = 8 + 1 + 1 + 2 + 4 + 4 + len(config)
    entries_start = header + 4
    entry = struct.pack('<HHI', 8, 0, 0) + struct.pack('<HBBI', 8, 0, STRING, 0)
    kind = struct.pack('<HHIBBHII', 0x0201, header, entries_start + len(entry), 1, 0, 0, 1, entries_start) + config
    kind += struct.pack('<I', 0) + entry
    name = PACKAGE.encode('utf-16-le').ljust(256, b'\0')
    package_header = 288
    type_offset = package_header
    key_offset = type_offset + len(type_names)
    package_body = type_names + key_names + spec + kind
    package = struct.pack('<HHII', 0x0200, package_header, package_header + len(package_body), 0x7f) + name
    package += struct.pack('<IIIII', type_offset, 1, key_offset, 1, 0) + package_body
    body = values + package
    return struct.pack('<HHII', 0x0002, 12, 12 + len(body), 1) + body


# --- the zip ----------------------------------------------------------------

STORED_TYPES = {'.png', '.jpg', '.jpeg', '.webp', '.mp3', '.ogg', '.m4a', '.glb', '.ktx2', '.woff2', '.zip'}


def add(zf, name, data, stored):
    info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
    info.create_system = 0
    info.external_attr = 0
    if stored:
        # Uncompressed entries start on a 4-byte boundary so Android can map
        # them straight out of the file. The padding goes in an alignment
        # extra field, which is where zipalign and apksigner put it.
        info.compress_type = zipfile.ZIP_STORED
        offset = zf.fp.tell() + 30 + len(name.encode())
        padding = (-(offset + 6)) % 4
        info.extra = struct.pack('<HHH', 0xd935, 2 + padding, 4) + b'\0' * padding
    else:
        info.compress_type = zipfile.ZIP_DEFLATED
    zf.writestr(info, data, compresslevel=9 if not stored else None)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dex', required=True)
    ap.add_argument('--icon', required=True)
    ap.add_argument('--www', required=True)
    ap.add_argument('--out', required=True)
    # A phone only installs an update over an older build, so the code counts up.
    ap.add_argument('--version-code', type=int, default=1)
    ap.add_argument('--version-name', default='1.0')
    args = ap.parse_args()
    icon_entry = 'res/drawable/icon.png'
    with zipfile.ZipFile(args.out, 'w') as zf:
        add(zf, 'AndroidManifest.xml', binary_manifest(manifest(args.version_code, args.version_name)), False)
        add(zf, 'classes.dex', open(args.dex, 'rb').read(), False)
        # Android 11 refuses a resource table that is compressed or misaligned.
        add(zf, 'resources.arsc', resource_table(icon_entry), True)
        add(zf, icon_entry, open(args.icon, 'rb').read(), True)
        count = 0
        for top, dirs, files in os.walk(args.www):
            dirs.sort()
            for f in sorted(files):
                path = os.path.join(top, f)
                rel = os.path.relpath(path, args.www).replace(os.sep, '/')
                if rel.startswith('.') or '/.' in rel:
                    continue
                stored = os.path.splitext(f)[1].lower() in STORED_TYPES
                add(zf, 'assets/www/' + rel, open(path, 'rb').read(), stored)
                count += 1
    print(f'{args.out}: {count} game files')


if __name__ == '__main__':
    main()
