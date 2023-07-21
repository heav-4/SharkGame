"use strict";
SharkGame.Lab = {
    tabId: "lab",
    tabDiscovered: false,
    tabSeen: false,
    tabName: "Laboratory",
    tabBg: "img/bg/bg-lab.png",
    get sceneImage() {
        switch (world.worldType) {
            case "tempestuous":
                if (res.getTotalResource("scientist") < 1) {
                    return "";
                }
                return "img/events/misc/scene-lab.png";
            case "volcanic":
                return "";
            default:
                return "img/events/misc/scene-lab.png";
        }
    },
    get sceneDoneImage() {
        switch (world.worldType) {
            case "volcanic":
                return "";
            default:
                return "img/events/misc/scene-lab-done.png";
        }
    },
    get discoverReq() {
        switch (world.worldType) {
            case "tempestuous":
                return { resource: { crab: 5 } };
            default:
                return { resource: { science: 10 } };
        }
    },
    listEmpty: true,
    get message() {
        switch (world.worldType) {
            case "tempestuous":
                if (res.getTotalResource("scientist") < 1) {
                    return "Sort of just off to the side, there's a cave.";
                }
                return "Sort of just off to the side, the science sharks congregate and discuss things with words you've never heard before.";
            case "volcanic":
                return "Sort of just off to the side, a group of curious crabs congregate and discuss stuff that we don't understand.";
            default:
                return "Sort of just off to the side, the science sharks congregate and discuss things with words you've never heard before.";
        }
    },
    get messageDone() {
        switch (world.worldType) {
            case "volcanic":
                return ("Sort of just off to the side, the researchers are compiling their work and filing it away.<br/>" +
                    "Looks like that's it! No more things to figure out.");
            default:
                return ("Sort of just off to the side, the science sharks quietly wrap up their badly disguised party and pretend to work.<br/>" +
                    "Looks like that's it! No more things to figure out.");
        }
    },
    init() {
        const lab = SharkGame.Lab;
        SharkGame.TabHandler.registerTab(this);
        lab.resetUpgrades();
    },
    setup() {
        _.each(SharkGame.Upgrades.purchaseQueue, (upgradeId) => {
            SharkGame.Lab.addUpgrade(upgradeId, "load");
        });
        SharkGame.TabHandler.updateRegistration(this);
    },
    resetUpgrades() {
        SharkGame.Upgrades.purchaseQueue = undefined;
        SharkGame.Upgrades.purchased.splice(0);
        const upgradeObject = {};
        $.each(SharkGame.ModifierTypes.upgrade, (type, modifiers) => {
            upgradeObject[type] = {};
            $.each(modifiers, (modifierName, object) => {
                object.category = "upgrade";
                object.type = type;
                upgradeObject[type][modifierName] = object.defaultValue;
            });
        });
        SharkGame.ResourceMap.forEach((_resource, resourceId) => {
            SharkGame.ModifierMap.get(resourceId).upgrade = sharkmisc.cloneDeep(upgradeObject);
        });
    },
    switchTo() {
        const lab = SharkGame.Lab;
        const content = $("#content");
        const upgradeTable = SharkGame.Upgrades.getUpgradeTable();
        const tabMessageSel = $("<div>").attr("id", "tabMessage");
        if (SharkGame.Settings.current.showTabImages) {
            tabMessageSel.css("background-image", "url('" + lab.tabBg + "')");
        }
        content.append(tabMessageSel);
        lab.updateMessage(true);
        const buttonListContainer = $("<div>").attr("id", "buttonLeftContainer");
        buttonListContainer.append($("<div>").attr("id", "buttonList").addClass("lab").append($("<h3>").html("Available Upgrades")));
        content.append(buttonListContainer);
        content.append($("<div>").attr("id", "upgradeList"));
        content.append($("<div>").addClass("clear-fix"));
        lab.updateUpgradeList();
        lab.update();
        lab.setHint(upgradeTable);
    },
    setHint(upgradeTable, isNotStart) {
        const lab = SharkGame.Lab;
        if (lab.allResearchDone()) {
            let message;
            switch (world.worldType) {
                case "volcanic":
                    message = "We rest content, sure that our work is done.";
                    break;
                default:
                    message = "The scientists rest content, sure that they're done with their work.";
            }
            $("#buttonList").html($("<p>").html(message));
            if (isNotStart)
                lab.updateMessage();
        }
        else if (lab.listEmpty) {
            let message;
            switch (world.worldType) {
                case "tempestuous":
                    if (res.getTotalResource("scientist") < 1) {
                        message = "We're in the cave. Now what?";
                    }
                    else {
                        message = "The scientists are out of ideas, but there are always more discoveries to be made.";
                    }
                    break;
                case "volcanic":
                    message = "The crabs are out of ideas, but there are always more discoveries to be made.";
                    break;
                default:
                    message = "The scientists are out of ideas, but there are always more discoveries to be made.";
            }
            $("#buttonList").html($("<p>").html(message));
            const hintedUpgrade = _.find(upgradeTable, (upgrade, upgradeId) => lab.isUpgradePossible(upgradeId) &&
                !lab.isUpgradeVisible(upgradeId) &&
                sharkmisc.has(upgrade, "required") &&
                sharkmisc.has(upgrade.required, "upgrades") &&
                _.every(upgrade.required.upgrades, (requiredUpgradeId) => SharkGame.Upgrades.purchased.includes(requiredUpgradeId)));
            if (hintedUpgrade === undefined)
                return;
            let hintResource;
            if (sharkmisc.has(hintedUpgrade, "required") && sharkmisc.has(hintedUpgrade.required, "seen")) {
                hintResource = _.find(hintedUpgrade.required.seen, (resource) => world.doesResourceExist(resource));
            }
            else if (sharkmisc.has(hintedUpgrade, "required") && sharkmisc.has(hintedUpgrade.required, "totals")) {
                hintResource = _.find(Object.keys(hintedUpgrade.required.totals), (resource) => world.doesResourceExist(resource));
            }
            if (hintResource) {
                $("#buttonList").append($("<p>").html("You get the feeling that " +
                    sharktext.getResourceName(hintResource, false, 2, sharkcolor.getElementColor("buttonList")) +
                    " may be the key."));
            }
            else {
                log.addError(`There is a possible, undiscovered upgrade (${hintedUpgrade.name}), but no valid hint resource.`);
            }
        }
    },
    update() {
        const lab = SharkGame.Lab;
        const buttonList = $("#buttonList");
        const upgradeTable = SharkGame.Upgrades.getUpgradeTable();
        lab.listEmpty = true;
        $.each(upgradeTable, (upgradeId, upgrade) => {
            if (SharkGame.Upgrades.purchased.includes(upgradeId)) {
                return;
            }
            const button = $("#" + upgradeId);
            if (button.length > 0) {
                lab.listEmpty = false;
                lab.updateLabButton(upgradeId);
            }
            else {
                let prereqsMet = true;
                if (upgrade.required) {
                    if (upgrade.required.upgrades) {
                        prereqsMet = prereqsMet && this.areRequiredUpgradePrereqsPurchased(upgradeId);
                    }
                    prereqsMet = prereqsMet && lab.isUpgradePossible(upgradeId) && lab.isUpgradeVisible(upgradeId);
                }
                if (prereqsMet) {
                    lab.listEmpty = false;
                    const effects = SharkGame.Lab.getResearchEffects(upgrade);
                    const buttonSelector = SharkGame.Button.makeButton(upgradeId, upgrade.name + "<br/>" + upgrade.desc + "<br/>" + effects, buttonList, lab.onLabButton);
                    lab.updateLabButton(upgradeId);
                    if (SharkGame.Settings.current.showAnimations) {
                        buttonSelector
                            .hide()
                            .css("opacity", 0)
                            .slideDown(50)
                            .animate({ opacity: 1.0 }, {
                            duration: 50,
                            done: (anim) => (anim.elem.style = null),
                        });
                    }
                }
            }
        });
    },
    areRequiredUpgradePrereqsPurchased(upgradeId) {
        const upgradeData = SharkGame.Upgrades.getUpgradeData(SharkGame.Upgrades.getUpgradeTable(), upgradeId);
        if (upgradeData.required) {
            return _.every(upgradeData.required.upgrades, (requiredUpgradeId) => SharkGame.Upgrades.purchased.includes(requiredUpgradeId));
        }
        return true;
    },
    updateLabButton(upgradeName) {
        const button = $("#" + upgradeName);
        const upgradeData = SharkGame.Upgrades.getUpgradeData(SharkGame.Upgrades.getUpgradeTable(), upgradeName);
        const upgradeCost = upgradeData.cost;
        let enableButton;
        if ($.isEmptyObject(upgradeCost)) {
            enableButton = true;
        }
        else {
            enableButton = res.checkResources(upgradeCost);
        }
        const effects = SharkGame.Lab.getResearchEffects(upgradeData);
        let label = upgradeData.name + "<br/>" + upgradeData.desc + "<br/>" + effects;
        const costText = sharktext.resourceListToString(upgradeCost, !enableButton, sharkcolor.getElementColor(upgradeName));
        if (costText !== "") {
            label += "<br/>Cost: " + costText;
        }
        if (enableButton) {
            button.removeClass("disabled");
        }
        else {
            button.addClass("disabled");
        }
        const newButton = $(document.createElement("button"));
        newButton.html(label);
        const spritename = "technologies/" + upgradeName;
        if (SharkGame.Settings.current.showIcons) {
            const iconDiv = SharkGame.changeSprite(SharkGame.spriteIconPath, spritename, null, "general/missing-technology");
            if (iconDiv) {
                iconDiv.addClass("button-icon");
                newButton.prepend(iconDiv);
            }
        }
        if (button.html() !== newButton.html()) {
            button.html(newButton.html());
        }
    },
    updateMessage(suppressAnimation) {
        const lab = SharkGame.Lab;
        const allResearchDone = lab.allResearchDone();
        let message = allResearchDone ? lab.messageDone : lab.message;
        let imgSrc = allResearchDone ? lab.sceneDoneImage : lab.sceneImage;
        if (!imgSrc) {
            imgSrc = "img/events/misc/missing.png";
        }
        const tabMessageSel = $("#tabMessage");
        if (SharkGame.Settings.current.showTabImages) {
            message = `<img width=400 height=200 src='${imgSrc}' id='tabSceneImage'>${message}`;
            tabMessageSel.css(`background-image", "url('${lab.tabBg}')`);
        }
        if (!suppressAnimation && SharkGame.Settings.current.showAnimations) {
            tabMessageSel.animate({ opacity: 0 }, 200, () => {
                $(tabMessageSel).animate({ opacity: 1 }, 200).html(message);
            });
        }
        else {
            tabMessageSel.html(message);
        }
    },
    onLabButton(upgradeId) {
        if ($(this).hasClass("disabled"))
            return;
        const upgradeTable = SharkGame.Upgrades.getUpgradeTable();
        let upgrade;
        if (typeof upgradeId === "object") {
            if ($(this).hasClass("disabled"))
                return;
            upgradeId = $(this).attr("id");
            upgrade = SharkGame.Upgrades.getUpgradeData(upgradeTable, upgradeId);
            if (SharkGame.Upgrades.purchased.includes(upgradeId)) {
                $(this).remove();
                return;
            }
            if (res.checkResources(upgrade.cost)) {
                $(this).remove();
                res.changeManyResources(upgrade.cost, true);
                SharkGame.Lab.addUpgrade(upgradeId);
                if (upgrade.researchedMessage) {
                    log.addMessage(upgrade.researchedMessage);
                }
            }
        }
        else if (upgradeId !== undefined) {
            upgrade = SharkGame.Upgrades.getUpgradeData(upgradeTable, upgradeId);
            if (SharkGame.Upgrades.purchased.includes(upgradeId)) {
                return;
            }
            if (res.checkResources(upgrade.cost)) {
                res.changeManyResources(upgrade.cost, true);
                SharkGame.Lab.addUpgrade(upgradeId);
                if (upgrade.researchedMessage) {
                    log.addMessage(upgrade.researchedMessage);
                }
            }
            if (SharkGame.Tabs.current === "lab") {
                $(`#${upgradeId}`).remove();
            }
        }
        if (SharkGame.Tabs.current === "lab") {
            SharkGame.Lab.update();
            SharkGame.Lab.setHint(upgradeTable, true);
        }
    },
    addUpgrade(upgradeId) {
        const upgrade = SharkGame.Upgrades.getUpgradeData(SharkGame.Upgrades.getUpgradeTable(), upgradeId);
        if (upgrade && !SharkGame.Upgrades.purchased.includes(upgradeId)) {
            SharkGame.Upgrades.purchased.push(upgradeId);
            SharkGame.Gate.checkUpgradeRequirements(upgradeId);
            if (upgrade.effect) {
                $.each(upgrade.effect, (effectType, effects) => {
                    $.each(effects, (affectedResource, degree) => {
                        res.applyModifier(effectType, affectedResource, degree);
                    });
                });
            }
            if (upgrade.events) {
                _.each(upgrade.events, (eventName) => {
                    SharkGame.Events[eventName].trigger();
                });
            }
            const list = $("#upgradeList > ul");
            const upgradeElt = $("<li>").html(`${upgrade.name}<br/><span class='medDesc'>${upgrade.effectDesc}</span>`);
            const showAnims = SharkGame.Settings.current.showAnimations;
            if (showAnims) {
                upgradeElt.hide().css("opacity", 0).prependTo(list).slideDown(50).animate({ opacity: 1.0 }, 100);
            }
            else {
                upgradeElt.prependTo(list);
            }
            if (!SharkGame.flags.upgradeTimes) {
                SharkGame.flags.upgradeTimes = {};
            }
            const gotUpgradeTime = SharkGame.flags.upgradeTimes[upgradeId];
            if (gotUpgradeTime) {
                console.log(`Added upgrade ${upgrade.name} at: ${sharktext.formatTime(gotUpgradeTime)}`);
            }
            else {
                console.log(`Added upgrade ${upgrade.name} at: ${sharktext.formatTime(sharktime.getRunTime())}`);
                SharkGame.flags.upgradeTimes[upgradeId] = sharktime.getRunTime();
            }
            res.updateResourcesTable();
        }
    },
    allResearchDone() {
        const upgradeTable = SharkGame.Upgrades.getUpgradeTable();
        const lab = SharkGame.Lab;
        let allDone = true;
        $.each(upgradeTable, (upgradeId) => {
            if (lab.isUpgradePossible(upgradeId)) {
                allDone = allDone && SharkGame.Upgrades.purchased.includes(upgradeId);
            }
        });
        return allDone;
    },
    findAllAffordableUpgrades() {
        const which = [];
        const table = SharkGame.Upgrades.getUpgradeTable();
        $.each(table, (upgradeName) => {
            if (!this.isUpgradePossible(upgradeName) || !this.isUpgradeVisible(upgradeName) || SharkGame.Upgrades.purchased.includes(upgradeName)) {
                return true;
            }
            if (res.checkResources(SharkGame.Upgrades.getUpgradeData(table, upgradeName).cost) &&
                this.areRequiredUpgradePrereqsPurchased(upgradeName)) {
                which.push(upgradeName);
            }
        });
        return which;
    },
    isUpgradePossible(upgradeName) {
        const lab = SharkGame.Lab;
        const upgradeData = SharkGame.Upgrades.getUpgradeData(SharkGame.Upgrades.getUpgradeTable(), upgradeName);
        let isPossible = true;
        if (!upgradeData) {
            return false;
        }
        if (upgradeData.required) {
            if (upgradeData.required.resources) {
                let relatedResourcesExist = false;
                _.each(upgradeData.required.resources, (resourceId) => {
                    relatedResourcesExist = relatedResourcesExist || world.doesResourceExist(resourceId);
                });
                isPossible = isPossible && relatedResourcesExist;
            }
            isPossible = isPossible && _.every(upgradeData.required.upgrades, (upgrade) => lab.isUpgradePossible(upgrade));
            isPossible = isPossible && _.every(upgradeData.cost, (_amount, resource) => world.doesResourceExist(resource));
        }
        return isPossible;
    },
    isUpgradeVisible(upgradeId) {
        const upgrade = SharkGame.Upgrades.getUpgradeData(SharkGame.Upgrades.getUpgradeTable(), upgradeId);
        let isVisible = true;
        if (sharkmisc.has(upgrade, "required") && sharkmisc.has(upgrade.required, "seen")) {
            isVisible = isVisible && _.some(upgrade.required.seen, (requiredSeen) => res.getTotalResource(requiredSeen) > 0);
        }
        if (sharkmisc.has(upgrade, "required") && sharkmisc.has(upgrade.required, "totals")) {
            isVisible =
                isVisible && _.every(upgrade.required.totals, (requiredTotal, resourceName) => res.getTotalResource(resourceName) >= requiredTotal);
        }
        return isVisible || SharkGame.Upgrades.purchased.includes(upgradeId);
    },
    getResearchEffects(upgrade) {
        const color = sharkcolor.getVariableColor("--color-light").replace(/[^0-9a-f]/gi, "");
        const red = (parseInt(color.substr(0, 2), 16) / 1.3).toString(16);
        const green = (parseInt(color.substr(2, 2), 16) / 1.3).toString(16);
        const blue = (parseInt(color.substr(4, 2), 16) / 1.3).toString(16);
        const darkerColour = "#" + red + green + blue;
        const effects = [];
        $.each(upgrade.effect, (effectType, effectsList) => {
            $.each(effectsList, (resource, degree) => {
                const effectText = SharkGame.ModifierReference.get(effectType).effectDescription(degree, resource, darkerColour);
                if (world.doesResourceExist(resource) && effectText !== "") {
                    effects.push(effectText);
                }
            });
        });
        if (upgrade.customEffect)
            effects.push(upgrade.customEffect(darkerColour));
        return "<span class='medDesc' class='click-passthrough'>(Effects: " + (effects.length > 0 ? effects.join(", ") : "???") + ")</span>";
    },
    updateUpgradeList() {
        const upgradeTable = SharkGame.Upgrades.getUpgradeTable();
        const upgradeList = $("#upgradeList");
        upgradeList.empty();
        upgradeList.append($("<h3>").html("Researched Upgrades"));
        const list = $("<ul>");
        const upgrades = [];
        $.each(upgradeTable, (upgradeId) => {
            if (SharkGame.Upgrades.purchased.includes(upgradeId)) {
                upgrades.unshift(upgradeId);
            }
        });
        for (const upgradeId of upgrades) {
            const upgrade = SharkGame.Upgrades.getUpgradeData(upgradeTable, upgradeId);
            list.append($("<li>").html(`${upgrade.name}<br/><span class='medDesc'>${upgrade.effectDesc}</span>`));
        }
        upgradeList.append(list);
    },
};
//# sourceMappingURL=lab.js.map