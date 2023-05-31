"use strict";
window.SharkGame = window.SharkGame || {};

window.onmousemove = (event) => {
    SharkGame.lastActivity = _.now();

    const tooltip = document.getElementById("tooltipbox");
    const posX = event.clientX;
    const posY = event.clientY;

    tooltip.style.top = Math.max(Math.min(posY - 20, window.innerHeight - tooltip.offsetHeight - 10), 20) + "px";
    // Would clip over right screen edge
    if (tooltip.offsetWidth + posX + 35 > window.innerWidth) {
        tooltip.style.left = posX - 10 - tooltip.offsetWidth + "px";
    } else {
        tooltip.style.left = posX + 15 + "px";
    }
};

$(document).on("keyup", (event) => {
    SharkGame.lastActivity = _.now();

    const mkey = SharkGame.Keybinds.modifierKeys;
    if ((mkey.ShiftLeft || mkey.ShiftRight) && !event.shiftKey) {
        mkey.ShiftLeft = 0;
        mkey.ShiftRight = 0;
    } else if ((mkey.AltLeft || mkey.AltRight) && !event.altKey) {
        mkey.AltLeft = 0;
        mkey.AltRight = 0;
    } else if ((mkey.ControlLeft || mkey.ControlRight) && !event.ctrlKey) {
        mkey.ControlLeft = 0;
        mkey.ControlRight = 0;
    }

    if (SharkGame.Keybinds.handleKeyUp(event.code)) {
        event.preventDefault();
    }
});

$(document).on("keydown", (event) => {
    SharkGame.lastActivity = _.now();
    if (SharkGame.Keybinds.handleKeyDown(event.code)) {
        event.preventDefault();
    }
});

// CORE VARIABLES AND HELPER FUNCTIONS
$.extend(SharkGame, {
    GAME_NAMES: [
        "Five Seconds A Shark",
        "Next Shark Game",
        "Next Shark Game: Barkfest",
        "Sharky Clicker",
        "Weird Oceans",
        "You Have To Name The Shark Game",
        "Shark A Lark",
        "Bark Shark",
        "Fin Idle",
        "Ray of Dreams",
        "Shark Saver",
        "Shoal Sharker",
        "Shark Souls",
        "Saucy Sharks",
        "Sharkfall",
        "Heart of Sharkness",
        "Sharks and Recreation",
        "Alone in the Shark",
        "Sharkpocalypse",
        "Shark of Darkness",
        "Strange Oceans",
        "A New Frontier",
        "Lobster's Paradise",
        "Revenge of the Crabs",
        "Shark Box",
        "Dolphin Heroes",
        "Maws",
        "Part 6, Stone Ocean",
        "Sailor Crab",
        "League of Lobsters",
        "Eel Team Six",
        "Dungeons And Dolphins",
        "Gameshark",
        "Five Nights in Frigid",
        "The Shark of Wall Street",
        ":the shark game:",
        "Sharkware Edition",
        "Help Wanted",
        "NOT FINISHED",
        "Deluxe",
        "doo doo do-do do-do",
        "DUNGEONS",
        "The Adventure Continues",
        "To Be Continued",
        "what the crab doin",
        "#TeamSeas",
        "Sharks of Rage",
        "Bedrock Edition",
        "Javascript Edition",
        "You are a Shark",
        "Mystery of Shark City",
        "Modded",
        "8 hours later...",
        "Seas of Loathing",
        "Raiders of the Lost Shark",
    ],
    GAME_NAME: null,
    ACTUAL_GAME_NAME: "Shark Game",
    VERSION: "20220712a",
    ORIGINAL_VERSION: 0.71,
    VERSION_NAME: "The Volcanic Update",
    EPSILON: 1e-6, // floating point comparison is a joy
    BIGGEST_SAFE_NUMBER: 1000000000000,
    MAX: 1e300,

    IDLE_THRESHOLD: 120000,
    IDLE_FADE_TIME: 5000,

    INTERVAL: 1000 / 10, // 20 FPS // I'm pretty sure 1000 / 10 comes out to 10 FPS
    dt: 1 / 10,
    before: _.now(),
    lastMouseActivity: _.now(),
    savedMouseActivity: _.now(),

    timestampLastSave: false,
    timestampGameStart: false,
    timestampRunStart: false,
    timestampRunEnd: false,
    timestampSimulated: false,

    sidebarHidden: true,
    paneGenerated: false,

    gameOver: false,
    wonGame: false,

    flags: {},
    persistentFlags: {},

    spriteIconPath: "img/sharksprites.png",
    spriteHomeEventPath: "img/sharkeventsprites.png",

    /**
     *
     * @param {any[]} choices
     * @returns {any} A random element of choices
     */
    choose(choices) {
        return choices[Math.floor(Math.random() * choices.length)];
    },
    getImageIconHTML(imagePath, width, height) {
        if (!imagePath) {
            imagePath = "http://placekitten.com/g/" + Math.floor(width) + "/" + Math.floor(height);
        }
        let imageHtml = "";
        if (SharkGame.Settings.current.iconPositions !== "off") {
            imageHtml += "<img width=" + width + " height=" + height + " src='" + imagePath + "' class='button-icon'>";
        }
        return imageHtml;
    },
    changeSprite(spritePath, imageName, imageDiv, backupImageName) {
        let spriteData = SharkGame.Sprites[imageName];
        if (!imageDiv) {
            imageDiv = $("<div>");
        }

        // if the original sprite data is undefined, try loading the backup
        if (!spriteData) {
            spriteData = SharkGame.Sprites[backupImageName];
        }

        if (spriteData) {
            imageDiv.css("background-image", "url(" + spritePath + ")");
            imageDiv.css("background-position", "-" + spriteData.frame.x + "px -" + spriteData.frame.y + "px");
            imageDiv.width(spriteData.frame.w);
            imageDiv.height(spriteData.frame.h);
        } else {
            imageDiv.css("background-image", 'url("//placehold.it/50x50")');
            imageDiv.width(50);
            imageDiv.height(50);
        }
        return imageDiv;
    },
});

