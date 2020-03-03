#!/usr/bin/python3
# -*- coding: utf-8 -*-
import sys

from AppData.BootstrapThemesGeneratorApp.cli import main

if __name__ == "__main__":
    if len(sys.argv) == 1:
        sys.argv.append("--help")

    sys.exit(main())
