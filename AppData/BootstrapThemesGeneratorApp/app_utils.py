# -*- coding: utf-8 -*-
"""Module with utility functions and classes.

Attributes
----------
root_folder : str
    The main folder containing the application. All commands must be executed
    from this location without exceptions.
"""
import os
import shlex

from subprocess import CalledProcessError

from .python_utils import cmd_utils
from .python_utils import file_utils
from .python_utils import shell_utils

from . import app_data

root_folder = os.path.realpath(os.path.abspath(os.path.join(
    os.path.normpath(os.getcwd()))))

_paths_map = {
    "themes_src": os.path.join(root_folder, "UserData", "themes"),
    "themes_globals": os.path.join(root_folder, "UserData", "themes", "_0_globals"),
    "themes_dist": os.path.join(root_folder, "UserData", "themes", "dist"),
    "preview_assets": os.path.join(root_folder, "UserData", "www", "_assets"),
    "postcss": os.path.join(root_folder, "UserData", "www", "node_modules", ".bin", "postcss"),
    "node_modules": os.path.join(root_folder, "UserData", "www", "node_modules"),
    "index_template": os.path.join(root_folder, "AppData", "data", "templates", "index", "index.html"),
    "modals": os.path.join(root_folder, "AppData", "data", "templates", "index", "modals.html"),
    "index_sections": os.path.join(root_folder, "UserData", "www", "sections"),
    "index_root": os.path.join(root_folder, "UserData", "www", "index.html")
}

_dart_sass_includes = [
    "--load-path=" + _paths_map["node_modules"],
    "--load-path=" + _paths_map["themes_globals"]
]


def build_index_file(logger):
    """Build lindex.html file.

    Parameters
    ----------
    logger : LogSystem
        The logger.
    """
    ids = []
    sections_tabs = []
    sections_tabpanels = []
    subsections_tabs = {}
    subsections_tabpanels = {}
    index_template = ""
    modals_data = ""

    for section in app_data.SECTIONS:
        subsection_files = [entry.path for entry in os.scandir(
            os.path.join(_paths_map["index_sections"], section))
            if entry.is_file(follow_symlinks=False) and entry.name[-5:] == ".html"]

        for index, subsection_path in enumerate(sorted(subsection_files)):
            subsection_base_id = os.path.basename(subsection_path)[:-5]
            subsection_tab_label = " ".join(subsection_base_id[4:].split("-")).capitalize()
            tab_id = "bstg-%s-%s-tab" % (section, subsection_base_id)
            tabpanel_id = "bstg-%s-%s-tabpanel" % (section, subsection_base_id)

            if tab_id in ids or tabpanel_id in ids:
                print(tab_id)
                print(tabpanel_id)

            ids.append(tab_id)
            ids.append(tabpanel_id)

            if section not in subsections_tabs:
                subsections_tabs[section] = []

            if section not in subsections_tabpanels:
                subsections_tabpanels[section] = []

            subsections_tabs[section].append(app_data.SUBSECTION_TAB.format(
                tab_active="active" if index == 0 else "",
                tabpanel_id=tabpanel_id,
                tab_id=tab_id,
                tab_label=subsection_tab_label
            ))

            subsections_tabpanels[section].append(app_data.SUBSECTION_TABPANEL.format(
                tabpanel_active=" show active" if index == 0 else "",
                tabpanel_id=tabpanel_id,
                tab_id=tab_id,
                tabpanel_content=""
            ))

        sections_tabs.append(app_data.SECTION_TAB.format(
            section_name=section,
            section_name_capital=section.capitalize()
        ))
        section_tabpanel = app_data.SECTION_TABPANEL.format(
            section_name=section,
            section_name_capital=section.capitalize()
        )
        sections_tabpanels.append(section_tabpanel.replace(
            "<!-- {{%s-tabpanels}} -->" % section, "\n".join(subsections_tabpanels[section])).replace(
            "<!-- {{%s-tabs}} -->" % section, "\n".join(subsections_tabs[section])))

    with open(_paths_map["index_template"], "r") as index_template_file:
        index_template = index_template_file.read()

    with open(_paths_map["modals"], "r") as modals_file:
        modals_data = modals_file.read()

    print()

    with open(_paths_map["index_root"], "w") as index_root_file:
        index_root_file.write(
            index_template.replace(
                "<!-- {{sections-tabs}} -->", "\n".join(sections_tabs)).replace(
                "<!-- {{sections-tabpanels}} -->", "\n".join(sections_tabpanels)).replace(
                "<!-- {{modals}} -->", modals_data)
        )


