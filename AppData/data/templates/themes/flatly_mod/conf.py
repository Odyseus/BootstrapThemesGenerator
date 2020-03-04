#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""Optional theme configuration file.

Attributes
----------
settings : dict
    The variable containing all settings for a theme. All keys are optional.

        - theme_name: The display name for a theme. It will be used as the theme preview page's
        title and the page banner title.
        - theme_description: A Markdown string that will be used to describe the theme in the page banner.
        - extra_examples: A path to an HTML file relative to "UserData/themes". This file can contain
        any HTML that can illustrate new styles added by the generated theme.
"""
settings = {
    "theme_name": "Flatly mod",
    "theme_description": """
#### Differences with the original theme

##### Overrides

- Overridden gigantic headings.
- Annihilated web font imports.
- Reduced inputs/buttons/badges focus border width.
- Changed pagination styles to a less *flashy* style.
- Overridden sans serif fonts (the default is now **Open Sans**) and monospace fonts (the default is now **DejaVu Sans Mono**).

##### Added styles

- Enabled gradients and shadows.
- Text styling classes:
    - **text-bold**
    - **text-bolder**
    - **text-italic**
    - **text-oblique**
    - **text-overline**
    - **text-line-through**
    - **text-underline**
    - **text-font-size-small**
    - **text-font-size-medium**
    - **text-font-size-large**
    - **text-font-size-x-large**
    - **text-font-size-xx-large**
- Class to center images horizontally:
    - **img-centered-container**: This class should be set to a `<div>` containing an `<img>`.
- Miscellaneous tweaks/classes:
    - **div.boxed**: A class to "frame" an element with a border with radius and a shadow.
    - Added a bottom border to `<h1>` and `<h2>` tags and to `h1` and `h2` classes inside `.container.boxed`.
    - Tweaked `<pre>` to allow word wrapping. Also changed the background color and added a border with radius to add contrast against the page background.
    - Expanded element classes generation (`btn-<color>`, `btn-outline-<color>`, `badge-<color>`, `bg-<color>`, `bg-gradient-<color>` and `border-<color>`) to include extra colors (`blue`, `indigo`, `purple`, `pink`, `red`, `orange`, `yellow`, `green`, `teal` and `cyan`).

    """,
    "extra_examples": "extra-examples-with-colors.html"
}

if __name__ == "__main__":
    pass
