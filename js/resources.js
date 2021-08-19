"use strict";
/** @type {Map<string, any>} */
SharkGame.PlayerResources = new Map(); // stats about resources player has
SharkGame.PlayerIncomeTable = new Map(); // every resource and how much is produced
SharkGame.ResourceMap = new Map(); // every resource and what it produces at base income and after modifiers are applied
SharkGame.BreakdownIncomeTable = new Map(); // a map which has every single generator and what it produces, after costScaling
SharkGame.FlippedBreakdownIncomeTable = new Map(); // each resource and what produces it and how much
SharkGame.ModifierMap = new Map(); // the static multipliers and modifiers to each resource from upgrades, the world, etc
SharkGame.ResourceIncomeAffectors = {}; // these two are used to preserve the integrity of the original table in sharkgame.resourcetable
SharkGame.GeneratorIncomeAffectors = {}; // this allows free modification of these, in accordance with modifiers and events

SharkGame.Resources = {
    INCOME_COLOR: "#909090",
    TOTAL_INCOME_COLOR: "#A0A0A0",
    UPGRADE_MULTIPLIER_COLOR: "#60A060",
    WORLD_MULTIPLIER_COLOR: "#6060A0",
    ASPECT_MULTIPLIER_COLOR: "#70B5A0",
    RESOURCE_AFFECT_MULTIPLIER_COLOR: "#BFBF5A",

    specialMultiplier: null,
    rebuildTable: false,

    collapsedRows: new Set(),

    init() {
        // set all the amounts and total amounts of resources to 0
        $.each(SharkGame.ResourceTable, (resourceId, resource) => {
            SharkGame.ResourceMap.set(resourceId, _.cloneDeep(resource));
        });

        SharkGame.ResourceMap.forEach((resource, resourceId) => {
            // create the baseIncome data
            if (resource.income) {
                resource.baseIncome = {};
                Object.defineProperties(resource.baseIncome, Object.getOwnPropertyDescriptors(SharkGame.ResourceTable[resourceId].income));
            }

            // create the playerresources map
            SharkGame.PlayerResources.set(resourceId, {
                amount: 0,
                totalAmount: 0,
            });

            // populate the flipped income breakdown map
            SharkGame.FlippedBreakdownIncomeTable.set(resourceId, {});

            // populate income table with an entry for each resource!!
            SharkGame.PlayerIncomeTable.set(resourceId, 0);
        });

        // set up the modifier reference, and also set up the object we copy to every entry in the modifier map
        const multiplierObject = {};
        $.each(SharkGame.ModifierTypes, (category, types) => {
            multiplierObject[category] = {};
            $.each(types, (type, modifiers) => {
                multiplierObject[category][type] = {};
                $.each(modifiers, (name, object) => {
                    // additionally set values for the types and categories of stuff
                    object.category = category;
                    object.type = type;
                    SharkGame.ModifierReference.set(name, object);
                    multiplierObject[category][type][name] = object.defaultValue;
                });
            });
        });

        // build multiplier map
        SharkGame.ResourceMap.forEach((_resource, resourceId) => {
            SharkGame.ModifierMap.set(resourceId, _.cloneDeep(multiplierObject));
        });

        res.idleMultiplier = 1;
        res.specialMultiplier = 1;
        SharkGame.ResourceIncomeAffectors = _.cloneDeep(SharkGame.ResourceIncomeAffectorsOriginal);
        SharkGame.GeneratorIncomeAffectors = _.cloneDeep(SharkGame.GeneratorIncomeAffectorsOriginal);
        res.clearNetworks();
    },

    processIncomes(timeDelta, debug, simulatingOffline) {
        res.recalculateIncomeTable(true);
        if (res.testGracePeriod()) {
            return;
        }

        if (simulatingOffline) {
            SharkGame.timestampSimulated = SharkGame.timestampLastSave;
        } else {
            SharkGame.timestampSimulated = _.now() - timeDelta * 1000;
        }
        if (!debug && timeDelta > 61) {
            for (let i = 0; i < 60; i++) {
                SharkGame.EventHandler.handleEventTick("beforeTick");
                SharkGame.PlayerIncomeTable.forEach((amount, resourceId) => {
                    res.changeResource(resourceId, amount);
                });
                res.recalculateIncomeTable(true);
                timeDelta -= 1;
                SharkGame.timestampSimulated += 1000;
                SharkGame.EventHandler.handleEventTick("afterTick");
            }
            // it should be noted that to greatly increase speed, events are not processed during res.RKMethod.
            // this will need to be planned around; if we have a reactive event that could be triggered during
            // offline progress, then we need to either design around that never happening or design around it
            // happening within 60 seconds of loading a save. as of frigid update, this is not a concern,
            // but i can think of a time in the future where it definitely will be.
            // I'm willing to make things a little messy and add some special rules if it'll get the damn thing to work properly.
            if (timeDelta > 172800) {
                timeDelta = res.doRKMethod(timeDelta, timeDelta / 1728, 50000);
            }
            if (timeDelta > 43200) {
                timeDelta = res.doRKMethod(timeDelta, 100, 8000);
            }
            if (timeDelta > 7200) {
                timeDelta = res.doRKMethod(timeDelta, 75, 2250);
            }
            if (timeDelta > 2000) {
                timeDelta = res.doRKMethod(timeDelta, 40, 500);
            }
            if (timeDelta > 60) {
                timeDelta = res.doRKMethod(timeDelta, 20, 50);
            }
        }
        SharkGame.timestampSimulated = _.now() - 1000 * timeDelta;
        while (timeDelta > 1) {
            SharkGame.EventHandler.handleEventTick("beforeTick");
            SharkGame.PlayerIncomeTable.forEach((income, resourceId) => {
                if (!SharkGame.ResourceSpecialProperties.timeImmune.includes(resourceId)) {
                    res.changeResource(resourceId, income);
                } else {
                    res.changeResource(resourceId, income);
                }
            });
            res.recalculateIncomeTable(true);
            timeDelta -= 1;
            SharkGame.timestampSimulated += 1000;
            SharkGame.EventHandler.handleEventTick("afterTick");
        }
        SharkGame.PlayerIncomeTable.forEach((amount, resourceId) => {
            if (!SharkGame.ResourceSpecialProperties.timeImmune.includes(resourceId)) {
                res.changeResource(resourceId, amount * timeDelta);
            } else {
                res.changeResource(resourceId, amount);
            }
        });
        res.recalculateIncomeTable();
    },

    doRKMethod(time, factor, threshold) {
        let originalResources;
        let originalIncomes;
        let stepTwoIncomes;
        let stepThreeIncomes;

        while (time > threshold) {
            originalResources = _.cloneDeep(SharkGame.PlayerResources);
            originalIncomes = _.cloneDeep(SharkGame.PlayerIncomeTable);

            SharkGame.PlayerIncomeTable.forEach((income, resourceId) => {
                if (!SharkGame.ResourceSpecialProperties.timeImmune.includes(resourceId)) {
                    res.changeResource(resourceId, (income * factor) / 2, true);
                }
            });

            res.recalculateIncomeTable(true);
            stepTwoIncomes = _.cloneDeep(SharkGame.PlayerIncomeTable);

            SharkGame.PlayerIncomeTable.forEach((amount, resourceId) => {
                if (!SharkGame.ResourceSpecialProperties.timeImmune.includes(resourceId)) {
                    res.changeResource(resourceId, (amount * factor) / 2, true);
                }
            });

            res.recalculateIncomeTable(true);
            stepThreeIncomes = _.cloneDeep(SharkGame.PlayerIncomeTable);

            SharkGame.PlayerIncomeTable.forEach((amount, resourceId) => {
                if (!SharkGame.ResourceSpecialProperties.timeImmune.includes(resourceId)) {
                    res.changeResource(resourceId, amount * factor, true);
                }
            });

            res.recalculateIncomeTable(true);
            SharkGame.PlayerResources = originalResources;

            SharkGame.PlayerIncomeTable.forEach((_amount, resource) => {
                res.changeResource(
                    resource,
                    (factor *
                        (originalIncomes.get(resource) +
                            2 * stepTwoIncomes.get(resource) +
                            2 * stepThreeIncomes.get(resource) +
                            SharkGame.PlayerIncomeTable.get(resource))) /
                        6,
                    true
                );
            });

            res.recalculateIncomeTable(true);
            time -= factor;
        }
        return time;
    },

    recalculateIncomeTable(cheap) {
        // clear income table first
        SharkGame.ResourceMap.forEach((_resource, resourceId) => {
            SharkGame.PlayerIncomeTable.set(resourceId, 0);
        });

        SharkGame.ResourceMap.forEach((resource, resourceId) => {
            if (world.doesResourceExist(resourceId)) {
                // for this resource, calculate the income it generates
                if (resource.income) {
                    let costScaling = 1;
                    const changeMap = new Map();

                    $.each(resource.income, (generatedResource) => {
                        if (world.doesResourceExist(generatedResource)) {
                            changeMap.set(generatedResource, res.getProductAmountFromGeneratorResource(resourceId, generatedResource));
                        }
                    });

                    changeMap.forEach((generatedAmount, generatedResource) => {
                        // run over all resources first to check if costs can be met
                        // if the cost can't be taken, scale the cost and output down to feasible levels
                        if (!resource.forceIncome) {
                            if (generatedAmount < 0) {
                                const resourceHeld = res.getResource(generatedResource);
                                if (resourceHeld + generatedAmount <= 0) {
                                    const scaling = resourceHeld / -generatedAmount;
                                    if (scaling >= 0 && scaling < 1) {
                                        // sanity checking
                                        costScaling = Math.min(costScaling, scaling);
                                    } else {
                                        costScaling = 0; // better to break this way than break explosively
                                    }
                                }
                            }
                        }
                        if (generatedAmount > 0) {
                            SharkGame.PlayerResources.get(generatedResource).discovered = true;
                        }
                    });

                    if (!cheap) {
                        const trueIncomeObject = {};
                        let income;
                        changeMap.forEach((amount, generatedResource) => {
                            income = amount * costScaling;
                            trueIncomeObject[generatedResource] = income;
                            SharkGame.FlippedBreakdownIncomeTable.get(generatedResource)[resourceId] = income;
                            SharkGame.PlayerIncomeTable.set(generatedResource, SharkGame.PlayerIncomeTable.get(generatedResource) + income);
                        });
                        SharkGame.BreakdownIncomeTable.set(resourceId, trueIncomeObject);
                    } else {
                        changeMap.forEach((amount, generatedResource) => {
                            SharkGame.PlayerIncomeTable.set(
                                generatedResource,
                                SharkGame.PlayerIncomeTable.get(generatedResource) + amount * costScaling
                            );
                        });
                    }
                }
            }
        });

        $.each(SharkGame.ResourceSpecialProperties.incomeCap, (resourceId, maxProduction) => {
            if (SharkGame.PlayerIncomeTable.get(resourceId) > maxProduction) {
                SharkGame.PlayerIncomeTable.set(resourceId, maxProduction);
            }
        });
    },

    getProductAmountFromGeneratorResource(generator, product, numGenerator = res.getResource(generator)) {
        return (
            SharkGame.ResourceMap.get(generator).income[product] *
            numGenerator *
            res.getSpecialMultiplier() *
            res.getNetworkIncomeModifier("generator", generator) *
            res.getNetworkIncomeModifier("resource", product) *
            cad.speed *
            res.idleMultiplier
        );
    },

    getNetworkIncomeModifier(network, resource) {
        switch (network) {
            case "generator":
                network = SharkGame.GeneratorIncomeAffected;
                break;
            case "resource":
                network = SharkGame.ResourceIncomeAffected;
        }

        const node = network[resource];
        let multiplier = 1;
        if (node) {
            if (node.multiply) {
                $.each(node.multiply, (resourceOrGroup, amount) => {
                    multiplier = multiplier * (1 + amount * res.getResource(resourceOrGroup));
                });
            }
            if (node.reciprocate) {
                $.each(node.reciprocate, (resourceOrGroup, amount) => {
                    multiplier = multiplier / (1 + amount * res.getResource(resourceOrGroup));
                });
            }
            if (node.exponentiate) {
                $.each(node.exponentiate, (resourceOrGroup, amount) => {
                    multiplier = multiplier * Math.pow(amount, res.getResource(resourceOrGroup));
                });
            }
            if (node.polynomial) {
                $.each(node.polynomial, (resourceOrGroup, amount) => {
                    multiplier = multiplier * (1 + Math.pow(res.getResource(resourceOrGroup), amount));
                });
            }
        }
        return multiplier;
    },

    getSpecialMultiplier() {
        return res.specialMultiplier;
    },

    getIncome(resource) {
        return SharkGame.PlayerIncomeTable.get(resource);
    },

    // Adds or subtracts resources based on amount given.
    changeResource(resource, amount, norecalculation) {
        if (Math.abs(amount) < SharkGame.EPSILON) {
            return; // ignore changes below epsilon
        }

        const resourceTable = SharkGame.PlayerResources.get(resource);
        const prevTotalAmount = resourceTable.totalAmount;

        if (!world.doesResourceExist(resource)) {
            return; // don't change resources that don't technically exist
        }

        resourceTable.amount += amount;
        if (resourceTable.amount < 0) {
            resourceTable.amount = 0;
        } else if (!(resourceTable.amount < SharkGame.MAX)) {
            resourceTable.amount = SharkGame.MAX;
        }

        if (amount > 0) {
            resourceTable.totalAmount += amount;
        }

        if (prevTotalAmount < SharkGame.EPSILON && amount > 0) {
            // we got a new resource
            res.rebuildTable = true;
        }

        if (!norecalculation) {
            res.recalculateIncomeTable();
        }
    },

    setResource(resource, newValue) {
        const resourceTable = SharkGame.PlayerResources.get(resource);

        resourceTable.amount = newValue;
        if (resourceTable.amount < 0) {
            resourceTable.amount = 0;
        }
        res.recalculateIncomeTable();
    },

    setTotalResource(resource, newValue) {
        SharkGame.PlayerResources.get(resource).totalAmount = newValue;
    },

    getResource(resource) {
        return SharkGame.PlayerResources.get(resource).amount;
    },

    getTotalResource(resource) {
        return SharkGame.PlayerResources.get(resource).totalAmount;
    },

    isCategoryVisible(category) {
        return (
            category.name !== "Hidden" &&
            _.some(category.resources, (resourceName) => {
                const resource = SharkGame.PlayerResources.get(resourceName);
                return (resource.totalAmount > 0 || resource.discovered) && world.doesResourceExist(resourceName);
            })
        );
    },

    getCategoryOfResource(resourceName) {
        return _.findKey(SharkGame.ResourceCategories, (category) => _.some(category.resources, (resource) => resource === resourceName));
    },

    getResourcesInCategory(categoryName) {
        const resources = [];
        SharkGame.ResourceCategories[categoryName].resources.forEach((resourceName) => resources.push(resourceName));
        return resources;
    },

    isCategory(name) {
        return typeof SharkGame.ResourceCategories[name] !== "undefined";
    },

    isInCategory(resource, category) {
        return SharkGame.ResourceCategories[category].resources.indexOf(resource) !== -1;
    },

    getBaseOfResource(resourceName) {
        // if there are super-categories/base jobs of a resource, return that, otherwise return null
        for (const [resourceId, resource] of SharkGame.ResourceMap) {
            if (_.some(resource.jobs, (jobName) => jobName === resourceName)) {
                return resourceId;
            }
        }
        return null;
    },

    haveAnyResources() {
        for (const [resourceName, resource] of SharkGame.PlayerResources) {
            if (resourceName === "world") continue;
            if (resource.totalAmount > 0) return true;
        }
        return false;
    },

    // returns true if enough resources are held (>=)
    // false if they are not
    checkResources(resourceList, checkTotal) {
        return _.every(resourceList, (required, resource) => {
            const currentAmount = checkTotal ? res.getTotalResource(resource) : res.getResource(resource);
            if (typeof required === "object") {
                return required.lessThanOrEqualTo(currentAmount * (1 + SharkGame.EPSILON));
            }
            return currentAmount >= required;
        });
    },

    changeManyResources(resourceList, subtract = false) {
        $.each(resourceList, (resource, amount) => {
            if (typeof amount === "object") {
                amount = amount.toNumber();
            }
            res.changeResource(resource, subtract ? -amount : amount);
        });
    },

    scaleResourceList(resourceList, amount) {
        const newList = {};
        $.each(resourceList, (resource, resourceAmount) => {
            newList[resource] = resourceAmount * amount;
        });
        return newList;
    },

    // update values in table without adding rows
    updateResourcesTable() {
        // if resource table does not exist, there are no resources, so do not construct table
        // if a resource became visible when it previously wasn't, reconstruct the table
        if (res.rebuildTable) {
            res.reconstructResourcesTable();
        } else {
            // loop over table rows, update values
            SharkGame.PlayerResources.forEach((resource, resourceName) => {
                const oldValue = $("#amount-" + resourceName).html();
                const newValue = "⠀" + sharktext.beautify(resource.amount, true);
                if (oldValue !== newValue.replace(/'/g, '"')) {
                    $("#amount-" + resourceName).html(newValue);
                }

                const income = res.getIncome(resourceName);
                if (Math.abs(income) > SharkGame.EPSILON) {
                    const changeChar = income > 0 ? "+" : "";
                    const newIncome =
                        "⠀" +
                        "<span class='click-passthrough' style='color:" +
                        res.INCOME_COLOR +
                        "'>" +
                        changeChar +
                        sharktext.beautifyIncome(income) +
                        "</span>";
                    const oldIncome = $("#income-" + resourceName).html();
                    if (oldIncome !== newIncome.replace(/'/g, '"')) {
                        $("#income-" + resourceName).html(newIncome);
                    }
                } else {
                    $("#income-" + resourceName).html("");
                }
            });
        }
    },

    tokens: {
        list: [],
        chromeForcesWorkarounds: "",

        init() {
            if (!SharkGame.flags.tokens) {
                SharkGame.flags.tokens = {};
            }

            if (this.list.length > SharkGame.Aspects.pathOfIndustry.level) {
                this.list = [];
                $("#token-div").empty();
            }

            while (this.list.length < SharkGame.Aspects.pathOfIndustry.level) {
                this.makeToken();
            }

            _.each(this.list, (token) => {
                if (!SharkGame.flags.tokens[token.attr("id")]) {
                    SharkGame.flags.tokens[token.attr("id")] = "RETURNME";
                }
                $("#token-div").append(
                    token
                        .on("dragstart", res.tokens.handleTokenDragStart)
                        .on("dragover", (event) => {
                            event.originalEvent.preventDefault();
                        })
                        .on("dragend", res.tokens.handleDragEnd)
                        .on("drop", res.tokens.dropToken)
                        .on("click", res.tokens.tryReturnToken)
                        .on("mouseenter", res.tokens.tooltip)
                        .on("mouseleave", res.tableTextLeave)
                );
                if (
                    SharkGame.flags.tokens[token.attr("id")] !== "NA" &&
                    SharkGame.flags.tokens[token.attr("id")] !== "RETURNME" &&
                    world.doesResourceExist(SharkGame.flags.tokens[token.attr("id")].split("-")[1])
                ) {
                    res.tokens.markLocation(token.attr("id"), SharkGame.flags.tokens[token.attr("id")]);
                    res.tokens.unmarkLocation("NA", token.attr("id"));
                } else {
                    res.tokens.tryReturnToken(null, true, token);
                }
            });
            res.tokens.updateTokenDescriptions();
        },

        makeToken(type = "nobody cares", initialLocation = "NA") {
            const identifier = "token-" + (this.list.length + 1);
            const token = SharkGame.changeSprite(SharkGame.spriteIconPath, "general/theToken", null, "general/missing-action")
                .attr("id", identifier)
                .attr("type", type)
                .attr("draggable", true)
                .addClass("token");
            this.list.push(token);
            if (!SharkGame.flags.tokens[identifier]) {
                SharkGame.flags.tokens[identifier] = initialLocation;
            }
            return token;
        },

        tooltip(_event) {
            if (SharkGame.Settings.current.showTooltips) {
                if (SharkGame.flags.tokens[this.id] === "NA") {
                    $("#tooltipbox")
                        .html(
                            sharktext.boldString(
                                "Drag this token onto stuff to increase production.<br><br>While a token is still in its slot, you can also click where you want it to go."
                            )
                        )
                        .addClass("forHomeButtonOrGrotto");
                } else {
                    $("#tooltipbox").html(sharktext.boldString("Click this slot or click the token to recall it.")).addClass("forHomeButtonOrGrotto");
                }
            }
        },

        tryReturnToken(_event, duringLoad, token = $("#" + this.id)) {
            if (!token.length) {
                log.addError("Tried to return token, but couldn't find it!");
                log.addError("Tried to find this token: " + token.attr("id"));
                return;
            }
            if (SharkGame.flags.tokens[token.attr("id")] !== "NA") {
                if (!duringLoad && SharkGame.flags.tokens[token.attr("id")] !== "RETURNME") {
                    res.tokens.unmarkLocation(SharkGame.flags.tokens[token.attr("id")], token.attr("id"));
                }
                SharkGame.changeSprite(SharkGame.spriteIconPath, "general/theToken", token, "general/missing-action");
                token.attr("draggable", true);
                SharkGame.flags.tokens[token.attr("id")] = "NA";
                res.tokens.updateTokenDescriptions();
                res.tableTextLeave();
            }
        },

        handleTokenDragStart(event) {
            event.originalEvent.dataTransfer.setData("tokenId", event.originalEvent.target.id);
            //chrome forcing stinky workaround
            res.tokens.chromeForcesWorkarounds = event.originalEvent.target.id;
            //event.originalEvent.dataTransfer.setData("tokenType", event.originalEvent.target.type);
            event.originalEvent.dataTransfer.setData("tokenLocation", SharkGame.flags.tokens[this.id]);
            const image = document.createElement("img");
            image.src = "img/raw/general/theToken.png";
            event.originalEvent.dataTransfer.setDragImage(image, 0, 0);
            res.tokens.updateColorfulDropZones();
            res.tableTextLeave();
        },

        handleResourceDragStart(event) {
            event.originalEvent.dataTransfer.setData("tokenId", $("#" + this.id).attr("tokenId"));
            res.tokens.chromeForcesWorkarounds = $("#" + this.id).attr("tokenId");
            event.originalEvent.dataTransfer.setData("tokenLocation", event.originalEvent.target.id);
            const image = document.createElement("img");
            image.src = "img/raw/general/theToken.png";
            event.originalEvent.dataTransfer.setDragImage(image, 0, 0);
            res.tokens.updateColorfulDropZones();
            res.tableTextLeave();
        },

        handleDragEnd(_event) {
            res.tokens.chromeForcesWorkarounds = "";
            res.tokens.updateColorfulDropZones();
        },

        updateColorfulDropZones() {
            SharkGame.ResourceMap.forEach((_resourceData, resourceName) => {
                if (world.doesResourceExist(resourceName) && res.tokens.chromeForcesWorkarounds) {
                    if (!$.isEmptyObject($("#resource-" + resourceName)) && res.tokens.canBePlacedOn("resource-" + resourceName)) {
                        $("#resource-" + resourceName).addClass("highlightedResource");
                    }
                    if (!$.isEmptyObject($("#income-" + resourceName)) && res.tokens.canBePlacedOn("income-" + resourceName)) {
                        $("#income-" + resourceName).addClass("highlightedIncome");
                    }
                } else {
                    $("#resource-" + resourceName).removeClass("highlightedResource");
                    $("#income-" + resourceName).removeClass("highlightedIncome");
                }
            });
        },

        updateTokenDescriptions() {
            if (SharkGame.Settings.current.verboseTokenDescriptions) {
                let textToDisplay = "";
                _.each(res.tokens.list, (token) => {
                    if (textToDisplay) textToDisplay += "<br>";
                    textToDisplay += "Token #" + token.attr("id").split("-")[1] + " is ";
                    let tokenLocation;
                    if (SharkGame.flags.tokens) {
                        tokenLocation = SharkGame.flags.tokens[token.attr("id")];
                    }
                    if (_.isUndefined(tokenLocation)) {
                        textToDisplay = "";
                        return false;
                    }
                    if (tokenLocation === "NA") {
                        textToDisplay += "in its slot.";
                    } else if (tokenLocation.includes("income")) {
                        textToDisplay += "boosting all " + tokenLocation.split("-")[1] + " gains.";
                    } else if (tokenLocation.includes("resource")) {
                        textToDisplay += "boosting " + tokenLocation.split("-")[1] + " efficiency.";
                    }
                });
                $("#token-description").html(textToDisplay);
            } else {
                $("#token-description").html("");
            }
        },

        reapplyToken(token) {
            if (SharkGame.flags.tokens) {
                $("#" + SharkGame.flags.tokens[token.attr("id")])
                    .css("background-image", "url(img/raw/general/theToken.png)")
                    .attr("draggable", true)
                    .attr("tokenId", token.attr("id"));
            }
        },

        dropToken(event) {
            res.tableTextLeave();
            const originalTokenId = event.originalEvent.dataTransfer.getData("tokenId");
            const previousLocation = event.originalEvent.dataTransfer.getData("tokenLocation");

            res.tokens.unmarkLocation(previousLocation, originalTokenId);

            if (this.id.includes("token") && this.id !== originalTokenId) {
                res.tokens.markLocation(originalTokenId, originalTokenId);
            } else {
                res.tokens.markLocation(originalTokenId, this.id);
            }
            res.updateResourcesTable();
        },

        markLocation(originalId, newId) {
            res.tokens.applyTokenEffect(newId, originalId, "apply");
            if (newId.includes("token")) {
                SharkGame.changeSprite(SharkGame.spriteIconPath, "general/theToken", $("#" + newId), "general/missing-action");
                $("#" + newId).attr("draggable", true);
                SharkGame.flags.tokens[newId] = "NA";
            } else {
                $("#" + newId)
                    .css("background-image", "url(img/raw/general/theToken.png)")
                    .attr("draggable", true)
                    .attr("tokenId", originalId);
                SharkGame.flags.tokens[originalId] = newId;
            }
            res.tokens.updateTokenDescriptions();
        },

        unmarkLocation(locationPrevious, id) {
            if (locationPrevious === "NA") {
                SharkGame.changeSprite(SharkGame.spriteIconPath, "general/holeoverlay", $("#" + id), "general/missing-action");
                $("#" + id).attr("draggable", false);
            } else {
                $("#" + locationPrevious)
                    .attr("draggable", false)
                    .attr("tokenId", "")
                    .css("background-image", "");
            }
            res.tokens.applyTokenEffect(locationPrevious, id, "reverse");
        },

        applyTokenEffect(targetId, _id, reverseOrApply = "apply") {
            const multiplier = SharkGame.Aspects.coordinatedCooperation.level + 2;
            if (targetId === "NA" || targetId.includes("token")) {
                return;
            } else if (targetId.includes("resource")) {
                res.applyModifier("theTokenForGenerators", targetId.split("-")[1], reverseOrApply === "apply" ? multiplier : 1 / multiplier);
            } else if (targetId.includes("income")) {
                res.applyModifier("theTokenForResources", targetId.split("-")[1], reverseOrApply === "apply" ? multiplier : 1 / multiplier);
            } else {
                SharkGame.Log.addError("Tried to apply token effect, but couldn't understand the location!");
                SharkGame.Log.addError("Location was: " + targetId);
            }
        },

        canBePlacedOn(placedOnWhat) {
            const resource = placedOnWhat.split("-")[1];
            if (placedOnWhat.includes("resource")) {
                return (
                    !$("#" + placedOnWhat).attr("tokenId") &&
                    _.some(
                        SharkGame.ResourceMap.get(resource).income,
                        (amount, generatedResource) => amount !== 0 && world.doesResourceExist(generatedResource)
                    )
                );
            } else if (placedOnWhat.includes("income")) {
                return !$("#" + placedOnWhat).attr("tokenId") && SharkGame.PlayerIncomeTable.get(resource);
            }
        },

        tryClickToPlace(event) {
            const textId = event.originalEvent.target.id;
            if (res.tokens.canBePlacedOn(textId)) {
                $.each(SharkGame.flags.tokens, (tokenId, currentLocation) => {
                    if (currentLocation === "NA") {
                        res.tokens.markLocation(tokenId, textId);
                        res.tokens.unmarkLocation("NA", tokenId);
                        return false;
                    }
                });
            } else if ($("#" + textId).attr("tokenId")) {
                res.tokens.markLocation($("#" + textId).attr("tokenId"), $("#" + textId).attr("tokenId"));
                res.tokens.unmarkLocation(textId, $("#" + textId).attr("tokenId"));
            }
        },
    },

    minuteHand: {
        active: false,
        disableNextTick: false,
        realMultiplier: 1,
        onMessages: [
            "Time warps around you.",
            "Everything seems to get faster.",
            "Your vision warps as time bends.",
            "The hands of a nearby clock speed up.",
            "Frenzy members acclerate around you.",
            "You feel strange. Everything feels wrong. It's so fast.",
            "A strange feeling washes over you, and everything around you speeds up.",
            "You feel your mind twisting. Churning. Everything seems so fast.",
            "Things start piling up around you. You can't even tell who's doing it.",
            "You feel a crushing weight on your mind, and everything seems to get faster.",
            "You feel groggy. Everything speeds up.",
            "You can barely understand what's happening around you anymore. The speed is jarring.",
            "You feel sluggish. Everything around you seems so much faster.",
            "Your vision gets blurry. Everything is blurry. It's all a blur.",
            "Time seems to stretch from your perspective. It feels so wrong.",
            "An otherworldly sensation overcomes you.",
            "Confusion and distress overtake you as the hands of time speed up.",
            "You float in place, taking in the sights as beautiful colors buzz by and the light of day flashes against night.",
            "You feel disconnected, like you've been unplugged from the world. Time whizzes by.",
            "You approach what feels like an edge: like you could tip over at any moment, and fall deep into the abyss.",
            "What is this? What's going on? Everything feels like it's spinning.",
        ],
        offMessages: [
            "You feel a headache coming on as time slows down again.",
            "You feel a weight lifting as time slows down.",
            "You breathe a sigh of relief as the world returns to normal.",
            "Compared to how fast it just was, everything seems to grind to a halt.",
            "Clarity washes over you. You feel alert, aware, as everything goes back to normal.",
            "The forcible time-warp stops.",
            "You feel your senses return to you like the sudden snap of a rubber band.",
            "You are now keenly aware of what's around you as it all slows down.",
            "You shake your head furiously, clearing the sluggishness from your mind. You feel normal again.",
            "Your field of view warps significantly. Just how much were you even able to see? You can't remember.",
            "You simply float right where you are, still coming to your senses.",
            "Your vision sharpens. Your senses are keen. You can feel everything again.",
            "You come back from the brink, exhaustion replaced by energy and enthusiasm.",
        ],

        init() {
            if (!SharkGame.flags.minuteHandTimer) {
                SharkGame.flags.minuteHandTimer = 60000 + 30000 * SharkGame.Aspects.theHourHand.level;
            }
            if (!SharkGame.persistentFlags.selectedMultiplier) {
                SharkGame.persistentFlags.selectedMultiplier = 2;
            }
            if (SharkGame.persistentFlags.everIdled && $("#minute-hand-toggle").length === 0 && SharkGame.Settings.current.idleEnabled) {
                const multDiv = $("<div>").attr("id", "minute-hand-multipliers-div");
                SharkGame.Button.makeHoverscriptButton(
                    "minute-hand-toggle",
                    "my cool button",
                    $("#minute-hand-div"),
                    res.minuteHand.toggleMinuteHand,
                    null,
                    null
                );
                SharkGame.Button.makeHoverscriptButton("minute-hand-2", "x2", multDiv, res.minuteHand.changeSelectedMultiplier, null, null).addClass(
                    "minuteHandMultiplierSelector"
                );
                SharkGame.Button.makeHoverscriptButton("minute-hand-4", "x4", multDiv, res.minuteHand.changeSelectedMultiplier, null, null).addClass(
                    "minuteHandMultiplierSelector"
                );
                SharkGame.Button.makeHoverscriptButton(
                    "minute-hand-16",
                    "x16",
                    multDiv,
                    res.minuteHand.changeSelectedMultiplier,
                    null,
                    null
                ).addClass("minuteHandMultiplierSelector");
                SharkGame.Button.makeHoverscriptButton(
                    "minute-hand-64",
                    "x64",
                    multDiv,
                    res.minuteHand.changeSelectedMultiplier,
                    null,
                    null
                ).addClass("minuteHandMultiplierSelector");
                SharkGame.Button.makeHoverscriptButton(
                    "minute-hand-512",
                    "fast",
                    multDiv,
                    res.minuteHand.changeSelectedMultiplier,
                    null,
                    null
                ).addClass("minuteHandMultiplierSelector");
                $("#minute-hand-div").append(multDiv);
            }

            if (!SharkGame.persistentFlags.everIdled || !SharkGame.Settings.current.idleEnabled) {
                $("#minute-hand-div").empty();
            }
            this.changeRealMultiplier(1);
            this.active = false;
            this.changeSelectedMultiplier(null, SharkGame.persistentFlags.selectedMultiplier);
            this.updateMinuteHandLabel(0);
        },

        updateMinuteHand(timeElapsed) {
            if (typeof SharkGame.flags.minuteHandTimer !== "number") {
                return;
            }

            if (res.minuteHand.disableNextTick) {
                res.minuteHand.disableNextTick = false;
                if (res.minuteHand.active) {
                    res.minuteHand.toggleMinuteHand();
                }
            } else if (!res.minuteHand.active) {
                SharkGame.flags.minuteHandTimer += timeElapsed;
            } else {
                SharkGame.flags.minuteHandTimer -= timeElapsed * (res.minuteHand.realMultiplier - 1);
                if (SharkGame.flags.minuteHandTimer < 0) {
                    res.minuteHand.disableNextTick = true;
                    res.minuteHand.changeRealMultiplier(SharkGame.flags.minuteHandTimer + res.minuteHand.realMultiplier - 1);
                    SharkGame.flags.minuteHandTimer = 0;
                    res.minuteHand.toggleMinuteHand();
                }
            }
            res.minuteHand.updateMinuteHandLabel();
        },

        toggleMinuteHand() {
            if (!res.minuteHand.active && SharkGame.flags.minuteHandTimer > 0) {
                res.minuteHand.active = true;
                res.minuteHand.changeRealMultiplier(SharkGame.persistentFlags.selectedMultiplier);
                $("#minute-hand-toggle").addClass("minuteOn");
                log.addMessage("<span class='minuteOn'>" + SharkGame.choose(res.minuteHand.onMessages) + "</span>");
            } else if (res.minuteHand.active) {
                res.minuteHand.active = false;
                res.minuteHand.changeRealMultiplier(1);
                $("#minute-hand-toggle").removeClass("minuteOn");
                log.addMessage("<span class='minuteOff'>" + SharkGame.choose(res.minuteHand.offMessages) + "</span>");
            }
        },

        changeSelectedMultiplier(_event, arbitrary) {
            let multiplier = SharkGame.persistentFlags.selectedMultiplier;
            $("#minute-hand-" + multiplier).removeClass("disabled");
            if (arbitrary) {
                multiplier = arbitrary;
            } else {
                multiplier = parseInt($(this).attr("id").split("-")[2]);
            }
            $("#minute-hand-" + multiplier).addClass("disabled");
            SharkGame.persistentFlags.selectedMultiplier = multiplier;
            if (res.minuteHand.active) {
                res.minuteHand.changeRealMultiplier(multiplier);
            }
        },

        changeRealMultiplier(someNumber) {
            res.specialMultiplier /= res.minuteHand.realMultiplier;
            res.minuteHand.realMultiplier = someNumber;
            res.specialMultiplier *= res.minuteHand.realMultiplier;
        },

        updateMinuteHandLabel() {
            if (!res.minuteHand.active) {
                $("#minute-hand-toggle").html(
                    "<span class='click-passthrough bold'>ENABLE MINUTE HAND (" + (SharkGame.flags.minuteHandTimer / 1000).toFixed(1) + "s)</span>"
                );
            } else {
                $("#minute-hand-toggle").html(
                    "<span class='click-passthrough bold'>DISABLE MINUTE HAND (" + (SharkGame.flags.minuteHandTimer / 1000).toFixed(1) + "s)</span>"
                );
            }
            if (SharkGame.flags.minuteHandTimer === 0) {
                $("#minute-hand-toggle").addClass("disabled");
            } else {
                $("#minute-hand-toggle").removeClass("disabled");
            }
        },
    },

    // add rows to table (more expensive than updating existing DOM elements)
    reconstructResourcesTable() {
        res.resetResourceTableMinWidth();

        let resourceTable = $("#resourceTable");

        const statusDiv = $("#status");
        if (SharkGame.Settings.current.smallTable) {
            resourceTable.addClass("littleGeneralText");
        } else {
            resourceTable.removeClass("littleGeneralText");
        }
        // if resource table does not exist, create
        if (resourceTable.length <= 0) {
            // check for aspect level here later
            statusDiv.prepend($("<div>").attr("id", "token-div"));
            statusDiv.prepend($("<div>").attr("id", "token-description"));
            statusDiv.prepend($("<div>").attr("id", "minute-hand-div"));
            statusDiv.prepend("<h3>Stuff</h3>");
            const tableContainer = $("<div>").attr("id", "resourceTableContainer");
            resourceTable = $("<table>").attr("id", "resourceTable");
            tableContainer.append(resourceTable);
            statusDiv.append(tableContainer);
        }

        // remove the table contents entirely
        resourceTable.empty();

        let anyResourcesInTable = false;

        if (SharkGame.Settings.current.groupResources) {
            $.each(SharkGame.ResourceCategories, (categoryName, category) => {
                if (res.isCategoryVisible(category)) {
                    const icon = res.collapsedRows.has(categoryName) ? "⯈" : "⯆";
                    const headerRow = $("<tr>")
                        .append(
                            $("<td>")
                                .attr("colSpan", 3)
                                .append(
                                    $("<h3>").html(`<span class="collapser">${icon}</span><span>${categoryName}</span>`).css("text-align", "left")
                                )
                        )
                        .on("click", () => SharkGame.Resources.collapseResourceTableRow(categoryName));

                    resourceTable.append(headerRow);
                    _.each(category.resources, (resource) => {
                        if (
                            res.getTotalResource(resource) > 0 ||
                            (SharkGame.PlayerResources.get(resource).discovered && world.doesResourceExist(resource))
                        ) {
                            if (!res.collapsedRows.has(categoryName)) {
                                const row = res.constructResourceTableRow(resource);
                                resourceTable.append(row);
                            }
                            anyResourcesInTable = true;
                        }
                    });
                }
            });
        } else {
            // iterate through data, if total amount > 0 add a row
            SharkGame.ResourceMap.forEach((_resource, resourceId) => {
                if (
                    (res.getTotalResource(resourceId) > 0 || SharkGame.PlayerResources.get(resourceId).discovered) &&
                    world.doesResourceExist(resourceId) &&
                    res.isCategoryVisible(SharkGame.ResourceCategories[res.getCategoryOfResource(resourceId)])
                ) {
                    const row = res.constructResourceTableRow(resourceId);
                    resourceTable.append(row);
                    anyResourcesInTable = true;
                }
            });
        }

        // if the table is still empty, hide the status div
        // otherwise show it
        if (!anyResourcesInTable) {
            statusDiv.hide();
        } else {
            statusDiv.show();
            _.each(res.tokens.list, (token) => {
                if (SharkGame.flags.tokens && SharkGame.flags.tokens[token.attr("id")] !== "NA") {
                    res.tokens.reapplyToken(token);
                }
            });
        }

        res.setResourceTableMinWidth();

        res.rebuildTable = false;
    },

    setResourceTableMinWidth() {
        $("#resourceTable").css("min-width", $("#resourceTable").outerWidth() + "px");
    },

    resetResourceTableMinWidth() {
        $("#resourceTable").css("min-width", "0px");
    },

    collapseResourceTableRow(categoryName) {
        if (this.collapsedRows.has(categoryName)) {
            this.collapsedRows.delete(categoryName);
        } else {
            this.collapsedRows.add(categoryName);
        }
        this.reconstructResourcesTable();
    },

    constructResourceTableRow(resourceKey) {
        const playerResources = SharkGame.PlayerResources.get(resourceKey);
        const income = res.getIncome(resourceKey);
        const row = $("<tr>").attr("id", resourceKey).on("mouseenter", res.tableTextEnter).on("mouseleave", res.tableTextLeave);
        if (playerResources.totalAmount > 0 || SharkGame.PlayerResources.get(resourceKey).discovered) {
            row.append(
                $("<td>")
                    .attr("id", "resource-" + resourceKey)
                    .html(sharktext.getResourceName(resourceKey))
                    .on("dragstart", res.tokens.handleResourceDragStart)
                    .on("dragover", (event) => {
                        if (res.tokens.canBePlacedOn("resource-" + resourceKey) && res.tokens.chromeForcesWorkarounds) {
                            if (SharkGame.Settings.current.showTooltips) {
                                $("#tooltipbox").html(
                                    sharktext.getResourceName(resourceKey, false, 69, sharkcolor.getElementColor("tooltipbox", "background-color")) +
                                        " efficiency x" +
                                        (SharkGame.Aspects.coordinatedCooperation.level + 2)
                                );
                            }
                            event.originalEvent.preventDefault();
                        }
                    })
                    .on("dragend", res.tokens.handleDragEnd)
                    // .on("dragleave", () => {
                    //     $("#tooltipbox").html("");
                    // })
                    .on("drop", res.tokens.dropToken)
                    .on("click", res.tokens.tryClickToPlace)
            );

            row.append(
                $("<td>")
                    .attr("id", "amount-" + resourceKey)
                    .html("⠀" + sharktext.beautify(playerResources.amount))
            );

            const incomeId = $("<td>").attr("id", "income-" + resourceKey);

            row.append(incomeId);

            if (Math.abs(income) > SharkGame.EPSILON) {
                const changeChar = income > 0 ? "+" : "";
                incomeId
                    .html(
                        "⠀<span class='click-passthrough' style='color:" +
                            res.INCOME_COLOR +
                            "'>" +
                            changeChar +
                            sharktext.beautifyIncome(income) +
                            "</span>"
                    )
                    .on("dragstart", res.tokens.handleResourceDragStart)
                    .on("dragover", (event) => {
                        if (res.tokens.canBePlacedOn("income-" + resourceKey) && res.tokens.chromeForcesWorkarounds) {
                            if (SharkGame.Settings.current.showTooltips) {
                                $("#tooltipbox").html(
                                    "all " +
                                        sharktext.getResourceName(
                                            resourceKey,
                                            false,
                                            69,
                                            sharkcolor.getElementColor("tooltipbox", "background-color")
                                        ) +
                                        " gains x" +
                                        (SharkGame.Aspects.coordinatedCooperation.level + 2)
                                );
                            }
                            event.originalEvent.preventDefault();
                        }
                    })
                    .on("dragend", res.tokens.handleDragEnd)
                    // .on("dragleave", () => {
                    //     $("#tooltipbox").html("");
                    // })
                    .on("drop", res.tokens.dropToken)
                    .on("click", res.tokens.tryClickToPlace);
            }
        }
        return row;
    },

    tableTextEnter(_mouseEnterEvent, resourceName) {
        if (!SharkGame.Settings.current.showTooltips) {
            return;
        }
        if (!resourceName) {
            resourceName = $(this).attr("id");
            if (!resourceName) return;
        }
        const generators = SharkGame.FlippedBreakdownIncomeTable.get(resourceName);
        let isGeneratingText = "";
        let isConsumingText = "";
        $.each(SharkGame.BreakdownIncomeTable.get(resourceName), (generatedResource, amount) => {
            if (!world.doesResourceExist(generatedResource)) return true;
            if (amount > 0) {
                isGeneratingText += `<br>
                ${sharktext
                    .beautifyIncome(
                        amount,
                        " " + sharktext.getResourceName(generatedResource, false, false, sharkcolor.getElementColor("tooltipbox", "background-color"))
                    )
                    .bold()}`;
            } else if (amount < 0) {
                isConsumingText += `<br>
                ${sharktext
                    .beautifyIncome(
                        -amount,
                        " " + sharktext.getResourceName(generatedResource, false, false, sharkcolor.getElementColor("tooltipbox", "background-color"))
                    )
                    .bold()}`;
            }
        });
        let producertext = "";
        let consumertext = "";
        $.each(generators, (which, amount) => {
            if (Math.abs(amount) > SharkGame.EPSILON) {
                if (amount > 0) {
                    producertext += "<br>";
                    producertext +=
                        (which === "world" ? "" : "<strong>" + sharktext.beautify(res.getResource(which)) + "</strong> ") +
                        sharktext.getResourceName(which, false, false, sharkcolor.getElementColor("tooltipbox", "background-color")) +
                        "  <span class='littleTooltipText'>at</span>  " +
                        sharktext.beautifyIncome(amount).bold();
                } else if (amount < 0) {
                    consumertext += "<br>";
                    consumertext +=
                        (which === "world" ? "" : "<strong>" + sharktext.beautify(res.getResource(which)) + "</strong> ") +
                        sharktext.getResourceName(which, false, false, sharkcolor.getElementColor("tooltipbox", "background-color")) +
                        "  <span class='littleTooltipText'>at</span>  " +
                        sharktext.beautifyIncome(-amount).bold();
                }
            }
        });

        let text = sharktext.getResourceName(resourceName, false, 2, sharkcolor.getElementColor("tooltipbox", "background-color"));
        if (isGeneratingText !== "") {
            text +=
                "<br><span class='littleTooltipText'>" + sharktext.getIsOrAre(resourceName).toUpperCase() + " PRODUCING</span>" + isGeneratingText;
        }
        if (isConsumingText !== "") {
            text += "<br><span class='littleTooltipText'>" + sharktext.getIsOrAre(resourceName).toUpperCase() + " CONSUMING</span>" + isConsumingText;
        }
        if ((isGeneratingText || isConsumingText) && (producertext || consumertext)) {
            text += "<br><span class='littleTooltipText'>and</span>";
        }
        if (producertext !== "") {
            text += "<br><span class='littleTooltipText'>" + sharktext.getIsOrAre(resourceName).toUpperCase() + " PRODUCED BY</span>" + producertext;
        }
        if (consumertext !== "") {
            text += "<br><span class='littleTooltipText'>" + sharktext.getIsOrAre(resourceName).toUpperCase() + " CONSUMED BY</span>" + consumertext;
        }

        if (SharkGame.ResourceMap.get(resourceName).desc) {
            text += "<hr class='hrForTooltipSeparation'><span class='medDesc'>" + SharkGame.ResourceMap.get(resourceName).desc + "</span>";
        }
        if (document.getElementById("tooltipbox").innerHTML !== text.replace(/'/g, '"')) {
            document.getElementById("tooltipbox").innerHTML = text;
        }
        $("#tooltipbox").removeClass("forHomeButtonOrGrotto").removeClass("gives-consumer").attr("current", "");
        $(".tooltip").addClass("forIncomeTable").attr("current", resourceName);
    },

    tableTextLeave() {
        document.getElementById("tooltipbox").innerHTML = "";
        $(".tooltip").removeClass("forIncomeTable").attr("current", "");
    },

    buildIncomeNetwork() {
        // completes the network of resources whose incomes are affected by other resources
        // takes the order of the gia and reverses it to get the rgad.

        const gia = SharkGame.GeneratorIncomeAffectors;
        const rgad = SharkGame.GeneratorIncomeAffected;
        const resourceCategories = SharkGame.ResourceCategories;
        // recursively parse the gia
        $.each(gia, (affectorResource) => {
            $.each(gia[affectorResource], (type) => {
                $.each(gia[affectorResource][type], (affectedGeneratorCategory, value) => {
                    // is it a category or a generator?
                    const nodes = res.isCategory(affectedGeneratorCategory)
                        ? resourceCategories[affectedGeneratorCategory].resources
                        : [affectedGeneratorCategory];
                    // recursively reconstruct the table with the keys in the inverse order
                    // eslint-disable-next-line id-length
                    $.each(nodes, (_k, affectedGenerator) => {
                        if (world.doesResourceExist(affectedGenerator) && world.doesResourceExist(affectorResource)) {
                            res.addNetworkNode(rgad, affectedGenerator, type, affectorResource, value);
                        }
                    });
                });
            });
        });

        // resources incomes below, generators above
        const ria = SharkGame.ResourceIncomeAffectors;
        const rad = SharkGame.ResourceIncomeAffected;
        // recursively parse the ria
        $.each(ria, (affectorResource) => {
            $.each(ria[affectorResource], (type) => {
                $.each(ria[affectorResource][type], (affectedResourceCategory, degree) => {
                    // is it a category?
                    const nodes = res.isCategory(affectedResourceCategory)
                        ? resourceCategories[affectedResourceCategory].resources
                        : [affectedResourceCategory];
                    // recursively reconstruct the table with the keys in the inverse order
                    // eslint-disable-next-line id-length
                    $.each(nodes, (_k, affectedResource) => {
                        if (world.doesResourceExist(affectedResource) && world.doesResourceExist(affectorResource)) {
                            res.addNetworkNode(rad, affectedResource, type, affectorResource, degree);
                        }
                    });
                });
            });
        });
    },

    clearNetworks() {
        SharkGame.GeneratorIncomeAffected = {};
        SharkGame.ResourceIncomeAffected = {};
    },

    /**
     * Adds a parameter in a nested object, specifically 3 layers deep.
     * @param {object} network The nested object to add a paramater to
     * @param {string} high The top-level parameter to index
     * @param {string} mid The second-level paramater to index
     * @param {string} low The paramater to assign
     * @param {number} value The value of that parameter
     */
    addNetworkNode(network, high, mid, low, value) {
        if (!network[high]) {
            network[high] = {};
        }
        if (!network[high][mid]) {
            network[high][mid] = {};
        }
        network[high][mid][low] = value;
    },

    /**
     * Completes the necessary steps to apply the effects of a modifier to the income table.
     * @param {string} name The index of the modifier in the modifier map.
     * @param {string} target The affected resource or category of resources.
     * @param {any} degree The incoming change to the modifier, or a separate value denoting the strength of a world modifier.
     */
    applyModifier(name, target, degree) {
        if (res.isCategory(target)) {
            target = res.getResourcesInCategory(target);
        } else if (typeof target !== "object") {
            target = [target];
        }
        _.each(target, (resource) => {
            const modifier = SharkGame.ModifierReference.get(name);
            const type = modifier.type;
            const category = modifier.category;
            SharkGame.ModifierMap.get(resource)[category][type][name] = modifier.apply(
                SharkGame.ModifierMap.get(resource)[category][type][name],
                degree,
                resource
            );
        });
    },

    /**
     * Reapplies the effects of all modifiers on a specific generator-income pair. Used when changing base income, which necessitates recalculation.
     * @param {string} generator The generator in question.
     * @param {string} generated The resource associated with the income.
     */
    reapplyModifiers(generator, generated) {
        let income = SharkGame.ResourceMap.get(generator).baseIncome[generated];
        SharkGame.ModifierReference.forEach((modifier, name) => {
            const generatorDegree = SharkGame.ModifierMap.get(generator)[modifier.category][modifier.type][name];
            const generatedDegree = SharkGame.ModifierMap.get(generated)[modifier.category][modifier.type][name];
            income = modifier.applyToInput(income, generatorDegree, generatedDegree, generator, generated);
        });
        SharkGame.ResourceMap.get(generator).income[generated] = income;
    },

    /**
     * Gets the combined effect of all multiplicative modifiers of a certain type on a specific generator-income pair. Used in the grotto for advanced mode.
     * @param {string} category The category of modifier (may be upgrade, world, or aspect).
     * @param {string} generator The generator in question.
     * @param {string} generated The generated resource.
     */
    getMultiplierProduct(category, generator, generated) {
        let product = 1;
        $.each(SharkGame.ModifierTypes[category].multiplier, (name, data) => {
            const generatorDegree = SharkGame.ModifierMap.get(generator)[data.category][data.type][name];
            const generatedDegree = SharkGame.ModifierMap.get(generated)[data.category][data.type][name];
            product *= data.getEffect(generatorDegree, generatedDegree, generator, generated);
        });
        return product;
    },

    testGracePeriod() {
        let grace = true;
        SharkGame.PlayerIncomeTable.forEach((income, resourceId) => {
            if (!res.isInCategory(resourceId, "harmful") && income !== 0) {
                grace = false;
            }
        });
        return grace;
    },

    /**
     * Takes an array of resources and gives back an object which is used to create text describing the resource and generator effects. It's complicated.
     * @param {object} resources Object containing each resource and how much.
     * @param {boolean} treatResourcesAsAffected Whether or not to condense the node with respect to the resources as affectors or as the affected.
     */
    condenseNode(resources, treatResourcesAsAffected) {
        function convertType(whichType, degree) {
            switch (whichType) {
                case "multiply":
                    return degree > 0 ? "increase" : "decrease";
                case "exponentiate":
                    return degree > 1 ? "multincrease" : "multdecrease";
            }
        }

        const returnable = {
            genAffect: {
                increase: {},
                decrease: {},
                multincrease: {},
                multdecrease: {},
            },
            resAffect: {
                increase: {},
                decrease: {},
                multincrease: {},
                multdecrease: {},
            },
        };
        $.each(resources, (resource, amount) => {
            let genNode;
            if (treatResourcesAsAffected) {
                genNode = SharkGame.GeneratorIncomeAffected[resource];
            } else {
                genNode = SharkGame.GeneratorIncomeAffectors[resource];
            }
            if (genNode) {
                $.each(genNode, (type, affectorObjects) => {
                    $.each(affectorObjects, (affectedGenerator, degree) => {
                        if (!returnable.genAffect[convertType(type, degree)][affectedGenerator]) {
                            switch (type) {
                                case "multiply":
                                    returnable.genAffect[convertType(type, degree)][affectedGenerator] = amount * degree;
                                    break;
                                case "exponentiate":
                                    returnable.genAffect[convertType(type, degree)][affectedGenerator] = degree ** amount;
                            }
                        } else {
                            switch (type) {
                                case "multiply":
                                    returnable.genAffect[convertType(type, degree)][affectedGenerator] += amount * degree;
                                    break;
                                case "exponentiate":
                                    returnable.genAffect[convertType(type, degree)][affectedGenerator] *= degree ** amount;
                            }
                        }
                    });
                });
            }

            let resNode;
            if (treatResourcesAsAffected) {
                resNode = SharkGame.ResourceIncomeAffected[resource];
            } else {
                resNode = SharkGame.ResourceIncomeAffectors[resource];
            }
            if (resNode) {
                $.each(resNode, (type, affectorObjects) => {
                    $.each(affectorObjects, (affectedResource, degree) => {
                        if (!returnable.resAffect[convertType(type, degree)][affectedResource]) {
                            switch (type) {
                                case "multiply":
                                    returnable.resAffect[convertType(type, degree)][affectedResource] = amount * degree;
                                    break;
                                case "exponentiate":
                                    returnable.resAffect[convertType(type, degree)][affectedResource] = degree ** amount;
                            }
                        } else {
                            switch (type) {
                                case "multiply":
                                    returnable.resAffect[convertType(type, degree)][affectedResource] += amount * degree;
                                    break;
                                case "exponentiate":
                                    returnable.resAffect[convertType(type, degree)][affectedResource] *= degree ** amount;
                            }
                        }
                    });
                });
            }
        });

        return returnable;
    },
};
