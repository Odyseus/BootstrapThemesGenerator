#!/bin/bash

# It would have been impossible to create this without the following post on Stack Exchange!!!
# https://unix.stackexchange.com/a/55622

# Other shells support. There is only Bash, nothing else exists.
# The nightmares caused by the use of Bash are more than enough to be bothered
# with support for any other shell in existence.

# Tested on Zsh:
#
# Completions work just fine provided that Zsh has been configured to support
# Bash completions.
#
# Things that doesn't work:
# - Auto completion of long options values. Short options values work just fine.
# - No space after auto-completing a long option. Most likely this is why the auto completion
#   of long options values doesn't work. Can't be bothered to fix this.

# Function definitions.
# Use the placeholder { current_date } (without the spaces) in the function names.
# This is to avoid conflicts between functions with the same name that are defined
# in different files that may perform slightly different tasks.

type "{executable_name}" &> /dev/null &&
_get_theme_ids{current_date}(){
    echo $(cd {full_path_to_app_folder}; ./app.py print_theme_ids)
} &&
_decide_nospace_{current_date}(){
    # Decide if after the completion of a term should a space character should be added or not.
    # It only works on Bash, not on Zsh. Not tested in any other shell.
    if [[ ${1} == "--"*"=" ]] ; then
        type "compopt" &> /dev/null && compopt -o nospace
    fi
} &&
_bootswatch_themes_manager_cli_{current_date}(){
    local cur prev cmd
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    case $prev in
        "--theme")
            theme_names=( $(_get_theme_ids{current_date}) )
            COMPREPLY=( $( compgen -W "${theme_names[*]}") )
            return 0
            ;;
        "-t")
            theme_names=( $(_get_theme_ids{current_date}) )
            COMPREPLY=( $( compgen -W "${theme_names[*]}" -- ${cur}) )
            return 0
            ;;
    esac

    # Handle --xxxxx=path
    if [[ ${prev} == "=" ]] ; then
        # Unescape space
        cur=${cur//\\ / }

        if [[ ${cur} != *"/"* ]]; then
            theme_names=( $(_get_theme_ids{current_date}) )
            COMPREPLY=( $( compgen -W "${theme_names[*]}" -- ${cur}) )
            return 0
        fi

        return 0
    fi

    # Completion of commands and "first level" options.
    if [[ $COMP_CWORD == 1 ]]; then
        COMPREPLY=( $(compgen -W "\
build \
server \
node_modules \
launch_preview \
generate \
-h --help --manual --version" -- "${cur}") )
        return 0
    fi

    # Completion of options and sub-commands.
    cmd="${COMP_WORDS[1]}"

    case $cmd in
        "generate")
            COMPREPLY=( $(compgen -W "system_executable" -- "${cur}") )
            ;;
        "server")
            COMPREPLY=( $(compgen -W "start stop restart --host= --port=" -- "${cur}") )
            _decide_nospace_{current_date} ${COMPREPLY[0]}
            ;;
        "launch_preview")
            COMPREPLY=( $(compgen -W "--host= --port=" -- "${cur}") )
            _decide_nospace_{current_date} ${COMPREPLY[0]}
            ;;
        "build")
            COMPREPLY=( $(compgen -W "-t --theme= -s --node-sass-args= -p \
--postcss-args=" -- "${cur}") )
            _decide_nospace_{current_date} ${COMPREPLY[0]}
            ;;
        "node_modules")
            COMPREPLY=( $(compgen -W "install update" -- "${cur}") )
            ;;
    esac
} &&
complete -F _bootswatch_themes_manager_cli_{current_date} {executable_name}