SharkGame.Main = {
    tickHandler: -1,
    autosaveHandler: -1,

    applyFramerate() {
        SharkGame.INTERVAL = 1000 / SharkGame.Settings.current.framerate;
        SharkGame.dt = 1 / SharkGame.Settings.current.framerate;
        if (main.tickHandler) {
            clearInterval(main.tickHandler);
        }
        main.tickHandler = setInterval(main.tick, SharkGame.INTERVAL);
    },

    // specifically wipe all progress
    resetGame() {
        SharkGame.Save.wipeSave();
        main.wipeGame();
        main.setUpGame();
    },

    // start the game
    init() {
        // check to see if i forgot to categorize something
        main.checkForCategorizationOversights();

        // wipe it
        main.wipeGame();
        // load a save if needed
        main.restoreGame("load");
        // then set up the game according to this data
        main.setUpGame();

        const isSafari =
            /constructor/i.test(window.HTMLElement) ||
            (!window.safari || (typeof safari !== "undefined" && window.safari.pushNotification)).toString() === "[object SafariRemoteNotification]";
        if (isSafari) {
            console.info("Detected Safari browser!");
            SharkGame.PaneHandler.addPaneToStack("Safari Notice", SharkGame.Panes.safariNotice);
        }
    },

    // reset all game variables to their defaults
    // leaves a blank slate
    wipeGame() {
        const now = _.now();
        SharkGame.before = now;
        SharkGame.timestampSimulated = now;
        SharkGame.lastActivity = now;
        if (SharkGame.GAME_NAME === null) {
            SharkGame.GAME_NAME = SharkGame.choose(SharkGame.GAME_NAMES);
            document.title = SharkGame.ACTUAL_GAME_NAME + ": " + SharkGame.GAME_NAME;
        }

        SharkGame.timestampLastSave = now;
        SharkGame.timestampGameStart = now;
        SharkGame.timestampRunStart = now;

        $("#game").removeClass("inGateway");
        $("#sidebar").hide();
        $("#overlay").hide();
        $("#idle-overlay").hide();
        SharkGame.sidebarHidden = true;
        // remove any errant classes
        $("#pane").removeClass("gateway");

        // clear any html and remove errant classes from tooltip
        $("#tooltipbox")
            .removeClass("forHomeButtonOrGrotto")
            .removeClass("forIncomeTable")
            .removeClass("forAspectTree")
            .removeClass("forAspectTreeUnpurchased")
            .removeClass("forAspectTreeAffordable")
            .html("");

        $("#gameName").html("- " + SharkGame.GAME_NAME + " -");
        $("#versionNumber").html(
            `New Frontiers v ${SharkGame.VERSION} - ${SharkGame.VERSION_NAME}<br/>\
Mod of v ${SharkGame.ORIGINAL_VERSION}`
        );
        $.getJSON("https://api.github.com/repos/Toby222/SharkGame/commits/dev", (data) => {
            SharkGame.COMMIT_SHA = data.sha;
        });
        log.clearMessages(false);
        SharkGame.Settings.current.buyAmount = 1;

        // here to stop timer from saying NaN
        SharkGame.persistentFlags.totalPausedTime = 0;
        SharkGame.persistentFlags.currentPausedTime = 0;

        // wipe all resource tables
        SharkGame.Resources.init();

        // initialise world
        // MAKE SURE GATE IS INITIALISED AFTER WORLD!!
        SharkGame.World.init();

        // reset planetpool and completed worlds and gameover and wongame
        SharkGame.Gateway.init();

        // create homeEvent lookup
        SharkGame.Memories.init();

        // generate requiredBy entries
        SharkGame.AspectTree.init();

        // initialise tabs
        SharkGame.Home.init();
        SharkGame.Lab.init();
        SharkGame.Stats.init();
        SharkGame.Recycler.init();
        SharkGame.Gate.init();
        SharkGame.Reflection.init();
        SharkGame.CheatsAndDebug.init();

        // clear flags
        SharkGame.flags = {};
        SharkGame.persistentFlags = {};

        SharkGame.EventHandler.init();

        SharkGame.TitleBarHandler.init();
        SharkGame.TabHandler.init();
        SharkGame.PaneHandler.init();
        SharkGame.OverlayHandler.init();

        SharkGame.Keybinds.init();

        SharkGame.Resources.minuteHand.init();
        SharkGame.Resources.pause.init();
        SharkGame.Resources.dial.init();
    },

    // load stored game data, if there is anything to load
    restoreGame(goal) {
        switch (goal) {
            case "load":
                if (SharkGame.Save.savedGameExists()) {
                    try {
                        SharkGame.Save.loadGame();
                        log.addMessage("Loaded game.");
                    } catch (err) {
                        log.addError(err);
                    }
                }
                break;
            case "loop":
                // idk yet
                break;
            default:
            // nothing to restore
        }
    },

    // interpret and use the data from the previous steps
    setUpGame() {
        const now = _.now();
        SharkGame.timestampLastSave = SharkGame.timestampLastSave || now;
        SharkGame.timestampGameStart = SharkGame.timestampGameStart || now;
        SharkGame.timestampRunStart = SharkGame.timestampRunStart || now;

        // first set up the world because it adds the world resource
        SharkGame.World.setup();

        // refund aspects if necessary
        // create restrictions
        SharkGame.AspectTree.setup();

        SharkGame.Memories.setup();

        // now set up resources because a lot depends on it
        SharkGame.Resources.setup();

        // initialise tabs
        // always set up lab first
        SharkGame.Lab.setup();
        SharkGame.Home.setup();
        SharkGame.Stats.setup();
        SharkGame.Recycler.setup();
        SharkGame.Gate.setup();
        SharkGame.Reflection.setup();
        SharkGame.CheatsAndDebug.setup();

        SharkGame.EventHandler.setup();

        res.minuteHand.setup();
        res.tokens.init();

        // end game if necessary
        SharkGame.Gateway.setup();

        // rename a game option if this is a first time run
        SharkGame.TitleBarHandler.correctTitleBar();

        // apply tick settings
        main.applyFramerate();

        // apply settings
        $.each(SharkGame.Settings, (settingId, settingData) => {
            if (_.isUndefined(SharkGame.Settings.current[settingId])) {
                SharkGame.Settings.current[settingId] = settingData.defaultSetting;
                if (typeof settingData.onChange === "function") {
                    settingData.onChange();
                }
            }
        });

        SharkGame.TitleBarHandler.updateTopBar();

        if (main.autosaveHandler === -1) {
            main.autosaveHandler = setInterval(main.autosave, SharkGame.Settings.current.autosaveFrequency * 60000);
        }

        // window.addEventListener("beforeunload", main.autosave);

        if (SharkGame.Settings.current.updateCheck) {
            main.checkForUpdateHandler = setInterval(main.checkForUpdate, 300000);
        }

        $("#title").on("click", (event) => {
            if (event.clientX < 100 && event.clientY > 150 && event.clientY < 200) {
                event.currentTarget.classList.add("radical");
            }
        });

        if (!SharkGame.persistentFlags.dialSetting) SharkGame.persistentFlags.dialSetting = 1;

        if (SharkGame.persistentFlags.pause) {
            if (!cad.pause) {
                res.pause.togglePause();
            }
            main.showSidebarIfNeeded();
            if (SharkGame.flags.needOfflineProgress && SharkGame.Settings.current.truePause) {
                SharkGame.persistentFlags.currentPausedTime += SharkGame.flags.needOfflineProgress * 1000;
                SharkGame.flags.needOfflineProgress = 0;
            }
        }

        if (SharkGame.flags.needOfflineProgress) {
            const secondsElapsed = SharkGame.flags.needOfflineProgress;

            if (SharkGame.Settings.current.idleEnabled && !SharkGame.gameOver) {
                res.minuteHand.allowMinuteHand();
                res.minuteHand.updateMinuteHand(secondsElapsed * 1000);
                if (SharkGame.Aspects.overtime.level) {
                    res.minuteHand.updateMinuteHand(secondsElapsed * 200 * SharkGame.Aspects.overtime.level);
                    res.minuteHand.addBonusTime(secondsElapsed * 200 * SharkGame.Aspects.overtime.level);
                }
            } else {
                main.processSimTime(secondsElapsed / SharkGame.persistentFlags.dialSetting, true);
            }

            // acknowledge long time gaps
            // (update these messages some time later)
            if (secondsElapsed > 3600) {
                let notification = "Welcome back! It's been ";
                const numHours = Math.floor(secondsElapsed / 3600);
                if (numHours > 24) {
                    const numDays = Math.floor(numHours / 24);
                    if (numDays > 7) {
                        const numWeeks = Math.floor(numDays / 7);
                        if (numWeeks > 4) {
                            const numMonths = Math.floor(numWeeks / 4);
                            if (numMonths > 12) {
                                const numYears = Math.floor(numMonths / 12);
                                notification +=
                                    "almost " +
                                    (numYears === 1 ? "a" : numYears) +
                                    " year" +
                                    sharktext.plural(numYears) +
                                    ", thanks for remembering this exists!";
                            } else {
                                notification +=
                                    "like " +
                                    (numMonths === 1 ? "a" : numMonths) +
                                    " month" +
                                    sharktext.plural(numMonths) +
                                    ", it's getting kinda crowded.";
                            }
                        } else {
                            notification +=
                                "about " + (numWeeks === 1 ? "a" : numWeeks) + " week" + sharktext.plural(numWeeks) + ", you were gone a while!";
                        }
                    } else {
                        notification +=
                            (numDays === 1 ? "a" : numDays) + " day" + sharktext.plural(numDays) + ", and look at all the stuff you have now!";
                    }
                } else {
                    notification += (numHours === 1 ? "an" : numHours) + " hour" + sharktext.plural(numHours) + " since you were seen around here!";
                }
                log.addMessage(notification);
            }
            SharkGame.flags.needOfflineProgress = 0;
        }

        // set up tab after load
        SharkGame.TabHandler.setUpTab();
    },

    purgeGame() {
        // empty out all the containers!
        $("#status").empty();
        log.clearMessages();
        $("#content").empty();
    },

    loopGame() {
        $("body").css("overscroll-behavior-x", "unset");
        if (SharkGame.gameOver) {
            SharkGame.persistentFlags.totalPausedTime = 0;
            SharkGame.persistentFlags.currentPausedTime = 0;

            // populate save data object
            let saveString = "";
            const saveData = {
                version: SharkGame.VERSION,
                resources: {},
                world: { type: world.worldType },
                aspects: {},
            };

            _.each(SharkGame.ResourceCategories.special.resources, (resourceName) => {
                saveData.resources[resourceName] = {
                    amount: res.getResource(resourceName),
                    totalAmount: res.getTotalResource(resourceName),
                };
            });

            _.each(SharkGame.Aspects, ({ level }, aspectId) => {
                if (level) saveData.aspects[aspectId] = level;
            });

            saveData.settings = _.cloneDeep(SharkGame.Settings.current);

            saveData.completedWorlds = _.cloneDeep(SharkGame.Gateway.completedWorlds);
            saveData.persistentFlags = _.cloneDeep(SharkGame.persistentFlags);
            saveData.planetPool = _.cloneDeep(gateway.planetPool);

            // add timestamp
            saveData.timestampLastSave = _.now();
            saveData.timestampGameStart = SharkGame.timestampGameStart;
            saveData.timestampRunStart = _.now();
            saveData.timestampRunEnd = SharkGame.timestampRunEnd;

            saveData.keybinds = _.cloneDeep(SharkGame.Keybinds.keybinds);

            saveData.saveVersion = SharkGame.Save.saveUpdaters.length - 1;
            saveString = ascii85.encode(pako.deflate(JSON.stringify(saveData), { to: "string" }));

            SharkGame.Save.importData(saveString);

            res.minuteHand.applyHourHand();
            res.minuteHand.giveRequestedTime();

            try {
                SharkGame.Save.saveGame();
                log.addMessage("Game saved.");
            } catch (err) {
                log.addError(err);
            }
        }
    },

    tick() {
        if (cad.stop) {
            return;
        }

        const now = _.now();
        const elapsedTime = now - SharkGame.before;

        if (cad.pause) {
            if (SharkGame.Settings.current.truePause) {
                SharkGame.persistentFlags.currentPausedTime += _.now() - SharkGame.before;
            } else {
                if (!SharkGame.persistentFlags.everIdled) {
                    res.minuteHand.allowMinuteHand();
                }
                res.minuteHand.updateMinuteHand(elapsedTime * (1 + SharkGame.Aspects.overtime.level * 0.2));
                res.minuteHand.addBonusTime(elapsedTime * SharkGame.Aspects.overtime.level * 0.2);
            }
            SharkGame.before = now;
            SharkGame.lastActivity = now;
            switch (SharkGame.Tabs.current) {
                case "home":
                    $.each($("#buttonList").children(), (_index, button) => {
                        $(button).addClass("disabled");
                    });
                    break;
                case "lab":
                    $.each($("#buttonList").children(), (_index, button) => {
                        $(button).addClass("disabled");
                    });
                    break;
                default:
                    SharkGame.Tabs[SharkGame.Tabs.current].code.update();
            }
            res.updateResourcesTable();
            return;
        }

        if (!SharkGame.gameOver) {
            SharkGame.EventHandler.handleEventTick("beforeTick");

            if (SharkGame.persistentFlags.currentPausedTime) {
                SharkGame.persistentFlags.totalPausedTime += SharkGame.persistentFlags.currentPausedTime;
                SharkGame.persistentFlags.currentPausedTime = 0;
            }

            // tick main game stuff
            if (now - SharkGame.lastActivity > SharkGame.IDLE_THRESHOLD && res.idleMultiplier === 1 && SharkGame.Settings.current.idleEnabled) {
                main.startIdle(now, elapsedTime);
            }

            if (res.idleMultiplier < 1) {
                main.continueIdle(now, elapsedTime);
            }

            if (res.minuteHand.active) {
                res.minuteHand.updateMinuteHand(elapsedTime);
            } else if (SharkGame.Aspects.overtime.level) {
                res.minuteHand.updateMinuteHand(elapsedTime * 0.2 * SharkGame.Aspects.overtime.level);
                res.minuteHand.addBonusTime(elapsedTime * 0.2 * SharkGame.Aspects.overtime.level);
            }

            // check if the sidebar needs to come back
            if (SharkGame.sidebarHidden) {
                main.showSidebarIfNeeded();
            }

            if (elapsedTime > SharkGame.INTERVAL) {
                // Compensate for lost time.
                main.processSimTime(SharkGame.dt * (elapsedTime / SharkGame.INTERVAL));
            } else {
                main.processSimTime(SharkGame.dt);
            }

            res.updateResourcesTable();

            const tabCode = SharkGame.Tabs[SharkGame.Tabs.current].code;
            tabCode.update();

            SharkGame.TabHandler.checkTabUnlocks();

            SharkGame.before = now;

            SharkGame.EventHandler.handleEventTick("afterTick");
        } else {
            SharkGame.lastActivity = _.now();
        }

        // see if resource table tooltip needs updating
        if (document.getElementById("tooltipbox").className.split(" ").includes("forIncomeTable")) {
            if (document.getElementById("tooltipbox").attributes.current) {
                res.tableTextEnter(null, document.getElementById("tooltipbox").attributes.current.value);
            }
        }
    },

    startIdle(now, elapsedTime) {
        const idleOverlay = $("#idle-overlay");
        idleOverlay.addClass("pointy").removeClass("click-passthrough");
        idleOverlay.on("click", main.endIdle);
        if (idleOverlay.is(":hidden")) {
            $("#minute-hand-div").addClass("front");
            idleOverlay.show().css("opacity", 0).animate({ opacity: 0.8 }, SharkGame.IDLE_FADE_TIME);
        }
        res.minuteHand.toggleOff();
        SharkGame.savedMouseActivity = SharkGame.lastActivity;
        main.continueIdle(now, elapsedTime);
    },

    continueIdle(now, elapsedTime) {
        const speedRatio = Math.min((now - SharkGame.savedMouseActivity - SharkGame.IDLE_THRESHOLD) / SharkGame.IDLE_FADE_TIME, 1);
        res.idleMultiplier = 1 - speedRatio;

        if (speedRatio > 0.8 && !SharkGame.persistentFlags.everIdled) {
            res.minuteHand.allowMinuteHand();
        }
        res.minuteHand.updateMinuteHand(elapsedTime * speedRatio);
    },

    endIdle() {
        const idleOverlay = $("#idle-overlay");
        if (!idleOverlay.is(":hidden")) {
            idleOverlay.stop(true).animate({ opacity: 0 }, 800, () => {
                $("#minute-hand-div").removeClass("front");
                idleOverlay.hide().stop(true);
            });
        }
        idleOverlay.removeClass("pointy").addClass("click-passthrough");
        SharkGame.lastActivity = _.now();
        res.idleMultiplier = 1;
    },

    processSimTime(numberOfSeconds, load = false) {
        // income calculation
        res.processIncomes(numberOfSeconds, false, load);
    },

    autosave() {
        try {
            SharkGame.Save.saveGame();
            log.addMessage("Autosaved.");
        } catch (err) {
            log.addError(err);
        }
    },

    checkForUpdate() {
        $.getJSON("https://api.github.com/repos/Toby222/SharkGame/commits/dev", (data) => {
            if (data.sha !== SharkGame.COMMIT_SHA) {
                $("#updateGameBox")
                    .html(
                        `You see a new update swimming towards you.<br> On it you can just make out the words <br>"${
                            data.commit.message.split("\n")[0]
                        }". <br>Click to update.`
                    )
                    .on("click", () => {
                        try {
                            SharkGame.Save.saveGame();
                            history.go(0);
                        } catch (err) {
                            log.addError(err);
                            console.error(err);
                            log.addMessage("Something went wrong while saving.");
                        }
                    });
            }
        });
    },

    createBuyButtons(customLabel, addToWhere, appendOrPrepend, absoluteOnly) {
        if (!addToWhere) {
            log.addError("Attempted to create buy buttons without specifying what to do with them.");
            return;
        }

        // add buy buttons
        const buttonList = $("<ul>").attr("id", "buyButtons");
        switch (appendOrPrepend) {
            case "append":
                addToWhere.append(buttonList);
                break;
            case "prepend":
                addToWhere.prepend(buttonList);
                break;
            default:
                log.addError("Attempted to create buy buttons without specifying whether to append or prepend.");
                return;
        }
        _.each(SharkGame.Settings.buyAmount.options, (amount) => {
            if (amount < 0 && absoluteOnly) {
                return true;
            }

            const disableButton = amount === SharkGame.Settings.current.buyAmount;
            buttonList.append(
                $("<li>").append(
                    $("<button>")
                        .addClass("min" + (disableButton ? " disabled" : ""))
                        .attr("id", "buy-" + amount)
                )
            );
            let label = customLabel ? customLabel + " " : "buy ";
            if (amount < 0) {
                if (amount < -2) {
                    label += "1/3 max";
                } else if (amount < -1) {
                    label += "1/2 max";
                } else {
                    label += "max";
                }
            } else if (amount === "custom") {
                label += "custom";
            } else {
                label += sharktext.beautify(amount);
            }
            $("#buy-" + amount)
                .html(label)
                .on("click", function callback() {
                    const thisButton = $(this);
                    if (thisButton.hasClass("disabled")) return;
                    if (thisButton[0].id === "buy-custom") {
                        $("#custom-input").attr("disabled", false);
                    } else {
                        $("#custom-input").attr("disabled", true);
                    }
                    SharkGame.Settings.current.buyAmount = amount === "custom" ? "custom" : parseInt(thisButton.attr("id").slice(4));
                    $("button[id^='buy-']").removeClass("disabled");
                    thisButton.addClass("disabled");
                })
                .on("mouseenter", () => {
                    $(`#tooltipbox`).html(`${label} amount of things`);
                })
                .on("mouseleave", () => {
                    $(`#tooltipbox`).html(``);
                });
        });
        buttonList.append(
            $("<li>").append(
                $("<input>")
                    .prop("type", "number")
                    .attr("id", "custom-input")
                    .attr("value", 1)
                    .attr("min", "1")
                    .attr("disabled", SharkGame.Settings.current.buyAmount !== "custom")
            )
        );
        document.getElementById("custom-input").addEventListener("input", main.onCustomChange);
        if (SharkGame.Settings.current.customSetting) {
            $("#custom-input")[0].value = SharkGame.Settings.current.customSetting;
        }
    },

    onCustomChange() {
        SharkGame.Settings.current.customSetting = $("#custom-input")[0].value;
    },

    showSidebarIfNeeded() {
        // if we have any non-zero resources, show sidebar
        // if we have any log entries, show sidebar
        if (res.haveAnyResources()) {
            // show sidebar
            if (SharkGame.Settings.current.showAnimations) {
                $("#sidebar").show("500");
            } else {
                $("#sidebar").show();
            }
            res.rebuildTable = true;
            // flag sidebar as shown
            SharkGame.sidebarHidden = false;
        }
    },

    endGame(loadingFromSave) {
        // stop autosaving
        clearInterval(main.autosaveHandler);
        main.autosaveHandler = -1;

        // flag game as over
        SharkGame.gameOver = true;

        // grab end game timestamp
        if (!loadingFromSave) {
            SharkGame.timestampRunEnd = _.now();
        }

        // kick over to passage
        gateway.enterGate(loadingFromSave);
    },

    isFirstTime() {
        return world.worldType === "start" && res.getTotalResource("essence") <= 0;
    },

    resetTimers() {
        SharkGame.timestampLastSave = _.now();
        SharkGame.timestampGameStart = _.now();
        SharkGame.timestampRunStart = _.now();
    },

    shouldShowTooltips() {
        if (!(main.isFirstTime() && res.getResource("shark") < 5)) {
            SharkGame.persistentFlags.tooltipUnlocked = true;
        }
        return SharkGame.persistentFlags.tooltipUnlocked;
    },

    checkForCategorizationOversights() {
        $.each(SharkGame.ResourceTable, (resourceName, resourceObj) => {
            if (!res.getCategoryOfResource(resourceName)) {
                log.addError(new Error(`${resourceName} does not have a category.`));
            }

            if (!resourceObj.desc) {
                log.addError(new Error(`${resourceName} does not have a description.`));
            }

            if (!resourceObj.name || !resourceObj.singleName) {
                log.addError(new Error(`${resourceName} does not have a name.`));
            }
        });
        _.each(SharkGame.Gateway.allowedWorlds, (worldName) => {
            $.each(SharkGame.HomeActions[worldName], (actionName) => {
                if (!home.getActionCategory(actionName)) {
                    log.addError(new Error(`${actionName} does not have a category.`));
                }
            });
        });
    },
};

SharkGame.Button = {
    makeHoverscriptButton(id, name, div, handler, hhandler, huhandler) {
        return $("<button>")
            .html(name)
            .attr("id", id)
            .addClass("hoverbutton")
            .appendTo(div)
            .on("click", handler)
            .on("mouseenter", hhandler)
            .on("mouseleave", huhandler);
    },

    makeButton(id, name, div, handler) {
        return $("<button>").html(name).attr("id", id).appendTo(div).on("click", handler);
    },
};

$(() => {
    $("#game").show();
    main.init();
});