def build_themes(themes=[], sass_parser=None, dart_sass_args="", postcss_args="", logger=None):
    """Build themes.

    Parameters
    ----------
    themes : list, optional
        Themes specified in CLI.
    dart_sass_args : str, optional
        Extra arguments to pass to ``sass``.
    postcss_args : str, optional
        Extra arguments to pass to ``postcss-cli``.
    logger : None, optional
        See :any:`LogSystem`.
    """
    cmd_str = cmd_utils.which(sass_parser) if sass_parser else cmd_utils.which("sass")

    if not cmd_str:
        logger.error("Invalid or not found Sass parser.")

        if sass_parser:
            logger.error("Parser passed: %s" % cmd_str)
        else:
            logger.error("Parser detected: %s" % cmd_str)

        logger.error("Read documentation for requirements.")

        raise SystemExit(1)

    logger.info("**Parser used: %s**" % cmd_str)

    for theme in (themes or get_themes_list()):
        theme_src_path = os.path.join(_paths_map["themes_src"], theme, "theme.scss")
        theme_src_dir = os.path.dirname(theme_src_path)
        theme_dist_dir = os.path.join(os.path.dirname(theme_src_path), "dist")
        theme_dist_path = os.path.join(theme_dist_dir, "bootstrap.css")
        theme_dist_min_path = os.path.join(theme_dist_dir, "bootstrap.min.css")
        theme_preview_css = os.path.join(_paths_map["preview_assets"], "css", "themes", theme)

        if file_utils.is_real_file(theme_src_path):
            logger.info(shell_utils.get_cli_separator("-"), date=False)
            base_cmd = [cmd_str]
            cmd_1 = base_cmd + ["%s:%s" % (theme_src_path, theme_dist_path),
                                "--style", "expanded"]
            cmd_2 = base_cmd + ["%s:%s" % (theme_src_path, theme_dist_min_path),
                                "--style", "compressed"]
            cmd_1.extend(_dart_sass_includes)
            cmd_2.extend(_dart_sass_includes)
            cmd_3 = [_paths_map["postcss"], "--use", "autoprefixer",
                     "--replace", theme_dist_dir + "/*.css"]

            cmd_1.extend(shlex.split(dart_sass_args) if dart_sass_args else [])
            cmd_2.extend(shlex.split(dart_sass_args) if dart_sass_args else [])
            cmd_3.extend(shlex.split(postcss_args) if postcss_args else [])

            os.makedirs(theme_dist_dir, exist_ok=True)

            logger.info("Building expanded stylesheet for **%s**" % theme)
            cmd_utils.run_cmd(cmd_1, stdout=None, stderr=None, cwd=theme_src_dir)
            logger.info("Building compressed stylesheet for **%s**" % theme)
            cmd_utils.run_cmd(cmd_2, stdout=None, stderr=None, cwd=theme_src_dir)
            logger.info("Auto-prefixing generated CSS files")
            cmd_utils.run_cmd(cmd_3, stdout=None, stderr=None, cwd=theme_src_dir)

            logger.info("Copying files to live preview's assets folder")
            file_utils.custom_copytree(theme_dist_dir, theme_preview_css, symlinks=False,
                                       logger=logger, log_copied_file=True, overwrite=True)
        else:
            logger.warning("Theme '%s' isn't a valid theme." % theme)


def manage_node_modules(action, cwd="", logger=None):
    """Manage node modules.

    Parameters
    ----------
    action : str
        Whether to install or update the node modules.
    cwd : str, optional
        The directory from wich to run the ``npm`` command.
    logger : None, optional
        See :any:`LogSystem`.
    """
    cmd = "npm %s" % action

    try:
        logger.info("**Executing command:**\n%s" % cmd)
        cmd_utils.run_cmd(cmd, stdout=None, stderr=None, check=True, shell=True, cwd=cwd)
    except CalledProcessError as err:
        logger.error(err)


def get_themes_list():
    """Get themes list.

    Yields
    ------
    dict
        The theme's directory name.
    """
    for entry in os.scandir(_paths_map["themes_src"]):
        if entry.is_dir(follow_symlinks=False) and \
                entry.name[:1] != "_" and \
                file_utils.is_real_file(os.path.join(entry.path, "theme.scss")):
            yield entry.name


def print_theme_ids():
    """Print theme names.

    Called from the Bash completions script to autocomplete theme names.
    """
    for theme in get_themes_list():
        print(theme)


if __name__ == "__main__":
    pass
