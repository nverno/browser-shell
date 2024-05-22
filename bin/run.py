#!/usr/bin/env python3

import argparse
import os

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
# from selenium.webdriver.common.keys import Keys
# from selenium.webdriver.common.action_chains import ActionChains
# from selenium.webdriver.common.by import By


def extension_path():
    d = os.path.dirname(__file__) if '__file__' in globals() else os.getcwd()
    return os.path.abspath(os.path.join(d, '../dist'))


def setup_options(path=None, devtools=True):
    options = Options()
    for arg in [
        "--no-sandbox",
        # "--guest",
        "--start-maximized",
        "--new-window",
        "--allow-running-insecure-content",
        "--disable-dev-shm-using",
    ]:
        options.add_argument(arg)

    if devtools:
        options.add_argument("--auto-open-devtools-for-tabs")

    if path:
        options.add_argument(f"--load-extension={path}")

    options.add_experimental_option('prefs', {
        "extensions.ui.developer_mode": True,
    })
    options.add_experimental_option('detach', True)
    return options


def run(url = 'https://example.com', path=None, devtools = True):
    """Load unpacked extension in chromedriver"""
    opts = setup_options(path=path or extension_path(), devtools=devtools)
    driver = webdriver.Chrome(options=opts)
    driver.get(url)
    url_handle = driver.current_window_handle
    driver.switch_to.new_window('tab')
    driver.get('chrome://extensions')
    driver.switch_to.window(url_handle)
    return driver


def parse_arguments():
    parser = argparse.ArgumentParser(description="Run extension")
    parser.add_argument(
        "-u", "--url",
        help="Url to visit",
        default="https://example.com",
        type=str,
    )
    parser.add_argument(
        '-p', '--path',
        help="Extension path",
        type=str,
        default=extension_path()
    )
    return parser.parse_args()


def main():
    args = parse_arguments()
    run(url=args.url, path=args.path, devtools=True)


if __name__ == "__main__":
    main()
