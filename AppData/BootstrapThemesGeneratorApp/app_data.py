# -*- coding: utf-8 -*-
"""
"""

# NOTE: These are the names of the folders at UserData/www/sections.
SECTIONS = [
    "components",
    "content",
    "forms",
    "utilities"
]


SECTION_TAB = """<a class="nav-link"
id="bstg-{section_name}-tab"
data-bs-toggle="pill"
href="#bstg-{section_name}-tabpanel"
role="tab"
aria-controls="bstg-{section_name}-tabpanel"
aria-selected="false"
title="Bootstrap {section_name}">{section_name_capital}</a>""".replace("\n", " ")

# NOTE: Quadruple curly brackets because this template passes through a call to str.format before
# performing replacements. This will convert the quadruple curly brackets into double curly brackets.
SECTION_TABPANEL = """
<div class="tab-pane fade" id="bstg-{section_name}-tabpanel" role="tabpanel" aria-labelledby="bstg-{section_name}-tab">
    <div class="row flex-row mx-0 px-0 d-print-block h-100">
        <div class="bstg-sidebar bstg-needs-navbar-offset px-0 col-lg-2 col-md-3 text-bold h-100 d-print-none overflow-auto">
            <div id="bstg-{section_name}-selector" class="nav nav-pills flex-column overflow-hidden" role="tablist">
                <h5 class="text-center" role="tab" aria-selected="false"><b>{section_name_capital}</b></h5>
<!-- {{{{{section_name}-tabs}}}} -->
            </div>
        </div>
        <div class="bstg-sidebar-companion offset-lg-2 offset-md-3 offset-sm-0 col-12 col-lg-10 col-md-9 h-100">
            <div class="tab-content">
<!-- {{{{{section_name}-tabpanels}}}} -->
            </div>
        </div>
    </div>
</div>
"""

SUBSECTION_TAB = """
<a class="nav-link {tab_active}"
id="{tab_id}"
data-bs-toggle="pill"
href="#{tabpanel_id}"
role="tab"
aria-controls="{tabpanel_id}"
aria-selected="false">{tab_label}</a>""".replace("\n", " ")

SUBSECTION_TABPANEL = """<div class="tab-pane fade{tabpanel_active}"
id="{tabpanel_id}"
role="tabpanel"
aria-labelledby="{tab_id}"></div>""".replace("\n", " ")

if __name__ == "__main__":
    pass
