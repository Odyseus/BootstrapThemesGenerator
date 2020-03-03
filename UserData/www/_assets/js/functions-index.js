(function() {
    let $sourceModal = $("#source-modal");
    let $sourceModalCodeBlock = $("#source-modal pre code");
    let toTopPageButton = document.getElementById("to-top-of-page");
    let delayedShowBody = debounce(() => {
        $("body")[0].style.opacity = 1;
    });
    let delayedToggleBackToTopButtonVisibility = debounce(
        toggleBackToTopButtonVisibility, 200, true, true);

    $(window).scroll(function() {
        delayedToggleBackToTopButtonVisibility();
    });

    $("#bootswatch-theme-selector .dropdown-item").click((aE) => {
        aE.preventDefault();
        $("#custom-theme-selector .dropdown-item")
            .add($("#bootswatch-theme-selector .dropdown-item"))
            .each(function() {
                $(this).removeClass("active");
            });

        selectTheme(aE.currentTarget);
    });

    // NOTE: Target the anchors with "empty links" and source buttons on body click
    // so I can target anchors and buttons dynamically inserted into the HTML.
    $("body").on("click", ".source-button", function(aE) {
        aE.preventDefault();

        let html = $(this).parent().html();
        html = cleanSource(html);
        $sourceModalCodeBlock.text(html);

        if (typeof hljs === "object") {
            hljs.configure({
                languages: ["html"]
            });

            hljs.highlightBlock($sourceModalCodeBlock[0]);
        }

        $sourceModal.modal();
    }).on("click", 'a[href="#"]', function(aE) {
        aE.preventDefault();
    });

    // NOTE: Workaround for Firefox in Linux. ¬¬
    $sourceModal.on("keyup", (aE) => {
        if (aE.keyCode === 27) { // Escape key.
            $(aE.target).modal("hide");
        }
    });

    function initComponent(a$El, aComponentType) {
        if (!a$El.data(aComponentType + "-initialized")) {
            a$El[aComponentType]();
            a$El.data(aComponentType + "-initialized", true);
        }
    }

    function initializeBootstrapComponents() {
        $('[data-toggle="popover"]').each(function() {
            initComponent($(this), "popover");
        });
        $('[data-toggle="tooltip"]').each(function() {
            initComponent($(this), "tooltip");
        });
    }

    function attachSourceButtons() {
        $(".bs-component").each(function() {
            let $component = $(this);

            if (!$component.data("has-source-button")) {
                let $button = $("<button class='source-button btn btn-primary btn-xs' role='button' tabindex='0'>&lt; &gt;</button>");
                $component.append($button);
                $component.data("has-source-button", true);
            }
        });
    }

    function cleanSource(html) {
        html = html.replace(/×/g, "&times;")
            .replace(/«/g, "&laquo;")
            .replace(/»/g, "&raquo;")
            .replace(/←/g, "&larr;")
            .replace(/→/g, "&rarr;");

        let lines = html.split(/\n/);

        lines.shift();
        lines.splice(-1, 1);

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

    function htmlDecode(aInput) {
        let doc = new DOMParser().parseFromString(aInput, "text/html");
        return doc.documentElement.innerHTML;
    }

    function setTitleAndDescription(aEl) {
        $("title").text("Preview: " + aEl.textContent);
        $("#banner h1").text(aEl.textContent);
        $("#banner span").html(htmlDecode(aEl.getAttribute("data-description")));
    }

    function setInitialTitleAndDescription(a$El) {
        if (a$El.attr("href") === getPrefsFromStorage("main-stylesheet")) {
            setTitleAndDescription(a$El[0]);
            a$El.addClass("active");
        }
    }

    function selectTheme(aEl = null) {
        if (!aEl) {
            return;
        }

        let scroll = $(document).scrollTop();

        aEl.classList.add("active");
        $("body").fadeOut(0);
        $("#main-stylesheet").attr("href", aEl.getAttribute("href"));
        setTitleAndDescription(aEl, aEl.textContent, aEl.getAttribute("data-description") || "");
        savePrefToStorage("main-stylesheet", aEl.getAttribute("href"));
        populateExtraExamples(aEl.getAttribute("href"));

        $("body").delay(500).fadeIn(1000, () => {
            if (scroll > 0) {
                $("html, body").animate({
                    scrollTop: scroll
                }, 400);
                delayedToggleBackToTopButtonVisibility();
            }
        });
    }

    function savePrefToStorage(aKey, aValue) {
        if (!window.localStorage) {
            return;
        }

        window.localStorage.setItem(aKey, aValue);
    }

    function getPrefsFromStorage(aKey) {
        if (!window.localStorage) {
            return "";
        }

        return window.localStorage.getItem(aKey);
    }

    function debounce(aFunc, aDelay = 200, aImmediate = false, aImmediateDelayed = false) {
        let timeout,
            oneOff;

        return function() {
            let ctx = this,
                args = arguments;

            if (aImmediate && !timeout) {
                if (aImmediateDelayed) {
                    oneOff = window.setTimeout(() => {
                        aFunc.apply(ctx, args);
                        window.clearTimeout(oneOff);
                    }, aDelay);
                } else {
                    aFunc.apply(ctx, args);
                }
            }

            window.clearTimeout(timeout);
            timeout = window.setTimeout(() => {
                timeout = null;
                aFunc.apply(ctx, args);
            }, aDelay);
        };
    }

    function toggleBackToTopButtonVisibility() {
        if (toTopPageButton) {
            if (window.scrollY > 100) {
                toTopPageButton.style.display = "block";
            } else {
                toTopPageButton.style.display = "none";
            }
        }
    }

    function smoothScrollToTop() {
        // Forget the browser specific garbage. I don't need the headache.
        if (window.requestAnimationFrame) {
            try {
                let currentScroll = document.documentElement.scrollTop || document.body.scrollTop;
                if (currentScroll > 0) {
                    window.requestAnimationFrame(smoothScrollToTop);
                    window.scrollTo(0, currentScroll - (currentScroll / 5));
                }
            } catch (aErr) {
                console.error(aErr);
                window.scrollTo(0, 0);
            }
        } else {
            window.scrollTo(0, 0);
        }
    }

    function populateExtraExamples(aThemeHref) {
        $.ajax({
            method: "POST",
            url: "/extra_examples",
            cache: false,
            data: {
                theme_href: aThemeHref
            }
        }).done((aResponse) => {
            $("#extra-examples").html(aResponse);
        }).always((aXHR, aStatusText) => { // jshint ignore:line
            attachSourceButtons();
            initializeBootstrapComponents();
        }).fail((aXHR, aStatusText, aError) => {
            console.error(aStatusText);
            console.error(aError);
        });
    }

    toTopPageButton.addEventListener("click", () => {
        smoothScrollToTop();
        return false;
    }, false);

    jQuery(document).ready(() => {
        let storedStyle = getPrefsFromStorage("main-stylesheet");

        if (storedStyle) {
            $("#main-stylesheet").attr("href", storedStyle);
            populateExtraExamples(storedStyle);
        }

        $.ajax({
            method: "POST",
            url: "/build_theme_selector",
            cache: false
        }).done((aResponse) => {
            $("#custom-theme-selector").html(aResponse);
            $("#custom-theme-selector .dropdown-item").click((aE) => {
                aE.preventDefault();
                $("#custom-theme-selector .dropdown-item")
                    .add($("#bootswatch-theme-selector .dropdown-item"))
                    .each(function() {
                        $(this).removeClass("active");
                    });
                selectTheme(aE.currentTarget);
            });
        }).always((aXHR, aStatusText) => { // jshint ignore:line
            $("#custom-theme-selector .dropdown-item")
                .add($("#bootswatch-theme-selector .dropdown-item"))
                .each(function() {
                    setInitialTitleAndDescription($(this));
                });
            delayedShowBody();
            delayedToggleBackToTopButtonVisibility();
            attachSourceButtons();
            initializeBootstrapComponents();
        }).fail((aXHR, aStatusText, aError) => {
            console.error(aStatusText);
            console.error(aError);
        });
    });
})();
