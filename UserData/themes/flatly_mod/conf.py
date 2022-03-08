#!/usr/bin/python3
# -*- coding: utf-8 -*-
_colors = [
    "blue",
    "cyan",
    "danger",
    "dark",
    "green",
    "indigo",
    "info",
    "light",
    "orange",
    "pink",
    "primary",
    "purple",
    "red",
    "secondary",
    "success",
    "teal",
    "warning",
    "yellow"
]

navbar_colors_combinations = [
    (
        "blue",         # Navbar background color class. bg-<color>
        "dark",         # Navbar foreground color class. navbar-<color>
        "secondary"     # Button color class. btn-<color>
    ),
    ("cyan", "light", "primary"),
    ("danger", "dark", "primary"),
    ("dark", "dark", "primary"),
    ("green", "light", "primary"),
    ("indigo", "dark", "secondary"),
    ("info", "light", "primary"),
    ("light", "light", "primary"),
    ("orange", "light", "primary"),
    ("pink", "dark", "purple"),
    ("primary", "dark", "secondary"),
    ("purple", "dark", "primary"),
    ("red", "dark", "primary"),
    ("secondary", "light", "primary"),
    ("success", "light", "primary"),
    ("teal", "light", "primary"),
    ("warning", "light", "primary"),
    ("yellow", "light", "primary")
]

badge_colors_combinations = [
    (
        "blue",  # Badge background color class. bg-<color>
        "light"  # Badge text color class. text-<color>
    ),
    ("cyan", "light"),
    ("danger", "light"),
    ("dark", "light"),
    ("green", "light"),
    ("indigo", "light"),
    ("info", "light"),
    ("light", "dark"),
    ("orange", "light"),
    ("pink", "light"),
    ("primary", "light"),
    ("purple", "light"),
    ("red", "light"),
    ("secondary", "light"),
    ("success", "light"),
    ("teal", "light"),
    ("warning", "light"),
    ("yellow", "light"),
]


_badge_template = """
<span class="text-font-size-large badge bg-{bg_color} text-{text_color} {pill_class}">
{color_name}
</span>
"""
_button_template = """
<button type="button" class="btn btn-{outline}{color} {disabled}">
{color_name}
</button>"""
_text_color_template = """
<p class="text-{color}">{color_name} id dolor id nibh ultricies vehicula ut id elit.</p>
"""

_navbar_template = """
<div class="bstg-example">
<nav class="navbar navbar-expand-lg navbar-{fg_color} bg-{bg_color}">
    <div class="container-fluid">
        <a class="navbar-brand" href="#">{brand}</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#{navbar_id}" aria-controls="{navbar_id}" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="{navbar_id}">
            <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                <li class="nav-item">
                    <a class="nav-link active" aria-current="page" href="#">Home</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#">Link</a>
                </li>
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" id="{navbar_id}-dropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        Dropdown
                    </a>
                    <ul class="dropdown-menu" aria-labelledby="{navbar_id}-dropdown">
                        <li><a class="dropdown-item" href="#">Action</a></li>
                        <li><a class="dropdown-item" href="#">Another action</a></li>
                        <li>
                            <hr class="dropdown-divider">
                        </li>
                        <li><a class="dropdown-item" href="#">Something else here</a></li>
                    </ul>
                </li>
                <li class="nav-item">
                    <a class="nav-link disabled" href="#" tabindex="-1" aria-disabled="true">Disabled</a>
                </li>
            </ul>
            <form class="d-flex">
                <input class="form-control me-2" type="search" placeholder="Search" aria-label="Search">
                <button class="btn btn-{btn_color}" type="submit">Search</button>
            </form>
        </div>
    </div>
</nav>
</div>
"""


