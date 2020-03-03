#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""Web application.

Attributes
----------
root_folder : str
    The path to the folder that will be served by the web server.
"""
import os
import sys

from html import escape
from runpy import run_path

try:
    from python_utils.bottle_utils import bottle, bottle_app, WebApp
    from python_utils import file_utils
    from python_utils import mistune_utils
except (ImportError, SystemError):
    from .python_utils.bottle_utils import bottle, bottle_app, WebApp
    from .python_utils import file_utils
    from .python_utils import mistune_utils


root_folder = os.path.realpath(os.path.abspath(os.path.join(
    os.path.normpath(os.getcwd()))))

_app_folder = os.path.dirname(os.path.dirname(root_folder))
_themes_path = os.path.join(root_folder, "_assets", "css", "themes")
_node_modules_folder = os.path.join(root_folder, "node_modules")
_jquery_folder = os.path.join(_node_modules_folder, "jquery", "dist")
_bootstrap_folder = os.path.join(_node_modules_folder, "bootstrap", "dist")
_bootswatch_folder = os.path.join(_node_modules_folder, "bootswatch", "dist")

_menu_item_bootstrap = '<a class="dropdown-item" href="_static_bootstrap/css/bootstrap.min.css" data-description="Bootstrap\'s default theme">Bootstrap\'s default</a>'
_menu_item_separator = '<div class="dropdown-divider"></div>'
_menu_item_template = '<a class="dropdown-item" data-description="{theme_description}" href="_assets/css/themes/{theme_id}/bootstrap.min.css">{theme_name}</a>'


class BootstrapThemesGeneratorWebapp(WebApp):
    """Knowledge Base web server.
    """

    def __init__(self, *args, **kwargs):
        """Initialization.

        Parameters
        ----------
        *args
            Arguments.
        **kwargs
            Keyword arguments.
        """
        super().__init__(*args, **kwargs)

    @bottle_app.route("/_static_jquery")
    def server_static_node_files():
        """Serve jQuery's static files.

        Returns
        -------
        object
            An instance of `bottle.HTTPResponse`.
        """
        return bottle.static_file("jquery.min.js", root=_jquery_folder)

    @bottle_app.route("/_static_bootstrap/<filename:path>")
    def server_static_bootstrap(filename):
        """Serve Bootstrap's static files.

        Parameters
        ----------
        filename : str
            The file to serve.

        Returns
        -------
        object
            An instance of `bottle.HTTPResponse`.
        """
        return bottle.static_file(filename, root=_bootstrap_folder)

    @bottle_app.route("/_static_bootswatch/<filename:path>")
    def server_static_node_files_bootswatch(filename):
        """Serve Bootswatch's static files.

        Parameters
        ----------
        filename : str
            The file to serve.

        Returns
        -------
        object
            An instance of `bottle.HTTPResponse`.
        """
        return bottle.static_file(filename, root=_bootswatch_folder)

    @bottle_app.route("/_assets/<filepath:path>")
    def server_static(filepath):
        """Serve static files.

        Parameters
        ----------
        filepath : str
            Path to the served static file.

        Returns
        -------
        object
            An instance of `bottle.HTTPResponse`.
        """
        return bottle.static_file(filepath, root=os.path.join(root_folder, "_assets"))

    @bottle_app.route("/")
    def index():
        """Serve the landing page.

        Returns
        -------
        sre
            The content for the landing page.
        """
        with open(os.path.join(root_folder, "index.html"), "r", encoding="UTF-8") as index_file:
            index_data = index_file.read()

        if index_data:
            return index_data
        else:
            return "Something went horribly wrong!!!"

    @bottle_app.post("/build_theme_selector")
    def build_theme_selector():
        """Build the custom themes selector menu.

        Returns
        -------
        str
            The HTML markup for the menu.
        """
        theme_menu_items = []

        for theme in get_themes_list():
            theme_menu_items.append(_menu_item_template.format(
                theme_id=theme["id"],
                theme_name=theme["name"],
                theme_description=theme["description"]
            ))

        theme_menu_items.sort()
        theme_menu_items.insert(0, _menu_item_bootstrap)
        theme_menu_items.insert(1, _menu_item_separator)

        return "\n".join(theme_menu_items)

    @bottle_app.post("/extra_examples")
    def extra_examples():
        """Handle the extra HTML file, if any.

        Returns
        -------
        str
            The content of the extra HTML file to be inserted into the index.
        """
        theme_id = os.path.basename(os.path.dirname(bottle.request.POST["theme_href"]))
        themes_src_path = os.path.join("..", "themes")
        examples_path = ""
        examples_data = ""

        for theme in get_themes_list():
            if theme["id"] == theme_id:
                examples_path = os.path.join(themes_src_path, theme["extra_examples"])
                break

        if examples_path and file_utils.is_real_file(examples_path):
            with open(examples_path, "r", encoding="UTF-8") as examples_file:
                examples_data = examples_file.read()

        return examples_data


def get_themes_list():
    """Get custom themes list.

    Yields
    ------
    dict
        A custom theme data.
    """
    for entry in os.scandir(_themes_path):
        css_path = os.path.join(entry.path, "bootstrap.css")
        conf_path = os.path.join(_app_folder, "UserData", "themes", entry.name, "conf.py")
        conf_data = {}

        if entry.is_dir(follow_symlinks=False) and \
                entry.name[:1] != "_" and \
                file_utils.is_real_file(css_path):
            if file_utils.is_real_file(conf_path):
                conf_data = run_path(conf_path)["settings"]

            yield {
                "id": entry.name,
                "name": conf_data.get("theme_name", entry.name.capitalize().replace(
                    "_", " ").replace("-", " ")),
                # NOTE: Escaped to safely use it as the value of an HTML attribute.
                "description": escape(mistune_utils.md(conf_data.get("theme_description", ""))),
                "extra_examples": conf_data.get("extra_examples", "")
            }


# FIXME: Convert this script into a module.
# Just because it's the right thing to do.
# As it is right now, everything works as "it should".
if __name__ == "__main__":
    args = sys.argv[1:]

    if len(args) == 2:
        app = BootstrapThemesGeneratorWebapp(args[0], args[1])
        app.run()
