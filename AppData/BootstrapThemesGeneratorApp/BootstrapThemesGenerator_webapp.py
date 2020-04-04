#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""Web application.

Attributes
----------
www_root : str
    The path to the folder that will be served by the web server.
"""
import os
import sys

from html import escape
from runpy import run_path

try:
    # If executed as a script to start the web server.
    host, port, app_dir_path = sys.argv[1:]
except Exception:
    # If imported as a module by Sphinx.
    host, port = None, None
    app_dir_path = os.path.realpath(os.path.abspath(os.path.join(
        os.path.normpath(os.path.dirname(__file__)))))

sys.path.insert(0, app_dir_path)

from python_utils import file_utils
from python_utils import mistune_utils
from python_utils.bottle_utils import WebApp
from python_utils.bottle_utils import bottle
from python_utils.bottle_utils import bottle_app


www_root = os.path.realpath(os.path.abspath(os.path.join(
    os.path.normpath(os.getcwd()))))

_app_folder = os.path.dirname(os.path.dirname(www_root))
_themes_path = os.path.join(www_root, "_assets", "css", "themes")
_node_modules_folder = os.path.join(www_root, "node_modules")
_jquery_folder = os.path.join(_node_modules_folder, "jquery", "dist")
_bootstrap_folder = os.path.join(_node_modules_folder, "bootstrap", "dist")
_bootswatch_folder = os.path.join(_node_modules_folder, "bootswatch", "dist")

_menu_item_template = '<a class="dropdown-item" data-description="{theme_description}" href="_assets/css/themes/{theme_id}/bootstrap.min.css">{theme_name}</a>'
_section_template = """<div class="bstg-section">
{tabpanel_content}
</div>"""


class BootstrapThemesGeneratorWebapp(WebApp):
    """Web server.
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
        return bottle.static_file(filepath, root=os.path.join(www_root, "_assets"))

    @bottle_app.route("/")
    def index():
        """Serve the landing page.

        Returns
        -------
        str
            The content for the landing page.
        """
        with open(os.path.join(www_root, "index.html"), "r", encoding="UTF-8") as index_file:
            index_data = index_file.read()

        if index_data:
            return index_data
        else:
            return "Something went horribly wrong!!!"

    @bottle_app.post("/build_custom_theme_selectors")
    def build_custom_theme_selectors():
        """Build the custom themes selector menu items.

        Returns
        -------
        str
            The HTML markup for the menu items.
        """
        theme_menu_items = []

        for theme in get_themes_list():
            theme_menu_items.append(_menu_item_template.format(
                theme_id=theme["id"],
                theme_name=theme["name"],
                theme_description=theme["description"]
            ))

        theme_menu_items.sort()

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
        themes_src_path = os.path.join(os.pardir, "themes")
        examples_path = ""
        examples_data = ""

        for theme in get_themes_list():
            if theme["id"] == theme_id:
                examples_data += theme.get("extra_examples_html", "")

                if "extra_examples_file" in theme:
                    examples_path = os.path.join(themes_src_path, theme["extra_examples_file"])

                if examples_path and file_utils.is_real_file(examples_path):
                    with open(examples_path, "r", encoding="UTF-8") as examples_file:
                        examples_data += examples_file.read()

                break

        return examples_data

    @bottle_app.post("/populate_tabpanel")
    def populate_tabpanel():
        """Populate tabpanel.

        Returns
        -------
        str
            Tabpanel content read from a file.
        """
        # NOTE: The tab ID is used to "devine" the file name.
        # Index 0: "bstg" prefix.
        # Index 1: Section name (components/utilities/extras). Which is also the name of the folder
        #   inside the sections folder.
        # Last index: the "tab" suffix.
        # All other parts are going to compose the file name.
        tab_id_parts = bottle.request.POST["tab_id"].split("-")
        use_section_template = bottle.request.POST["use_section_template"] == "true"
        section_name = tab_id_parts[1]
        file_name = "-".join(tab_id_parts[2:-1]) + ".html"
        file_path = os.path.join(www_root, "sections", section_name, file_name)
        file_content = ""

        if os.path.exists(file_path):
            with open(file_path, "r", encoding="UTF-8") as html_file:
                if use_section_template:
                    file_content = _section_template.format(tabpanel_content=html_file.read())
                else:
                    file_content = html_file.read()

        return file_content


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
                try:
                    conf_data = run_path(conf_path)["settings"]
                except Exception:
                    conf_data = {}

            yield {
                "id": entry.name,
                "name": conf_data.get("theme_name", entry.name.capitalize().replace(
                    "_", " ").replace("-", " ")),
                # NOTE: Escaped to safely use it as the value of an HTML attribute.
                "description": escape(mistune_utils.md(conf_data.get("theme_description", ""))),
                "extra_examples_file": conf_data.get("extra_examples_file", ""),
                "extra_examples_html": conf_data.get("extra_examples_html", "")
            }


# FIXME: Convert this script into a module.
# Just because it's the right thing to do.
# As it is right now, everything works as "it should".
if __name__ == "__main__" and host and port:
    app = BootstrapThemesGeneratorWebapp(host, port)
    app.run()