def get_badges():
    badges = [
        "<h2>Badges all colors</h2>",
        '<div class="bstg-example">'
    ]

    pills = [
        "<h2>Pills all colors</h2>",
        '<div class="bstg-example">'
    ]

    for bg_color, text_color in badge_colors_combinations:
        color_name = " ".join(bg_color.split("-")).capitalize()
        badges.append(_badge_template.format(
            bg_color=bg_color,
            text_color=text_color,
            color_name=color_name,
            pill_class=""
        ))
        pills.append(_badge_template.format(
            bg_color=bg_color,
            text_color=text_color,
            color_name=color_name,
            pill_class="rounded-pill"
        ))

    badges.append("</div>")
    pills.append("</div>")
    badges.extend(pills)

    return "\n".join(badges)


def get_buttons():
    btns = [
        "<h2>Buttons all colors</h2>",
        '<div class="bstg-example">'
    ]

    btns_dis = [
        "<h2>Buttons disabled all colors</h2>",
        '<div class="bstg-example">'
    ]

    btns_out = [
        "<h2>Buttons outline all colors</h2>",
        '<div class="bstg-example">'
    ]

    for c in _colors:
        color_name = " ".join(c.split("-")).capitalize()
        btns.append(_button_template.format(
            color=c,
            color_name=color_name,
            outline="",
            disabled=""
        ))
        btns_dis.append(_button_template.format(
            color=c,
            color_name=color_name,
            outline="",
            disabled="disabled"
        ))
        btns_out.append(_button_template.format(
            color=c,
            color_name=color_name,
            outline="outline-",
            disabled=""
        ))

    btns.append("</div>")
    btns_dis.append("</div>")
    btns_out.append("</div>")
    btns.extend(btns_dis)
    btns.extend(btns_out)

    return "\n".join(btns)


def get_text():
    txt = [
        "<h2>Text emphasis all colors</h2>",
        '<div class="bstg-example">'
    ]

    for c in _colors:
        c_name = " ".join(c.split("-")).capitalize()
        txt.append(_text_color_template.format(
            color=c,
            color_name=c_name
        ))

    txt.append("</div>")

    return "\n".join(txt)


def get_navbars():
    navbars = ["<h2>Navbars all gradient colors</h2>"]

    for bg_color, fg_color, btn_color in navbar_colors_combinations:
        navbars.append(_navbar_template.format(
            brand=bg_color.capitalize(),
            bg_color=bg_color,
            fg_color=fg_color,
            navbar_id=bg_color + "-example-navbar",
            btn_color=btn_color
        ))

    return "\n".join(navbars)


def get_html():
    return "\n".join([
        get_badges(),
        get_buttons(),
        get_navbars(),
        get_text()
    ])


settings = {
    "theme_name": "Flatly mod (new colors)",
    "theme_description": """
This is basically Bootswatch's Flatly theme but instead of inheriting from Flatly I replicate its style by inheriting only from Bootstrap. I did this because some of Flatly's overrides aren't needed/wanted and Sass variable overrides is a f*cking mess. This way, I only have to deal with one nightmare scenario instead of two.

## Differences with the original Flatly theme

### Overrides

- Reduced inputs/buttons/badges focus border width.
- Changed pagination styles to a less *flashy* style.
- Overridden sans serif fonts (the default is now **Open Sans**) and monospace fonts (the default is now **DejaVu Sans Mono**).

### Added styles

- Enabled gradients and shadows.
- Added text styling classes using Bootstrap utilities API:
    - **fs-small**
    - **fs-medium**
    - **fs-large**
    - **fs-x-large**
    - **fs-xx-large**
- Miscellaneous tweaks/classes:
    - **div.boxed**: A class to "frame" an element with a border with radius and a shadow.
    - Added a bottom border to `<h1>` and `<h2>` tags and to `h1` and `h2` classes inside `.container.boxed`.
    - Tweaked `<pre>` to allow word wrapping. Also changed the background color and added a border with radius to add contrast against the page background.

### Removed styles

- Murdered web fonts.
- Removed pagination styles.
- Removed most of the padding added to elements. Flatly added too much paddings to navbars and nav-tabs and unnecessary padding to breadcrumbs.
    """,
    "extra_examples_html": get_html()
}

if __name__ == "__main__":
    pass
