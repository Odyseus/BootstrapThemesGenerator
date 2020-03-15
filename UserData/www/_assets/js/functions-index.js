"use strict"; // jshint ignore:line

(function findDuplicateIds() {
    let idsSet = new Set();
    let duplicatedIDs = [];
    let all = document.querySelectorAll("[id]");

    for (let i = all.length - 1; i >= 0; i--) {
        let id = all[i].id;

        if (idsSet.has(id)) {
            duplicatedIDs.push(id);
        } else {
            idsSet.add(id);
        }
    }

    if (duplicatedIDs.length > 0) {
        console.error("Duplicated IDs found: " + duplicatedIDs.length + "\n" + duplicatedIDs.join("\n"));
    }
})();

(function() {
    let BSTG_Main = null;
    let NerdIcons = null;
    let NerdIconsGrid = null;
    const NERD_ICONS_TAB_ID = "bstg-extras-nerd-icons-tab";
    const SOURCE_BUTTON_HTML = '<button class="bstg-source-button btn btn-primary btn-sm" role="button" \
    data-toggle="tooltip" tabindex="0" title="View source code">&lt; &gt;</button>';
    const DEFAULT_PREFS = {
        pref_main_stylesheet: "_static_bootstrap/css/bootstrap.min.css",
        pref_selected_section: "",
        pref_selected_content: "",
        pref_selected_component: "",
        pref_selected_utility: ""
    };
    const $body = $("body");
    const $componentsSelector = $("#bstg-components-selector");
    const $contentSelector = $("#bstg-content-selector");
    const $metaThemeDescription = $("#bstg-meta-theme-description");
    const $metaThemeName = $("#bstg-meta-theme-name");
    const $metaTitle = $("#bstg-meta-title");
    const $sectionSelector = $("#bstg-section-selector");
    const $sourceModal = $("#bstg-source-modal");
    const $sourceModalCodeBlock = $sourceModal.find("pre code");
    const $themeDescriptionTab = $("#bstg-theme-description-tab");
    const $utilitiesSelector = $("#bstg-utilities-selector");
    const ExtraExamplesContainer = document.getElementById("bstg-extra-examples");
    const MainStylesheet = document.getElementById("bstg-main-stylesheet");
    const NerdIconsSearch = document.getElementById("bstg-nerd-icons-search");
    const NerdIconsSearchClearButton = document.getElementById("bstg-nerd-icons-search-button");
    const NerdIconsSearchForm = document.getElementById("bstg-nerd-icons-search-form");
    const NerdIconsTab = document.getElementById("bstg-extras-nerd-icons-tab");
    const ReloadCurrentThemeButton = document.getElementById("bstg-reload-current-theme");
    const ThemeSelector = document.getElementById("bstg-theme-selector");
    const DelayedShowBody = BSTG_Utils.debounce(() => {
        $body.animate({
            opacity: "1"
        }, {
            duration: 400
        });
    });

    class BSTG_MainClass {
        constructor() {
            this._winStorage = window.localStorage;
            this._onMainStylesheetLoadTimer = null;
            this.filterNerdIcons = BSTG_Utils.debounce(this.doFilterNerdIcons);

            let prefs = this.getPrefsFromStorage();
            for (let pref in prefs) {
                this[pref] = prefs[pref];
            }

            this.buildCustomThemeSelector();
            this.attachListeners();

            let promise = new Promise((aResolve) => {
                // F*CK EVERY SINGLE MEDIOCRE WEB DEVELOPER (FORGIVE THE REDUNDANCY)!!!
                // onload doesn't f*cking trigger in Shitmium.
                // So, implementing the f*cking promises was a total waste of my f*cking time!!!
                // F*ck you very much, web developers!!!
                MainStylesheet.onload = aResolve;
                this.populateExtraExamples(this.pref_main_stylesheet);
                // NOTE: Add date because setting twice the same href will not trigger onload.
                // On the other hand, this will never use a cached stylesheet (FFS). ¬¬
                MainStylesheet.setAttribute("href", this.pref_main_stylesheet + "?" + new Date().getTime());
                // NOTE: If aResolve isn't called by onload, call it after 2 seconds. ¬¬
                // Moving the f*ck on!!!
                this._onMainStylesheetLoadTimer = setTimeout(function() {
                    aResolve();
                }, 2000);
            });

            promise.then(() => {
                MainStylesheet.onload = null;
                clearTimeout(this._onMainStylesheetLoadTimer);
                this.setActiveSections();
                this.attachSourceButtons();
                this.initializeComponents();
                BSTG_Utils.delayedToggleBackToTopButtonVisibility();
                DelayedShowBody();
            });
        }

        /**
         * Build custom theme selectors menu items.
         */
        buildCustomThemeSelector() {
            $.ajax({
                method: "POST",
                url: "/build_custom_theme_selectors",
                cache: false
            }).done((aResponse) => {
                ThemeSelector.innerHTML = ThemeSelector.innerHTML + aResponse;
            }).always((aXHR, aStatusText) => { // jshint ignore:line
                this.iterateThemeSelectorsItems("set_current");
            }).fail((aXHR, aStatusText, aError) => {
                console.error(aStatusText);
                console.error(aError);
            });
        }

        /**
         * Iterate theme selector menu items.
         *
         * @param {String} aAction - Action to perform.
         */
        iterateThemeSelectorsItems(aAction) {
            let items = Array.prototype.slice.call(ThemeSelector.querySelectorAll(".dropdown-item"));

            for (let i = items.length - 1; i >= 0; i--) {
                switch (aAction) {
                    case "set_inactive": // When clicking a menu item.
                        items[i].classList.remove("active");
                        break;
                    case "set_current": // On initial page load.
                        if (items[i].getAttribute("href") === this.pref_main_stylesheet) {
                            this.setThemeData(items[i]);
                            items[i].classList.add("active");
                        }
                        break;
                }
            }
        }

        /**
         * Attach listeners to DOM elements.
         */
        attachListeners() {
            $sectionSelector.on("show.bs.tab", 'a[data-toggle="pill"]', (aE) => {
                this.handleNavigationPills("section", aE.target.id, aE.target === NerdIconsTab);
                NerdIconsSearchForm.classList.toggle("d-none", aE.target !== NerdIconsTab);
            }).on("shown.bs.tab", 'a[data-toggle="pill"]', () => {
                this.resetScrollPosition();
            });
            $contentSelector.on("show.bs.tab", 'a[data-toggle="pill"]', (aE) => {
                this.handleNavigationPills("content", aE.target.id);
            }).on("shown.bs.tab", 'a[data-toggle="pill"]', () => {
                this.resetScrollPosition();
            });
            $componentsSelector.on("show.bs.tab", 'a[data-toggle="pill"]', (aE) => {
                this.handleNavigationPills("component", aE.target.id);
            }).on("shown.bs.tab", 'a[data-toggle="pill"]', () => {
                this.resetScrollPosition();
            });
            $utilitiesSelector.on("show.bs.tab", 'a[data-toggle="pill"]', (aE) => {
                this.handleNavigationPills("utility", aE.target.id);
            }).on("shown.bs.tab", 'a[data-toggle="pill"]', () => {
                this.resetScrollPosition();
            });

            ThemeSelector.addEventListener("click", (aE) => {
                let target = aE.target;

                if (target.classList.contains("dropdown-item")) {
                    aE.preventDefault();
                    this.iterateThemeSelectorsItems("set_inactive");
                    this.selectTheme(target);
                }
            }, false);

            // NOTE: Target the anchors with "empty links" and source buttons on body click
            // so I can target anchors and buttons dynamically inserted into the HTML.
            $body[0].addEventListener("click", (aE) => {
                let target = aE.target;

                switch (target.tagName.toLowerCase()) {
                    case "a":
                        target.getAttribute("href") === "#" && aE.preventDefault();
                        break;
                    case "button":
                        if (target.classList.contains("bstg-source-button")) {
                            aE.preventDefault();

                            $sourceModalCodeBlock.text(this.cleanSource(target.parentNode.innerHTML));

                            if (typeof hljs === "object") {
                                hljs.configure({
                                    languages: ["html"]
                                });

                                hljs.highlightBlock($sourceModalCodeBlock[0]);
                            }

                            $sourceModal.modal();
                        }
                        break;
                }
            });

            // NOTE: Workaround for Firefox in Linux. ¬¬
            $sourceModal.on("keyup", (aE) => {
                if (aE.keyCode === 27) { // Escape key.
                    $(aE.target).modal("hide");
                }
            });

            $(NerdIconsSearch).on("keyup search input paste cut keypress",
                this.nerdIconsSearchEventHandler.bind(this));

            NerdIconsSearchClearButton.addEventListener("click", () => {
                NerdIconsSearch.value = "";
                this.filterNerdIcons("");
            }, false);

            ReloadCurrentThemeButton.addEventListener("click", () => {
                this.selectTheme();
            }, false);
        }

        /**
         * Handle nerd icons search.
         *
         * @param {Object} aE - Event that triggered the function.
         */
        nerdIconsSearchEventHandler(aE) {
            let value = aE.target.value;
            let valueLength = value.length;

            if (valueLength === 0 || valueLength > 2) {
                this.filterNerdIcons(value);
            }
        }

        /**
         * Filter nerd icons.
         *
         * @param {String} aTerm - Search term.
         */
        doFilterNerdIcons(aTerm) {
            try {
                if (!NerdIcons) {
                    NerdIconsGrid = document.getElementById("bstg-nerd-icons-grid");
                    NerdIcons = NerdIconsGrid.getElementsByClassName("bstg-icon-class");
                }
            } finally {
                Array.prototype.filter.call(NerdIcons, function(aEl) {
                    aEl.parentNode.classList.toggle("d-none", aEl.textContent.toLowerCase().indexOf(aTerm) === -1);
                });
            }
        }

        /**
         * Handle navigation pills.
         *
         * @param {String}  aNav      - An identifier of the element that contains the navigation tabs.
         * @param {String}  aTabId    - The ID of a Bootstrap tab bound to its tabpanel.
         * @param {Boolean} aPopulate - Whether to populate a tabpanel.
         */
        handleNavigationPills(aNav, aTabId, aPopulate = true) {
            if (aPopulate) {
                this.populateTabPanel(aTabId);
            }

            this.savePrefToStorage("pref_selected_" + aNav, aTabId);
        }

        /**
         * Populate tabpanel.
         *
         * @param {String} aTabId - The ID of a Bootstrap tab bound to its tabpanel.
         */
        populateTabPanel(aTabId) {
            let tabpanel = document.getElementById(aTabId + "panel");

            if (tabpanel && !tabpanel.innerHTML.trim()) {
                $.ajax({
                    method: "POST",
                    url: "/populate_tabpanel",
                    cache: false,
                    data: {
                        tab_id: aTabId
                    }
                }).done((aResponse) => {
                    tabpanel.innerHTML = aResponse;
                }).always((aXHR, aStatusText) => { // jshint ignore:line
                    this.attachSourceButtons(tabpanel);
                    this.initializeComponents(tabpanel);
                }).fail((aXHR, aStatusText, aError) => {
                    console.error(aStatusText);
                    console.error(aError);
                });
            }
        }

        /**
         * Initialize Bootstrap components.
         *
         * @param {Object} a$El           - The element that has the component to initialize.
         * @param {String} aComponentType - The Bootstrap component name.
         * @param {Object} aInitOptions   - Bootstrap component initialization options.
         * @param {Array}  aExtraMethods  - Extra methods to call on a Bootstrap component.
         */
        initBootstrapComponent(a$El, aComponentType, aInitOptions = {}, aExtraMethods = []) {
            if (!a$El.data(aComponentType + "-initialized")) {
                let $el = a$El[aComponentType](aInitOptions);

                for (let i = aExtraMethods.length - 1; i >= 0; i--) {
                    $el[aComponentType](aExtraMethods[i]);
                }

                a$El.data(aComponentType + "-initialized", true);
            }
        }

        /**
         * Initialize components.
         *
         * @param {Object} aParent - The element from which to find the components to initialize.
         */
        initializeComponents(aParent) {
            let $popovers = aParent ?
                $(aParent).find('[data-toggle="popover"]') :
                $('[data-toggle="popover"]');
            $popovers.each((aIndex, aEl) => {
                this.initBootstrapComponent($(aEl), "popover");
            });

            let $tooltips = aParent ?
                $(aParent).find('[data-toggle="tooltip"]') :
                $('[data-toggle="tooltip"]');
            $tooltips.add($('[data-tt="tooltip"]'));
            $tooltips.each((aIndex, aEl) => {
                this.initBootstrapComponent($(aEl), "tooltip");
            });

            let $toasts = aParent ?
                $(aParent).find(".toast") :
                $(".toast");
            $toasts.each((aIndex, aEl) => {
                this.initBootstrapComponent($(aEl), "toast", {
                    autohide: false
                }, ["show"]);
            });

            // Fetch all forms.
            let forms = document.getElementsByTagName("form");

            // Loop over them to handle validation and prevent submission.
            Array.prototype.filter.call(forms, function(aForm) {
                aForm.addEventListener("submit", function(aE) {
                    // Handle validation.
                    if (aForm.classList.contains("needs-validation")) {
                        if (!aForm.checkValidity()) {
                            aE.preventDefault();
                            aE.stopPropagation();
                        }
                        aForm.classList.add("was-validated");
                    }

                    // Prevent submission.
                    aE.preventDefault();
                    aE.stopPropagation();
                }, false);
            });

            // NOTE: Specific sections triggers. ¬¬
            if (aParent) {
                let parentID = aParent.id;

                if (/-modal-tabpanel/.test(parentID)) {
                    // NOTE: Workaround for Firefox in Linux. ¬¬
                    aParent.querySelectorAll(".modal").forEach((aModal) => {
                        $(aModal).on("keyup", (aE) => {
                            if (aE.keyCode === 27) { // Escape key.
                                $(aE.target).modal("hide");
                            }
                        });
                    });

                    // Example modal with ID exampleModalPopovers.
                    $(".tooltip-test").tooltip();
                    $(".popover-test").popover();

                    // Modal relatedTarget demo
                    $("#exampleModal").on("show.bs.modal", function(event) {
                        var $button = $(event.relatedTarget); // Button that triggered the modal
                        var recipient = $button.data("whatever"); // Extract info from data-* attributes
                        // If necessary, you could initiate an AJAX request here (and then do the updating in a callback).
                        // Update the modal's content. We'll use jQuery here, but you could use a data binding library or other methods instead.
                        var $modal = $(this);
                        $modal.find(".modal-title").text("New message to " + recipient);
                        $modal.find(".modal-body input").val(recipient);
                    });
                } else if (/-forms-tabpanel/.test(parentID)) {
                    // Indeterminate checkbox example.
                    $('.bstg-example-indeterminate [type="checkbox"]').prop("indeterminate", true);
                } else if (/-progress-tabpanel/.test(parentID)) {
                    // Activate animated progress bar.
                    $(".bstg-toggle-animated-progress").on("click", function() {
                        $(this).siblings(".progress").find(".progress-bar-striped").toggleClass("progress-bar-animated");
                    });
                }

                if (typeof hljs === "object") {
                    aParent.querySelectorAll("pre code").forEach((block) => {
                        hljs.highlightBlock(block);
                    });
                }
            }
        }

        /**
         * Set active sections.
         *
         * This function dynamically sets the content of each page section on initial page load.
         */
        setActiveSections() {
            let selectedSectionID = this.pref_selected_section ?
                this.pref_selected_section :
                $sectionSelector.find('a[data-toggle="pill"]')[0].id;

            $("#" + selectedSectionID).tab("show");

            if (selectedSectionID === NERD_ICONS_TAB_ID) {
                this.populateTabPanel(selectedSectionID);
            }

            let selectedContentID = this.pref_selected_content ?
                this.pref_selected_content :
                $contentSelector.find('a[data-toggle="pill"]')[0].id;
            this.populateTabPanel(selectedContentID);
            $("#" + selectedContentID).tab("show");

            let selectedComponentID = this.pref_selected_component ?
                this.pref_selected_component :
                $componentsSelector.find('a[data-toggle="pill"]')[0].id;
            this.populateTabPanel(selectedComponentID);
            $("#" + selectedComponentID).tab("show");

            let selectedUtilityID = this.pref_selected_utility ?
                this.pref_selected_utility :
                $utilitiesSelector.find('a[data-toggle="pill"]')[0].id;

            this.populateTabPanel(selectedUtilityID);
            $("#" + selectedUtilityID).tab("show");
        }

        /**
         * Attach the view source code button.
         *
         * @param {Object} aParent - The element inside which to find all the example blocks.
         */
        attachSourceButtons(aParent) {
            let $examples = aParent ? $(aParent).find(".bstg-example") : $(".bstg-example");
            $examples.each(function() {
                let $example = $(this);

                if (!$example.data("has-source-button")) {
                    $example.append($(SOURCE_BUTTON_HTML));
                    $example.data("has-source-button", true);
                }
            });
        }

        /**
         * Clean the source code of examples.
         *
         * @param {String} aHtml - The string to clean.
         *
         * @return {String} The cleaned string.
         */
        cleanSource(aHtml) {
            aHtml = aHtml.replace(/×/g, "&times;")
                .replace(/«/g, "&laquo;")
                .replace(/»/g, "&raquo;")
                .replace(/←/g, "&larr;")
                .replace(/→/g, "&rarr;");

            let lines = aHtml.split(/\n/);

            lines.shift(); // Remove first blank line.
            lines.splice(-1, 1); // Remove source code button.

            let indentSize = lines[0].length - lines[0].trim().length,
                re = new RegExp(" {" + indentSize + "}");

            lines = lines.map(function(line) {
                if (line.match(re)) {
                    line = line.substring(indentSize);
                }

                return line;
            });

            lines = lines.join("\n");

            return lines;
        }

        /**
         * Decode a string into HTML.
         *
         * This is mainly used to unescape a string that it's stored inside an HTML element's attribute.
         *
         * @param {String} aInput - The string to parse.
         *
         * @return {String} The parsed string.
         */
        htmlDecode(aInput) {
            let doc = new DOMParser().parseFromString(aInput, "text/html");
            return doc.documentElement.innerHTML;
        }

        /**
         * Set theme name and description to various elements on the page.
         *
         * @param {Object} aEl - The menu item that triggered the function.
         */
        setThemeData(aEl) {
            $metaTitle.text("Preview: " + aEl.textContent);
            $metaThemeName.text(aEl.textContent);
            $themeDescriptionTab.text(aEl.textContent);
            $themeDescriptionTab.attr("title", aEl.textContent);
            $metaThemeDescription.html(this.htmlDecode(aEl.getAttribute("data-description")));
        }

        /**
         * Select a Bootstrap theme.
         *
         * @param {Object} aEl - The menu item that triggered the function. Or null to reload the current theme.
         */
        selectTheme(aEl = null) {
            let scroll = window.scrollY;

            $body.animate({
                opacity: "0"
            }, {
                duration: 400,
                done: () => {
                    let promise = new Promise((aResolve) => {
                        let styleshetHref;
                        MainStylesheet.onload = aResolve;

                        if (aEl) {
                            aEl.classList.add("active");
                            this.setThemeData(aEl);
                            this.savePrefToStorage("pref_main_stylesheet", aEl.getAttribute("href"));
                            this.populateExtraExamples(aEl.getAttribute("href"));
                            styleshetHref = aEl.getAttribute("href");
                        } else {
                            styleshetHref = MainStylesheet.getAttribute("href").split("?")[0];
                        }

                        // NOTE: Add date because setting twice the same href will not trigger onload.
                        MainStylesheet.setAttribute("href", styleshetHref + "?" + new Date().getTime());
                        this._onMainStylesheetLoadTimer = setTimeout(function() {
                            aResolve();
                        }, 2000);
                    });

                    promise.then(() => {
                        MainStylesheet.onload = null;
                        clearTimeout(this._onMainStylesheetLoadTimer);
                        $body.animate({
                            opacity: "1"
                        }, {
                            duration: 400,
                            done: () => {
                                if (scroll > 0) {
                                    $("html, body").animate({
                                        scrollTop: scroll
                                    }, 400);
                                    BSTG_Utils.delayedToggleBackToTopButtonVisibility();
                                }
                            }
                        });
                    });
                }
            });
        }

        /**
         * Populate extra examples section.
         *
         * @param {String} aThemeHref - The href attribute of a theme selector menu item.
         */
        populateExtraExamples(aThemeHref) {
            $.ajax({
                method: "POST",
                url: "/extra_examples",
                cache: false,
                data: {
                    theme_href: aThemeHref
                }
            }).done((aResponse) => {
                ExtraExamplesContainer.innerHTML = "<h1>Extra examples</h1>\n" + aResponse;
            }).always((aXHR, aStatusText) => { // jshint ignore:line
                this.attachSourceButtons(ExtraExamplesContainer);
                this.initializeComponents(ExtraExamplesContainer);
            }).fail((aXHR, aStatusText, aError) => {
                console.error(aStatusText);
                console.error(aError);
            });
        }

        /**
         * Reset scroll position.
         */
        resetScrollPosition() {
            document.documentElement.scrollTop = 0;
        }

        /**
         * Clear all preferences stored into window.localStorage.
         */
        clearPrefsInStorage() {
            if (!this._winStorage) {
                return;
            }

            this._winStorage.clear();
        }

        /**
         * Save preference to window.localStorage.
         *
         * @param {String} aKey   - The window.localStorage key to save the preference into.
         * @param {String} aValue - The value associated to aKey.
         *
         * @return {String} description
         */
        savePrefToStorage(aKey, aValue) {
            if (!this._winStorage) {
                return;
            }

            this._winStorage.setItem("BSTG_" + aKey, aValue);
        }

        /**
         * Get preferences from window.localStorage.
         *
         * @return {Object} Preferences stored in window.localStorage or the defaults if window.localStorage is not available.
         */
        getPrefsFromStorage() {
            if (!this._winStorage) {
                return DEFAULT_PREFS;
            }

            return {
                pref_main_stylesheet: this._winStorage.getItem("BSTG_pref_main_stylesheet") ||
                    DEFAULT_PREFS.pref_main_stylesheet,
                pref_selected_section: this._winStorage.getItem("BSTG_pref_selected_section") ||
                    DEFAULT_PREFS.pref_selected_section,
                pref_selected_content: this._winStorage.getItem("BSTG_pref_selected_content") ||
                    DEFAULT_PREFS.pref_selected_content,
                pref_selected_component: this._winStorage.getItem("BSTG_pref_selected_component") ||
                    DEFAULT_PREFS.pref_selected_component,
                pref_selected_utility: this._winStorage.getItem("BSTG_pref_selected_utility") ||
                    DEFAULT_PREFS.pref_selected_utility
            };
        }
    }

    if (typeof BSTG_Debugger === "object") {
        BSTG_Debugger.wrapObjectMethods({
            BSTG_MainClass: BSTG_MainClass
        });
    }

    BSTG_Main = new BSTG_MainClass();
})();

/* global BSTG_Utils,
          BSTG_Debugger
 */
