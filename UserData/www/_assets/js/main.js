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
    const NAVBAR_BG_CLASSES = [
        "bg-dark",
        "bg-light",
        "bg-primary",
        "bg-secondary",
        "bg-danger",
        "bg-info",
        "bg-success",
        "bg-warning"
    ];
    const NAVBAR_FG_CLASSES = [
        "navbar-dark",
        "navbar-light"
    ];
    const SIDEBAR_BG_CLASSES = [
        "bg-dark",
        "bg-light",
        "bg-primary",
        "bg-secondary"
    ];
    const TABPANEL_CLASSES = [
        "offset-0",
        "offset-lg-2",
        "offset-md-3",
        "offset-sm-0",
        "col-12",
        "col-lg-10",
        "col-md-9"
    ];

    const NERD_ICONS_TAB_ID = "bstg-extras-nerd-icons-tab";
    const SOURCE_BUTTON_HTML = '<button class="bstg-view-source-button btn btn-primary btn-sm nf nf-fa-code" type="button" \
    data-bs-toggle="tooltip" data-bs-placement="left" tabindex="0" title="View source code"></button>';
    const DEFAULT_PREFS = {
        main_stylesheet: "_static_bootstrap/css/bootstrap.min.css",
        selected_section: "",
        selected_content: "",
        selected_component: "",
        selected_utility: "",
        selected_forms: "",
        sidebar_visible: true,
        navbar_background_color: "bg-primary",
        navbar_foreground_color: "navbar-dark",
        sidebar_background_color: "none"
    };
    const Ody_Prefs = new Ody_PrefsClass(DEFAULT_PREFS);
    const SectionSelectorTabs = document.querySelectorAll('#bstg-section-selector a[data-bs-toggle="pill"]');
    const ComponentsSelectorTabs = document.querySelectorAll('#bstg-components-selector a[data-bs-toggle="pill"]');
    const ContentSelectorTabs = document.querySelectorAll('#bstg-content-selector a[data-bs-toggle="pill"]');
    const UtilitiesSelectorTabs = document.querySelectorAll('#bstg-utilities-selector a[data-bs-toggle="pill"]');
    const FormsSelectorTabs = document.querySelectorAll('#bstg-forms-selector a[data-bs-toggle="pill"]');
    const PrefHandlers = document.getElementsByClassName("bstg-pref-handler");
    const SourceModalBS = bootstrap.Modal.getOrCreateInstance(document.getElementById("bstg-source-modal"));
    const PageSettingsOffcanvas = document.getElementById("bstg-page-settings-offcanvas");
    const PageSettingsOffcanvasButton = document.getElementById("bstg-page-settings-offcanvas-button");
    const SourceModalCodeBlock = document.getElementById("bstg-source-modal-code-block");
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
    const SidebarsVisible = (aSidebar) => aSidebar.classList.contains("d-none");
    const NavbarOffsetElements = new Map(
        [...document.getElementsByClassName("bstg-needs-navbar-offset")].map((aEl) => [aEl, {}]));
    const Sidebars = [...document.getElementsByClassName("bstg-sidebar")];
    const TabPanels = document.getElementsByClassName("bstg-sidebar-companion");

    class BSTG_MainClass {
        constructor() {
            this._onMainStylesheetLoadTimer = null;
            this.delayedFilterNerdIcons = Ody_Core.debounce(this.doFilterNerdIcons);
            this.delayedSetElementsOffset = Ody_Core.debounce(this.doSetElementsOffset, 50);

            this.buildCustomThemeSelector();
            this.assignCustomClasses();
            this.attachListeners();

            let promise = new Promise((aResolve) => {
                // F*CK EVERY SINGLE MEDIOCRE WEB DEVELOPER (FORGIVE THE REDUNDANCY)!!!
                // onload doesn't f*cking trigger in Shitmium.
                // So, implementing the f*cking promises was a total waste of my f*cking time!!!
                // F*ck you very much, web developers!!!
                MainStylesheet.onload = aResolve;

                // NOTE: The call to check_theme in the server side is to make sure that the
                // currently stored stylesheet at Ody_Prefs.main_stylesheet is a path to an existent
                // stylesheet. If the stylesheet weren't to exist (e.g. a recently removed custom theme),
                // the page would load without a stylesheet and it would be imposible to change themes.
                const formData = new FormData();
                formData.append("stylesheet", Ody_Prefs.main_stylesheet);
                fetch("/check_theme", {
                        method: "POST",
                        cache: "no-cache",
                        body: formData
                    })
                    .then((aResponse) => {
                        return aResponse.text();
                    })
                    .then((aStylesheetExists) => {
                        if (!Number(aStylesheetExists) &&
                            Ody_Prefs.main_stylesheet !== DEFAULT_PREFS.main_stylesheet) {
                            Ody_Prefs.main_stylesheet = DEFAULT_PREFS.main_stylesheet;

                            const toast = bootstrap.Toast.getOrCreateInstance(
                                document.getElementById("missing-theme-toast")
                            );
                            toast && toast.show();
                        }

                        this.populateExtraExamples(Ody_Prefs.main_stylesheet);
                        // NOTE: Add date because setting twice the same href will not trigger onload.
                        // On the other hand, this will never use a cached stylesheet (FFS). ¬¬
                        MainStylesheet.setAttribute("href", Ody_Prefs.main_stylesheet + "?" + new Date().getTime());
                        // NOTE: If aResolve isn't called by onload, call it after 2 seconds. ¬¬
                        // Moving the f*ck on!!!
                        this._onMainStylesheetLoadTimer = setTimeout(function() {
                            aResolve();
                        }, 2000);
                    })
                    .catch(aError => console.error(aError));
            });

            promise.then(() => {
                MainStylesheet.onload = null;
                clearTimeout(this._onMainStylesheetLoadTimer);
                this.toggleSidebars(Ody_Prefs.sidebar_visible);
                this.setActiveSections();
                this.attachSourceButtons(document);
                this.initializeComponents(document);
                Ody_Core.delayedToggleBackToTopButtonVisibility();
                this.doSetElementsOffset();
                this.toggleBodyVisibility(true);
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
                Ody_Core.arrayEach(Sidebars, (aSidebar) => {
                    aSidebar.classList.remove("d-none");
                    aSidebar.classList.add(...SIDEBAR_CLASSES);
                });
                Ody_Core.arrayEach(TabPanels, (aTabPanel) => {
                    aTabPanel.classList.add(...TABPANEL_CLASSES);
                });
            } else { // Hide sidebar.
                Ody_Core.arrayEach(Sidebars, (aSidebar) => {
                    aSidebar.classList.add("d-none");
                    aSidebar.classList.remove(...SIDEBAR_CLASSES);
                });
                Ody_Core.arrayEach(TabPanels, (aTabPanel) => {
                    aTabPanel.classList.remove(...TABPANEL_CLASSES);
                    aTabPanel.classList.add("col-12");
                    aTabPanel.classList.add("offset-0");
                });
            }

            Ody_Prefs.sidebar_visible = showSidebar;
        }

        /**
         * Build custom theme selectors menu items.
         */
        buildCustomThemeSelector() {
            fetch("/build_theme_selector", {
                    method: "POST",
                    cache: "no-cache"
                })
                .then((aResponse) => {
                    return aResponse.text();
                })
                .then((aData) => {
                    ThemeSelector.insertAdjacentHTML("beforeend", aData);
                    this.iterateThemeSelectorsItems("set_current");
                })
                .catch(aError => console.error(aError));
        }

        assignCustomClasses() {
            Ody_Core.toggleElementsClasses(
                "#bstg-navbar",
                [...NAVBAR_BG_CLASSES, ...NAVBAR_FG_CLASSES],
                [Ody_Prefs.navbar_background_color, Ody_Prefs.navbar_foreground_color]
            );
            Ody_Core.toggleElementsClasses(
                ".bstg-sidebar",
                SIDEBAR_BG_CLASSES,
                [String(Ody_Prefs.sidebar_background_color)]
            );
        }

        /**
         * Iterate theme selector menu items.
         *
         * @param {String} aAction - Action to perform.
         */
        iterateThemeSelectorsItems(aAction) {
            Ody_Core.arrayEach(ThemeSelector.getElementsByClassName("dropdown-item"), (aMI) => {
                switch (aAction) {
                    case "set_inactive": // When clicking a menu item.
                        aMI.classList.remove("active");
                        break;
                    case "set_current": // On initial page load.
                        if (aMI.getAttribute("href") === Ody_Prefs.main_stylesheet) {
                            this.setThemeData(aMI);
                            aMI.classList.add("active");
                        }
                        break;
                }
            });
        }

        /**
         * Attach listeners to DOM elements.
         */
        attachListeners() {
            Ody_Core.arrayEach(SectionSelectorTabs, (aEl) => {
                aEl.addEventListener("show.bs.tab", (aE) => {
                    this.handleNavigationPills("section", aE.target.id, aE.target === NerdIconsTab);
                    NerdIconsSearchForm.classList.toggle("d-none", aE.target !== NerdIconsTab);
                });
                aEl.addEventListener("shown.bs.tab", () => {
                    this.toggleSidebars(true);
                    this.resetScrollPosition();
                });
            });
            Ody_Core.arrayEach(ComponentsSelectorTabs, (aEl) => {
                aEl.addEventListener("show.bs.tab", (aE) => {
                    this.handleNavigationPills("component", aE.target.id);
                });
                aEl.addEventListener("shown.bs.tab", () => {
                    this.resetScrollPosition();
                });
            });
            Ody_Core.arrayEach(ContentSelectorTabs, (aEl) => {
                aEl.addEventListener("show.bs.tab", (aE) => {
                    this.handleNavigationPills("content", aE.target.id);
                });
                aEl.addEventListener("shown.bs.tab", () => {
                    this.resetScrollPosition();
                });
            });
            Ody_Core.arrayEach(UtilitiesSelectorTabs, (aEl) => {
                aEl.addEventListener("show.bs.tab", (aE) => {
                    this.handleNavigationPills("utility", aE.target.id);
                });
                aEl.addEventListener("shown.bs.tab", () => {
                    this.resetScrollPosition();
                });
            });
            Ody_Core.arrayEach(FormsSelectorTabs, (aEl) => {
                aEl.addEventListener("show.bs.tab", (aE) => {
                    this.handleNavigationPills("forms", aE.target.id);
                });
                aEl.addEventListener("shown.bs.tab", () => {
                    this.resetScrollPosition();
                });
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
            document.body.addEventListener("click", (aE) => {
                let target = aE.target;

                switch (target.tagName.toLowerCase()) {
                    case "button":
                        if (target.classList.contains("bstg-view-source-button")) {
                            aE.preventDefault();

                            SourceModalCodeBlock.textContent = this.cleanSource(target.parentNode.innerHTML);

                            if (typeof hljs === "object") {
                                hljs.configure({
                                    languages: ["html"]
                                });

                                hljs.highlightElement(SourceModalCodeBlock);
                            }

                            SourceModalBS && SourceModalBS.show();
                        }
                        break;
                }
            });

            Ody_Core.arrayEach(SEARCH_INPUT_EVENTS, (aEventName) => {
                NerdIconsSearch.addEventListener(aEventName, this.nerdIconsSearchEventHandler.bind(this), false);
            });

            NerdIconsSearchClearButton.addEventListener("click", () => {
                this.clearNerdIconsSearchInput(NerdIconsSearch);
            }, false);

            ReloadCurrentThemeButton.addEventListener("click", (aE) => {
                this.selectTheme();
                aE.preventDefault();
            }, false);

            window.addEventListener("resize", () => {
                this.delayedSetElementsOffset();
            }, false);

            Ody_Core.arrayEach(PrefHandlers, (aEl) => {
                switch (aEl.tagName.toLowerCase()) {
                    case "select":
                        aEl.addEventListener("change", this.handlePreferences.bind(this));
                        break;
                }
            });

            PageSettingsOffcanvas.addEventListener("show.bs.offcanvas", () => {
                Ody_Core.arrayEach(PrefHandlers, (aEl) => {
                    const pref = aEl.getAttribute("data-pref");
                    aEl.value = Ody_Prefs[pref];
                });
            });
            PageSettingsOffcanvasButton.addEventListener("click", () => {
                const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(PageSettingsOffcanvas);
                offcanvas && offcanvas.show();
            });
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
                Ody_Core.arrayEach(NerdIcons, (aEl) => {
                    aEl.parentNode.classList.toggle("d-none", aEl.textContent.indexOf(aTerm) === -1);
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

            Ody_Prefs["selected_" + aNav] = aTabId;
        }

        /**
         * Populate tabpanel.
         *
         * @param {String} aTabId - The ID of a Bootstrap tab bound to its tabpanel.
         */
        populateTabPanel(aTabId) {
            let tabpanel = document.getElementById(aTabId + "panel");

            if (tabpanel && !tabpanel.innerHTML.trim()) {
                const formData = new FormData();
                formData.append("tab_id", aTabId);
                formData.append("use_section_template", aTabId !== NERD_ICONS_TAB_ID);
                fetch("/populate_tabpanel", {
                        method: "POST",
                        cache: "no-cache",
                        body: formData
                    })
                    .then((aResponse) => {
                        return aResponse.text();
                    })
                    .then((aData) => {
                        tabpanel.innerHTML = aData;
                        this.attachSourceButtons(tabpanel);
                        this.initializeComponents(tabpanel);
                    })
                    .catch(aError => console.error(aError));
            }
        }

        /**
         * Initialize components.
         *
         * @param {Object} aContainer - The element from which to find the components to initialize.
         */
        initializeComponents(aContainer) {
            // NOTE: Initialize popovers and tooltips whether they are examples of not.
            Ody_Core.arrayEach(aContainer.querySelectorAll('[data-bs-toggle="popover"]'),
                (aEl) => {
                    bootstrap.Popover.getOrCreateInstance(aEl);
                });
            Ody_Core.arrayEach(aContainer.querySelectorAll('[data-bs-toggle="tooltip"]'),
                (aEl) => {
                    bootstrap.Tooltip.getOrCreateInstance(aEl);
                });

            // NOTE: Initialize toasts only if they are examples.
            Ody_Core.arrayEach(aContainer.querySelectorAll(".bstg-example .toast"),
                (aEl) => {
                    const toast = bootstrap.Toast.getOrCreateInstance(aEl, {
                        autohide: false
                    });

                    toast && toast.show();
                });

            // Loop over all forms to handle validation and prevent submission.
            Ody_Core.arrayEach(aContainer.getElementsByTagName("form"), (aForm) => {
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
            Ody_Core.arrayEach(aContainer.getElementsByClassName("modal"), (aModal) => {
                aModal.addEventListener("keyup", function(aE) {
                    if (aE.keyCode === 27) { // Escape key.
                        const modal = bootstrap.Modal.getOrCreateInstance(aE.target);
                        modal && modal.hide();
                    }
                }, false);
            });

            // NOTE: Specific sections triggers. ¬¬
            if (aContainer !== document) {
                let containerID = aContainer.id;

                if (containerID.endsWith("-alerts-tabpanel")) {
                    const alertPlaceholder = document.getElementById("liveAlertPlaceholder");
                    const alertTrigger = document.getElementById("liveAlertBtn");

                    if (alertTrigger) {
                        alertTrigger.addEventListener("click", function() {
                            const wrapper = document.createElement("div");
                            wrapper.classList.add("alert", "alert-success", "alert-dismissible");
                            wrapper.setAttribute("role", "alert");
                            wrapper.innerHTML = `
Nice, you triggered this alert message!
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
`;

                            alertPlaceholder.append(wrapper);
                        });
                    }
                } else if (containerID.endsWith("-checks-radios-tabpanel")) {
                    Ody_Core.arrayEach(aContainer.querySelectorAll('.bstg-example-indeterminate [type="checkbox"]'),
                        (checkbox) => {
                            checkbox.indeterminate = true;
                        });
                } else if (containerID.endsWith("-toasts-tabpanel")) {
                    const toastPlacement = document.getElementById("toastPlacement");

                    if (toastPlacement) {
                        document.getElementById("selectToastPlacement").addEventListener("change", (aE) => {
                            if (!toastPlacement.dataset.originalClass) {
                                toastPlacement.dataset.originalClass = toastPlacement.className;
                            }

                            toastPlacement.className = toastPlacement.dataset.originalClass + " " + aE.target.value;
                        });
                    }

                    const toastTrigger = document.getElementById("liveToastBtn");
                    const toastLiveExample = document.getElementById("liveToast");

                    if (toastTrigger) {
                        toastTrigger.addEventListener("click", () => {
                            const toast = bootstrap.Toast.getOrCreateInstance(toastLiveExample);
                            toast && toast.show();
                        });
                    }
                } else if (containerID.endsWith("-modal-tabpanel")) {
                    // Example modal with ID exampleModalPopovers.
                    Ody_Core.arrayEach(aContainer.getElementsByClassName("tooltip-test"),
                        (tooltip) => {
                            new bootstrap.Tooltip(tooltip); // jshint ignore:line
                        });

                    Ody_Core.arrayEach(aContainer.getElementsByClassName("popover-test"),
                        (popover) => {
                            new bootstrap.Popover(popover); // jshint ignore:line
                        });

                    // Modal relatedTarget demo
                    const exampleModal = document.getElementById("exampleModal");
                    if (exampleModal) {
                        exampleModal.addEventListener("show.bs.modal", function(event) {
                            // Button that triggered the modal
                            const button = event.relatedTarget;
                            // Extract info from data-bs-* attributes
                            const recipient = button.getAttribute("data-bs-whatever");

                            // Update the modal's content.
                            const modalTitle = exampleModal.querySelector(".modal-title");
                            const modalBodyInput = exampleModal.querySelector(".modal-body input");

                            modalTitle.textContent = "New message to " + recipient;
                            modalBodyInput.value = recipient;
                        });
                    }
                } else if (containerID.endsWith("-scrollspy-tabpanel")) {
                    // NOTE: I'm forced to initialize these components because data attributes alone wouldn't work.
                    Ody_Core.arrayEach(aContainer.querySelectorAll('[data-bs-spy="scroll"]'), (aEl) => {
                        bootstrap.ScrollSpy.getOrCreateInstance(aEl);
                    });
                }

                Ody_Core.highlightAllCodeBlocks(aContainer);
            }
        }

        /**
         * Set active sections.
         *
         * This function dynamically sets the content of each page section on initial page load.
         */
        setActiveSections() {
            const selectedSectionID = Ody_Prefs.selected_section ?
                Ody_Prefs.selected_section :
                SectionSelectorTabs[0].id;
            const selectedSectionTab = bootstrap.Tab.getOrCreateInstance(document.getElementById(selectedSectionID));
            selectedSectionTab && selectedSectionTab.show();

            if (selectedSectionID === NERD_ICONS_TAB_ID) {
                this.populateTabPanel(selectedSectionID);
            }

            const selectedContentID = Ody_Prefs.selected_content ?
                Ody_Prefs.selected_content :
                ContentSelectorTabs[0].id;
            const selectedContentTab = bootstrap.Tab.getOrCreateInstance(document.getElementById(selectedContentID));
            this.populateTabPanel(selectedContentID);
            selectedContentTab && selectedContentTab.show();

            const selectedComponentID = Ody_Prefs.selected_component ?
                Ody_Prefs.selected_component :
                ComponentsSelectorTabs[0].id;
            const selectedComponentTab = bootstrap.Tab.getOrCreateInstance(document.getElementById(selectedComponentID));
            this.populateTabPanel(selectedComponentID);
            selectedComponentTab && selectedComponentTab.show();

            const selectedUtilityID = Ody_Prefs.selected_utility ?
                Ody_Prefs.selected_utility :
                UtilitiesSelectorTabs[0].id;
            const selectedUtilityTab = bootstrap.Tab.getOrCreateInstance(document.getElementById(selectedUtilityID));
            this.populateTabPanel(selectedUtilityID);
            selectedUtilityTab && selectedUtilityTab.show();

            const selectedFormsID = Ody_Prefs.selected_forms ?
                Ody_Prefs.selected_forms :
                FormsSelectorTabs[0].id;
            const selectedFormsTab = bootstrap.Tab.getOrCreateInstance(document.getElementById(selectedFormsID));
            this.populateTabPanel(selectedFormsID);
            selectedFormsTab && selectedFormsTab.show();
        }

        /**
         * Attach the view source code button.
         *
         * @param {Object} aContainer - The element inside which to find all the example blocks.
         */
        attachSourceButtons(aContainer) {
            Ody_Core.arrayEach(aContainer.getElementsByClassName("bstg-example"), (aEl) => {
                if (!aEl.getAttribute("has-source-button")) {
                    aEl.insertAdjacentHTML("beforeend", SOURCE_BUTTON_HTML);
                    aEl.setAttribute("has-source-button", true);
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

            if (!lines.length) {
                return "";
            }

            lines[0].trim() || lines.shift(); // Remove first blank line.
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

        escapeHTML(aStr) {
            return String(aStr)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&apos;");
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
            this.toggleBodyVisibility(false);

            let promise = new Promise((aResolve) => {
                let styleshetHref;
                MainStylesheet.onload = aResolve;

                if (aEl) {
                    aEl.classList.add("active");
                    this.setThemeData(aEl);
                    Ody_Prefs.main_stylesheet = aEl.getAttribute("href");
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

                if (scroll > 0) {
                    document.documentElement.scrollTop = scroll;
                    Ody_Core.delayedToggleBackToTopButtonVisibility();
                }

                this.toggleBodyVisibility(true);
            });
        }

        /**
         * Populate extra examples section.
         *
         * @param {String} aThemeHref - The href attribute of a theme selector menu item.
         */
        populateExtraExamples(aThemeHref) {
            const formData = new FormData();
            formData.append("theme_href", aThemeHref);
            fetch("/extra_examples", {
                    method: "POST",
                    cache: "no-cache",
                    body: formData
                })
                .then((aResponse) => {
                    return aResponse.text();
                })
                .then((aData) => {
                    ExtraExamplesContainer.innerHTML = "<h1>Extra examples</h1>\n" + aData;
                    this.attachSourceButtons(ExtraExamplesContainer);
                    this.initializeComponents(ExtraExamplesContainer);
                })
                .catch(aError => console.error(aError));
        }

        /**
         * Handle elements that handle preferences.
         *
         * @param {Object} aE - Event that triggered the function.
         */
        handlePreferences(aE) {
            let pref = aE.currentTarget.getAttribute("data-pref");
            switch (aE.type) {
                case "change":
                    Ody_Prefs[pref] = aE.currentTarget.value;

                    switch (pref) {
                        case "navbar_background_color":
                            Ody_Core.toggleElementsClasses(
                                "#bstg-navbar",
                                NAVBAR_BG_CLASSES,
                                [aE.currentTarget.value]
                            );
                            break;
                        case "navbar_foreground_color":
                            Ody_Core.toggleElementsClasses(
                                "#bstg-navbar",
                                NAVBAR_FG_CLASSES,
                                [aE.currentTarget.value]
                            );
                            break;
                        case "sidebar_background_color":
                            Ody_Core.toggleElementsClasses(
                                ".bstg-sidebar",
                                SIDEBAR_BG_CLASSES,
                                [aE.currentTarget.value]
                            );
                            break;
                    }
                    break;
            }
        }

        /**
         * Reset scroll position.
         */
        resetScrollPosition() {
            document.documentElement.scrollTop = 0;
        }

        /**
         * Toggle body visibility.
         */
        toggleBodyVisibility(aShow) {
            if (aShow) {
                Ody_Core.toggleElementsClasses(document.body, ["hide"], ["show"]);
            } else {
                Ody_Core.toggleElementsClasses(document.body, ["show"], ["hide"]);
            }
        }
    }

    if ("Ody_Debugger" in window) {
        Ody_Debugger.wrapObjectMethods({
            BSTG_MainClass: BSTG_MainClass
        });
    }

    BSTG_Main = new BSTG_MainClass();
})();

/* global Ody_Utils,
          Ody_Core,
          Ody_Debugger,
          Ody_PrefsClass,
          bootstrap
 */
