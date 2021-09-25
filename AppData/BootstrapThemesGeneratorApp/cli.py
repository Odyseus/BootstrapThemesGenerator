#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""Main command line application.

Attributes
----------
docopt_doc : str
    Used to store/define the docstring that will be passed to docopt as the "doc" argument.
root_folder : str
    The main folder containing the application. All commands must be executed from this location
    without exceptions.
"""
import os

from . import app_utils
from .__init__ import __appdescription__
from .__init__ import __appname__
from .__init__ import __status__
from .__init__ import __version__
from .python_utils import bottle_utils
from .python_utils import cli_utils

root_folder = os.path.realpath(os.path.abspath(os.path.join(
    os.path.normpath(os.getcwd()))))

docopt_doc = """{appname} {version} ({status})

{appdescription}

Usage:
    app.py (-h | --help | --manual | --version)
    app.py build [-t <id>... | --theme=<id>...]
                 [-s <args> | --node-sass-args=<args>]
                 [-p <args> | --postcss-args=<args>]
    app.py build_index_file
    app.py node_modules (install | update)
    app.py launch_preview [--host=<host>]
                          [--port=<port>]
    app.py server (start | stop | restart)
                  [--host=<host>]
                  [--port=<port>]
    app.py generate system_executable
    app.py print_theme_ids
    app.py repo subtrees (init | update) [-y | --dry-run]

Options:

-h, --help
    Show this screen.

--manual
    Show this application manual page.

--version
    Show application version.

--host=<host>
    Host name. [Default: 0.0.0.0]

--port=<port>
    Port number. [Default: 8899]

-t <id>, --theme=<id>
    The ID of the theme that one wants to build. If no specified, all themes
    found inside the **UserData/themes** folder will be built. The ID of a
    theme is just the name of its folder.

-s <args>, --node-sass-args=<args>
    Extra arguments to pass to **node-sass** CLI.

-p <args>, --postcss-args=<args>
    Extra arguments to pass to **postcss** CLI. [Default: --no-map]

-y, --dry-run
    Do not perform file system changes. Only display messages informing of the
    actions that will be performed or commands that will be executed.
    WARNING! Some file system changes will be performed (e.g. temporary files
    creation).

