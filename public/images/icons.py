#!/usr/bin/env python3

import os

from PIL import Image


def generate_icons(image_file, sizes=[16, 19, 32, 38, 48, 128]):
    img = Image.open(image_file)
    base, ext = os.path.splitext(image_file)
    paths = []
    for sz in sizes:
        res = img.resize((sz, sz), Image.Resampling.LANCZOS)
        name = f"{base}_{sz}x{sz}{ext}"
        res.save(name)
        paths.append(name)
    return paths


if __name__ == "__main__":
    import sys

    print("Generated: ", generate_icons(sys.argv[1]))
