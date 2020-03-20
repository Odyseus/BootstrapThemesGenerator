(function() {
    "use strict"; // jshint ignore:line

    let BSTG_Main = null;
    let NerdIcons = null;
    let NerdIconsGrid = null;
    const SEARCH_INPUT_EVENTS = [
        "keyup",
        "search",
        "input",
        "paste",
        "cut",
        "keypress"
    ];
    const SIDEBAR_CLASSES = [
        "col-lg-2",
        "col-md-3"
    ];
    const TABPANEL_CLASSES = [
        "offset-0",
        "offset-lg-2",
        "offset-md-3",
        "offset-sm-0",
        "col-12",
        "col-lg-10",
        "col-md-9",
    ];

    const NERD_ICONS_TAB_ID = "bstg-extras-nerd-icons-tab";
    const SOURCE_BUTTON_HTML = '<button class="bstg-view-source-button btn btn-primary btn-sm" role="button" \
    data-toggle="tooltip" tabindex="0" title="View source code">&lt; &gt;</button>';
    const DEFAULT_PREFS = {
        pref_main_stylesheet: "_static_bootstrap/css/bootstrap.min.css",
        pref_selected_section: "",
        pref_selected_content: "",
        pref_selected_component: "",
        pref_selected_utility: "",
        pref_sidebar_visible: "true"
    };
    const $body = $("body");
    const $componentsSelector = $("#bstg-components-selector");
    const $contentSelector = $("#bstg-content-selector");
    const $sectionSelector = $("#bstg-section-selector");
    const $sourceModal = $("#bstg-source-modal");
    const $sourceModalCodeBlock = $sourceModal.find("pre code");
    const $utilitiesSelector = $("#bstg-utilities-selector");
    const ExtraExamplesContainer = document.getElementById("bstg-extra-examples");
    const MainStylesheet = document.getElementById("bstg-main-stylesheet");
    const MetaThemeDescription = document.getElementById("bstg-meta-theme-description");
    const MetaThemeName = document.getElementById("bstg-meta-theme-name");
    const MetaTitle = document.getElementById("bstg-meta-title");
    const Navbar = document.getElementById("bstg-navbar");
    const NerdIconsSearch = document.getElementById("bstg-nerd-icons-search");
    const NerdIconsSearchClearButton = document.getElementById("bstg-nerd-icons-search-button");
    const NerdIconsSearchForm = document.getElementById("bstg-nerd-icons-search-form");
    const NerdIconsTab = document.getElementById("bstg-extras-nerd-icons-tab");
    const ReloadCurrentThemeButton = document.getElementById("bstg-reload-current-theme");
    const SidebarToggler = document.getElementById("bstg-sidebar-toggler");
    const ThemeDescriptionTab = document.getElementById("bstg-theme-description-tab");
    const ThemeSelector = document.getElementById("bstg-theme-selector");
    const DelayedShowBody = Ody_Utils.debounce(() => {
        $body.animate({
            opacity: "1"
        }, {
            duration: 400
        });
    });
    const SidebarsVisible = (aSidebar) => aSidebar.classList.contains("d-none");
    const NavbarOffsetElements = new Map(Array.prototype.slice.call(
        document.getElementsByClassName("bstg-needs-navbar-offset")).map((aEl) => [aEl, {}]));
    const Sidebars = Array.prototype.slice.call(document.getElementsByClassName("bstg-sidebar"));
    const TabPanels = Array.prototype.slice.call(document.getElementsByClassName("bstg-sidebar-companion"));

    class BSTG_MainClass {
        constructor() {
            this._winStorage = window.localStorage;
            this._onMainStylesheetLoadTimer = null;
            this.delayedFilterNerdIcons = Ody_Utils.debounce(this.doFilterNerdIcons);
            this.delayedSetElementsOffset = Ody_Utils.debounce(this.doSetElementsOffset, 50);

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
                this.toggleSidebars(this.pref_sidebar_visible);
                this.setActiveSections();
                this.attachSourceButtons(document);
                this.initializeComponents(document);
                Ody_Utils.delayedToggleBackToTopButtonVisibility();
                this.doSetElementsOffset();
                DelayedShowBody();
            });
        }

        doSetElementsOffset() {
            Ody_Utils.setElementsOffset(Navbar, NavbarOffsetElements);
        }

        toggleSidebars(aShow = null) {
            // All this trouble is so I don't have to use hardcoded sizes/margins/paddings nor
            // idiotic animations. I just let all elements fit the available space.
            let showSidebar = aShow === null ? Sidebars.every(SidebarsVisible) : aShow;

            if (showSidebar) { // Show sidebar.
                Sidebars.forEach((aSidebar) => {
                    aSidebar.classList.remove("d-none");
                    aSidebar.classList.add(...SIDEBAR_CLASSES);
                });
                TabPanels.forEach((aTabPanel) => {
                    aTabPanel.classList.add(...TABPANEL_CLASSES);
                });
            } else { // Hide sidebar.
                Sidebars.forEach((aSidebar) => {
                    aSidebar.classList.add("d-none");
                    aSidebar.classList.remove(...SIDEBAR_CLASSES);
                });
                TabPanels.forEach((aTabPanel) => {
                    aTabPanel.classList.remove(...TABPANEL_CLASSES);
                    aTabPanel.classList.add("col-12");
                    aTabPanel.classList.add("offset-0");
                });
            }

            this.savePrefToStorage("pref_sidebar_visible", showSidebar);
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
                ThemeSelector.insertAdjacentHTML("beforeend", aResponse);
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
            let menuItems = ThemeSelector.querySelectorAll(".dropdown-item");
            for (let m = menuItems.length - 1; m >= 0; m--) {
                let mI = menuItems[m];
                switch (aAction) {
                    case "set_inactive": // When clicking a menu item.
                        mI.classList.remove("active");
                        break;
                    case "set_current": // On initial page load.
                        if (mI.getAttribute("href") === this.pref_main_stylesheet) {
                            this.setThemeData(mI);
                            mI.classList.add("active");
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
                this.toggleSidebars(true);
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

            SidebarToggler.addEventListener("click", (aE) => {
                aE.preventDefault();
                this.toggleSidebars();
            }, false);

            // NOTE: Target the anchors with "empty links" and source buttons on body click
            // so I can target anchors and buttons dynamically inserted into the HTML.
            $body[0].addEventListener("click", (aE) => {
                let target = aE.target;

                switch (target.tagName.toLowerCase()) {
                    case "button":
                        if (target.classList.contains("bstg-view-source-button")) {
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

            for (let i = SEARCH_INPUT_EVENTS.length - 1; i >= 0; i--) {
                NerdIconsSearch.addEventListener(SEARCH_INPUT_EVENTS[i],
                    this.nerdIconsSearchEventHandler.bind(this), false);
            }

            NerdIconsSearchClearButton.addEventListener("click", () => {
                this.clearNerdIconsSearchInput(NerdIconsSearch);
            }, false);

            ReloadCurrentThemeButton.addEventListener("click", () => {
                this.selectTheme();
            }, false);

            window.addEventListener("resize", () => {
                this.delayedSetElementsOffset();
            }, false);
        }

        /**
         * Clear search input.
         *
         * @param {Object} aInput - The input element to clear.
         */
        clearNerdIconsSearchInput(aInput) {
            if (aInput) {
                aInput.setAttribute("value", "");
                aInput.value = "";
            }

            this.delayedFilterNerdIcons("");
        }

        /**
         * Handle events triggered by the input search.
         *
         * @param {Object} aE - Event that triggered the function.
         */
        nerdIconsSearchEventHandler(aE) {
            // Prevent form submission.
            if (aE.type === "keypress" && aE.keyCode === 13) {
                aE.preventDefault();
                NerdIconsSearchForm.submit();
                return false;
            }

            switch (aE.type) {
                case "keyup":
                case "search":
                case "input":
                case "paste":
                case "cut":
                    // The best that I could come up with to avoid triggering the doFilter() function
                    // a million times unnecessarily. Which would trigger a million times the function
                    // DataTables.drawCallback(). And which will make the re-draw of the table reset the
                    // current scroll position. A snow ball of little annoyances that become a huge
                    // performance problem.
                    let triggerSearch = aE.type !== "keyup" ||
                        String.fromCharCode(aE.keyCode).match(/(\w|\s)/g) !== null ||
                        // Backspace.  So clearing the search box can trigger a clearSearchInput() (inside the
                        // call to doFilter()).
                        aE.which === 8 ||
                        // Delete.
                        aE.which === 46 ||
                        // Colon. So exact "type searches" can be performed (type:term).
                        aE.which === 16 ||
                        // Ultimately, let the Enter key trigger a search.
                        aE.which === 13;

                    if (aE.which === 27) { // Escape key
                        this.clearNerdIconsSearchInput(aE.target);
                    } else {
                        let value = aE.target.value.trim();
                        let valueLength = value.length;

                        if (triggerSearch && (valueLength === 0 || valueLength > 2)) {
                            this.delayedFilterNerdIcons(value);
                        }
                    }
                    break;
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
                // NOTE: This is ultra-mega-slow on Shitmium based browsers.
                // In Firefox based browsers is practically instantaneous.
                for (let i = NerdIcons.length - 1; i >= 0; i--) {
                    NerdIcons[i].parentNode.classList.toggle("d-none", NerdIcons[i].textContent.indexOf(aTerm) === -1);
                }
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
                        tab_id: aTabId,
                        use_section_template: aTabId !== NERD_ICONS_TAB_ID
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
         * Initialize components.
         *
         * @param {Object} aContainer - The element from which to find the components to initialize.
         */
        initializeComponents(aContainer) {
            $(aContainer.querySelectorAll('[data-toggle="popover"]')).popover();

            $(aContainer.querySelectorAll('[data-toggle="tooltip"]')).tooltip();

            $(aContainer.querySelectorAll(".toast")).toast({
                autohide: false
            }).toast("show");

            // Loop over all forms to handle validation and prevent submission.
            // NOTE: Use of filter instead of for-loop due to "function declaration inside loops"
            // nonsense.
            Array.prototype.filter.call(aContainer.getElementsByTagName("form"), function(aForm) {
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

            // Workaround for Firefox in Linux. ¬¬
            // NOTE: This should go inside attachListeners, but I'm doing it here
            // so I can "kill two birds with one stone".
            // NOTE: Use of filter instead of for-loop due to "function declaration inside loops"
            // nonsense.
            Array.prototype.filter.call(aContainer.querySelectorAll(".modal"), function(aModal) {
                aModal.addEventListener("keyup", (aE) => {
                    if (aE.keyCode === 27) { // Escape key.
                        $(aE.target).modal("hide");
                    }
                }, false);
            });

            // NOTE: Specific sections triggers. ¬¬
            if (aContainer !== document) {
                let containerID = aContainer.id;

                if (containerID.endsWith("-modal-tabpanel")) {
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
                } else if (containerID.endsWith("-forms-tabpanel")) {
                    // Indeterminate checkbox example.
                    $('.bstg-example-indeterminate [type="checkbox"]').prop("indeterminate", true);
                } else if (containerID.endsWith("-progress-tabpanel")) {
                    // Activate animated progress bar.
                    $(".bstg-toggle-animated-progress").on("click", function() {
                        $(this).siblings(".progress").find(".progress-bar-striped").toggleClass("progress-bar-animated");
                    });
                }

                if (typeof hljs === "object") {
                    let blocks = aContainer.querySelectorAll("pre code");
                    for (let b = blocks.length - 1; b >= 0; b--) {
                        hljs.highlightBlock(blocks[b]);
                    }
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
         * @param {Object} aContainer - The element inside which to find all the example blocks.
         */
        attachSourceButtons(aContainer) {
            let examples = aContainer.querySelectorAll(".bstg-example");
            for (let i = examples.length - 1; i >= 0; i--) {
                let example = examples[i];

                if (!example.getAttribute("has-source-button")) {
                    example.insertAdjacentHTML("beforeend", SOURCE_BUTTON_HTML);
                    example.setAttribute("has-source-button", true);
                }
            }
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
            MetaTitle.textContent = "Preview: " + aEl.textContent;
            MetaThemeName.textContent = aEl.textContent;
            ThemeDescriptionTab.textContent = aEl.textContent;
            ThemeDescriptionTab.setAttribute("title", aEl.textContent);
            MetaThemeDescription.innerHTML = this.htmlDecode(aEl.getAttribute("data-description"));
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
                        this.delayedSetElementsOffset();
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
                                    Ody_Utils.delayedToggleBackToTopButtonVisibility();
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
                    DEFAULT_PREFS.pref_selected_utility,
                pref_sidebar_visible: (this._winStorage.getItem("BSTG_pref_sidebar_visible") ||
                    DEFAULT_PREFS.pref_sidebar_visible) === "true"
            };
        }
    }

    if (typeof Ody_Debugger === "object") {
        Ody_Debugger.wrapObjectMethods({
            BSTG_MainClass: BSTG_MainClass
        });
    }

    BSTG_Main = new BSTG_MainClass();
})();

/* global Ody_Utils,
          Ody_Debugger
 */