""".format(appname=__appname__,
           appdescription=__appdescription__,
           version=__version__,
           status=__status__)


class CommandLineInterface(cli_utils.CommandLineInterfaceSuper):
    """Command line interface.

    It handles the arguments parsed by the docopt module.

    Attributes
    ----------
    a : dict
        Where docopt_args is stored.
    action : method
        Set the method that will be executed when calling CommandLineTool.run().
    node_action : str
        Node command. One of "install" or "update".
    www_root : str
        Path to the folder that will be served by the web server.
    """
    action = None
    node_action = None
    repo_action = None
    www_root = os.path.join(root_folder, "UserData", "www")

    def __init__(self, docopt_args):
        """
        Parameters
        ----------
        docopt_args : dict
            The dictionary of arguments as returned by docopt parser.
        """
        self.a = docopt_args
        self._cli_header_blacklist = [
            self.a["--manual"],
            self.a["print_theme_ids"]
        ]

        super().__init__(__appname__)

        if self.a["--manual"]:
            self.action = self.display_manual_page
        elif self.a["build_index_file"]:
            self.logger.info("**Building index.html file**")
            self.action = self.build_index_file
        elif self.a["launch_preview"]:
            self.logger.info("**Launching themes preview page**")
            self.action = self.launch_preview
        if self.a["node_modules"]:
            self.node_action = "install" if self.a["install"] else "update" if self.a["update"] else None

            self.logger.info("**Managing node modules...**")
            self.action = self.manage_node_modules
        elif self.a["build"]:
            self.logger.info("**Building themes**")
            self.action = self.build_themes
        elif self.a["server"]:
            self.logger.info("**Command:** server")
            self.logger.info("**Arguments:**")

            if self.a["start"]:
                self.logger.info("start")
                self.action = self.http_server_start
            elif self.a["stop"]:
                self.logger.info("stop")
                self.action = self.http_server_stop
            elif self.a["restart"]:
                self.logger.info("restart")
                self.action = self.http_server_restart
        elif self.a["print_theme_ids"]:
            self.action = self.print_theme_ids
        elif self.a["generate"]:
            if self.a["system_executable"]:
                self.logger.info("**System executable generation...**")
                self.action = self.system_executable_generation
        elif self.a["repo"]:
            self.repo_action = "init" if self.a["init"] else "update" if self.a["update"] else ""

            if self.a["subtrees"]:
                self.logger.info("**Managing repository sub-trees...**")
                self.action = self.manage_repo_subtrees

    def run(self):
        """Execute the assigned action stored in self.action if any.
        """
        if self.action is not None:
            self.action()

    def system_executable_generation(self):
        """See :any:`cli_utils.CommandLineInterfaceSuper._system_executable_generation`.
        """
        self._system_executable_generation(
            exec_name="bootstrap-themes-generator-cli",
            app_root_folder=root_folder,
            sys_exec_template_path=os.path.join(
                root_folder, "AppData", "data", "templates", "system_executable"),
            bash_completions_template_path=os.path.join(
                root_folder, "AppData", "data", "templates", "bash_completions.bash"),
            logger=self.logger
        )

    def display_manual_page(self):
        """See :any:`cli_utils.CommandLineInterfaceSuper._display_manual_page`.
        """
        self._display_manual_page(os.path.join(root_folder, "AppData", "data", "man", "app.py.1"))

    def print_theme_ids(self):
        """See :any:`app_utils.print_theme_ids`.
        """
        app_utils.print_theme_ids()

    def build_index_file(self):
        """See :any:`app_utils.build_index_file`.
        """
        app_utils.build_index_file(self.logger)

    def manage_node_modules(self):
        """See :any:`app_utils.manage_node_modules`.
        """
        app_utils.manage_node_modules(self.node_action,
                                      cwd=self.www_root,
                                      logger=self.logger)

    def manage_repo_subtrees(self):
        """See :any:`git_utils.manage_repo`
        """
        from .python_utils import git_utils

        subtrees = [{
            "url": "git@gitlab.com:Odyseus/js_web_utils.git",
            "path": "UserData/www/_assets/js/js_web_utils"
        }]
        git_utils.manage_repo(
            "subtree",
            self.repo_action,
            cwd=app_utils.root_folder,
            subtrees=subtrees,
            dry_run=self.a["--dry-run"],
            logger=self.logger
        )

    def launch_preview(self):
        """Launch preview.
        """
        import webbrowser
        url = "http://%s:%s" % (self.a["--host"], self.a["--port"])
        webbrowser.open(url, new=2)
        # NOTE: The server is restarted AFTER launching the website because executing the web
        # application will replace the current process.
        self.http_server_restart()

    def build_themes(self):
        """See :any:`app_utils.build_themes`.
        """
        app_utils.build_themes(themes=sorted(list(set(self.a["--theme"]))),
                               node_sass_args=self.a["--node-sass-args"],
                               postcss_args=self.a["--postcss-args"],
                               logger=self.logger)

    def http_server(self, action="start"):
        """Start/Stop/Restart the HTTP server.

        Parameters
        ----------
        action : str, optional
            Any of the following: start/stop/restart.
        """
        app_slug = "BootstrapThemesGenerator"
        web_app_path = os.path.abspath(os.path.join(root_folder, "AppData",
                                                    "%sApp" % app_slug,
                                                    "%s_webapp.py" % app_slug))

        bottle_utils.handle_server(action=action,
                                   server_args={
                                       "www_root": self.www_root,
                                       "web_app_path": web_app_path,
                                       "host": self.a["--host"],
                                       "port": self.a["--port"]
                                   },
                                   logger=self.logger)

    def http_server_start(self):
        """Self explanatory.
        """
        self.http_server(action="start")

    def http_server_stop(self):
        """Self explanatory.
        """
        self.http_server(action="stop")

    def http_server_restart(self):
        """Self explanatory.
        """
        self.http_server(action="restart")


def main():
    """Initialize command line interface.
    """
    cli_utils.run_cli(flag_file=".bootstrap-themes-generator.flag",
                      docopt_doc=docopt_doc,
                      app_name=__appname__,
                      app_version=__version__,
                      app_status=__status__,
                      cli_class=CommandLineInterface)


if __name__ == "__main__":
    pass
