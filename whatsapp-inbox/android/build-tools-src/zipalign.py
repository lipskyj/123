"""Minimal zipalign: rewrites an APK so every STORED entry's data starts on a 4-byte boundary.
Usage: python3 zipalign.py in.apk out.apk"""
import sys
import zipfile

src, dst = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(src) as zin, open(dst, "wb") as f, zipfile.ZipFile(f, "w") as zout:
    for info in zin.infolist():
        data = zin.read(info.filename)
        ni = zipfile.ZipInfo(info.filename, date_time=info.date_time)
        ni.compress_type = info.compress_type
        ni.external_attr = info.external_attr
        ni.extra = b""
        if info.compress_type == zipfile.ZIP_STORED:
            name_len = len(ni.filename.encode("utf-8"))
            data_start = f.tell() + 30 + name_len
            pad = (4 - data_start % 4) % 4
            ni.extra = b"\x00" * pad
        zout.writestr(ni, data)

with zipfile.ZipFile(dst) as z:
    for i in z.infolist():
        if i.compress_type == zipfile.ZIP_STORED:
            off = i.header_offset + 30 + len(i.filename.encode()) + len(i.extra)
            assert off % 4 == 0, (i.filename, off)
print("aligned:", dst)
