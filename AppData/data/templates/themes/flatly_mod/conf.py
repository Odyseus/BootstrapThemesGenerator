#!/usr/bin/python3
# -*- coding: utf-8 -*-
_colors = [
    "blue",
    "cyan",
    "danger",
    "dark",
    "gray",
    "gray-dark",
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
    "white",
    "yellow"
]

_bg_classes = [
    ("bg-gradient-blue", "dark", "secondary"),
    ("bg-gradient-cyan", "light", "primary"),
    ("bg-gradient-danger", "dark", "primary"),
    ("bg-gradient-dark", "dark", "primary"),
    ("bg-gradient-gray", "dark", "primary"),
    ("bg-gradient-gray-dark", "dark", "primary"),
    ("bg-gradient-green", "light", "primary"),
    ("bg-gradient-indigo", "dark", "secondary"),
    ("bg-gradient-info", "light", "primary"),
    ("bg-gradient-light", "light", "primary"),
    ("bg-gradient-orange", "light", "primary"),
    ("bg-gradient-pink", "dark", "purple"),
    ("bg-gradient-primary", "dark", "secondary"),
    ("bg-gradient-purple", "dark", "primary"),
    ("bg-gradient-red", "dark", "primary"),
    ("bg-gradient-secondary", "light", "primary"),
    ("bg-gradient-success", "light", "primary"),
    ("bg-gradient-teal", "light", "primary"),
    ("bg-gradient-warning", "light", "primary"),
    ("bg-gradient-white", "light", "primary"),
    ("bg-gradient-yellow", "light", "primary")
]

_badge_template = '<span class="text-font-size-large badge badge-{color}">{color_name}</span>'
_badge_pill_template = '<span class="text-font-size-large badge badge-pill badge-{color}">{color_name}</span>'
_button_template = '<button type="button" class="btn btn-{color}">{color_name}</button>'
_button_disabled_template = '<button type="button" class="btn btn-{color}" disabled>{color_name}</button>'
_button_outline_template = '<button type="button" class="btn btn-outline-{color}">{color_name}</button>'
_text_color_template = '<p class="text-{color}">{color_name} id dolor id nibh ultricies vehicula ut id elit.</p>'

_navbar_template = """
<div class="bstg-example">
    <nav class="navbar navbar-expand-lg navbar-{navbar_color} {bg_color}">
        <a class="navbar-brand" href="#">Navbar</a>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#{navbar_id}" aria-controls="{navbar_id}" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="{navbar_id}">
            <ul class="navbar-nav mr-auto">
                <li class="nav-item active">
                    <a class="nav-link" href="#">Home <span class="sr-only">(current)</span></a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#">Features</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#">Pricing</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#">About</a>
                </li>
            </ul>
            <form class="form-inline">
                <input class="form-control mr-sm-2" placeholder="Search" aria-label="Search" type="search">
                <button class="btn btn-{btn_color} my-2 my-sm-0" type="submit">Search</button>
            </form>
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

    for c in _colors:
        c_name = " ".join(c.split("-")).capitalize()
        badges.append(_badge_template.format(
            color=c,
            color_name=c_name
        ))
        pills.append(_badge_pill_template.format(
            color=c,
            color_name=c_name
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
        c_name = " ".join(c.split("-")).capitalize()
        btns.append(_button_template.format(
            color=c,
            color_name=c_name
        ))
        btns_dis.append(_button_disabled_template.format(
            color=c,
            color_name=c_name
        ))
        btns_out.append(_button_outline_template.format(
            color=c,
            color_name=c_name
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

    for bg_color, navbar_color, btn_color in _bg_classes:
        navbars.append(_navbar_template.format(
            bg_color=bg_color,
            navbar_id=bg_color + "-example-navbar",
            navbar_color=navbar_color,
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
    "theme_name": "Flatly (new colors)",
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
- Miscellaneous tweaks/classes:
    - **div.boxed**: A class to "frame" an element with a border with radius and a shadow.
    - Added a bottom border to `<h1>` and `<h2>` tags and to `h1` and `h2` classes inside `.container.boxed`.
    - Tweaked `<pre>` to allow word wrapping. Also changed the background color and added a border with radius to add contrast against the page background.
    - Expanded element classes generation (`btn-<color>`, `btn-outline-<color>`, `badge-<color>`, `bg-<color>`, `bg-gradient-<color>` and `border-<color>`) to include extra colors (`blue`, `indigo`, `purple`, `pink`, `red`, `orange`, `yellow`, `green`, `teal` and `cyan`).

    """,
    "extra_examples_html": get_html(),
}

if __name__ == "__main__":
    pass
