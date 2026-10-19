(() => {
    "use strict";

    const nameKey = "pylearn.displayName";

    const profileMenu = document.querySelector(".profile-menu");
    const profileSummary = profileMenu?.querySelector("summary");

    const form = document.querySelector("#participant-form");
    const nameInput = document.querySelector("#participant-name");
    const message = document.querySelector("#participant-message");

    function readName() {
        try {
            return sessionStorage.getItem(nameKey) || "";
        } catch {
            return "";
        }
    }

    function showName(name) {
        document.querySelectorAll("[data-participant-name]").forEach(element => {
            element.textContent = name
                ? `Du övar som ${name}.`
                : "Du övar som gäst.";
        });
    }

    function refreshName() {
        const name = readName();

        showName(name);

        if (nameInput) {
            nameInput.value = name;
        }
    }

    if (form && nameInput && message) {
        form.addEventListener("submit", event => {
            event.preventDefault();

            const name = nameInput.value.trim().slice(0, 30);
            nameInput.value = name;

            try {
                if (name) {
                    sessionStorage.setItem(nameKey, name);
                } else {
                    sessionStorage.removeItem(nameKey);
                }

                showName(name);

                message.textContent = name
                    ? `Sparat! Du övar som ${name}.`
                    : "Du fortsätter som gäst.";
            } catch {
                message.textContent =
                    "Namnet kunde inte sparas. Du kan fortsätta som gäst.";
            }
        });
    }

    document.querySelectorAll("[data-new-participant]").forEach(button => {
        button.addEventListener("click", () => {
            const confirmed = window.confirm(
                "Starta för en ny deltagare? Visningsnamnet tas bort och du går till startsidan. Övningen börjar om när den öppnas igen."
            );

            if (!confirmed) {
                return;
            }

            try {
                sessionStorage.removeItem(nameKey);
            } catch {
                if (message) {
                    message.textContent =
                        "Namnet kunde inte tas bort. Försök igen innan du byter deltagare.";
                }

                return;
            }

            window.location.replace("index.html");
        });
    });

    // Stäng profilmenyn när besökaren klickar utanför den.
    document.addEventListener("click", event => {
        if (
            profileMenu?.open &&
            !profileMenu.contains(event.target)
        ) {
            profileMenu.open = false;
        }
    });

    // Escape stänger menyn och återför fokus till knappen.
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && profileMenu?.open) {
            profileMenu.open = false;
            profileSummary?.focus();
        }
    });

    // Uppdatera namnet även vid navigation med bakåtknappen.
    window.addEventListener("pageshow", () => {
        refreshName();

        if (profileMenu) {
            profileMenu.open = false;
        }

        if (message) {
            message.textContent = "";
        }
    });

    refreshName();
})();