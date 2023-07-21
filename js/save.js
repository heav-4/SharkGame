"use strict";
SharkGame.Save = {
    saveFileName: "sharkGameSave",
    saveGame() {
        let saveString = "";
        const saveData = {
            version: SharkGame.VERSION,
            resources: {},
            tabs: {},
            completedRequirements: {},
            world: { type: world.worldType },
            aspects: {},
            gateway: { betweenRuns: SharkGame.gameOver, wonGame: SharkGame.wonGame },
            memories: { world: {}, persistent: {}, stats: {} },
        };
        SharkGame.PlayerResources.forEach((resource, resourceId) => {
            if (resource.amount > 0 || resource.totalAmount > 0) {
                saveData.resources[resourceId] = {
                    amount: resource.amount,
                    totalAmount: resource.totalAmount,
                };
            }
        });
        saveData.upgrades = sharkmisc.cloneDeep(SharkGame.Upgrades.purchased);
        _.each(SharkGame.Aspects, ({ level }, aspectId) => {
            if (aspectId === "deprecated")
                return;
            if (level)
                saveData.aspects[aspectId] = level;
        });
        $.each(SharkGame.Tabs, (tabId, tab) => {
            if (tabId !== "current") {
                saveData.tabs[tabId] = [tab.discovered, tab.seen];
            }
            else {
                saveData.tabs.current = tab;
            }
        });
        saveData.completedRequirements = sharkmisc.cloneDeep(SharkGame.Gate.completedRequirements);
        saveData.settings = sharkmisc.cloneDeep(SharkGame.Settings.current);
        saveData.completedWorlds = sharkmisc.cloneDeep(SharkGame.Gateway.completedWorlds);
        saveData.flags = sharkmisc.cloneDeep(SharkGame.flags);
        saveData.persistentFlags = sharkmisc.cloneDeep(SharkGame.persistentFlags);
        saveData.planetPool = sharkmisc.cloneDeep(gateway.planetPool);
        saveData.keybinds = SharkGame.Keybinds.keybinds;
        saveData.memories.world = sharkmisc.cloneDeep(SharkGame.Memories.worldMemories);
        saveData.memories.persistent = sharkmisc.cloneDeep(SharkGame.Memories.persistentMemories);
        saveData.timestampLastSave = Date.now();
        saveData.timestampGameStart = SharkGame.timestampGameStart;
        saveData.timestampRunStart = SharkGame.timestampRunStart;
        saveData.timestampRunEnd = SharkGame.timestampRunEnd;
        saveData.saveVersion = SharkGame.Save.saveUpdaters.length - 1;
        saveString = ascii85.encode(pako.deflate(JSON.stringify(saveData), { to: "string" }));
        try {
            if (saveString === undefined || saveString === "<~~>")
                throw new Error("Something went wrong while saving");
            localStorage.setItem(SharkGame.Save.saveFileName, saveString);
        }
        catch (err) {
            throw new Error("Couldn't save to local storage. Reason: " + err.message);
        }
        return saveString;
    },
    decodeSave(saveDataString) {
        if (saveDataString.substring(0, 2) === "<~") {
            try {
                saveDataString = ascii85.decode(saveDataString);
            }
            catch (err) {
                throw new Error("Saved data looked like it was encoded in ascii85, but it couldn't be decoded. Can't load. Your save: " + saveDataString);
            }
        }
        if (saveDataString.charAt(0) === "x") {
            try {
                saveDataString = pako.inflate(saveDataString, { to: "string" });
            }
            catch (err) {
                throw new Error("Saved data is compressed, but it can't be decompressed. Can't load. Your save: " + saveDataString);
            }
        }
        if (saveDataString.charAt(0) === "{") {
            try {
                return JSON.parse(saveDataString);
            }
            catch (err) {
                const errMessage = "Couldn't load save data. It didn't parse correctly. Your save: " + saveDataString;
                throw new Error(errMessage);
            }
        }
    },
    loadGame(importSaveData) {
        let saveData;
        const saveDataString = importSaveData || localStorage.getItem(SharkGame.Save.saveFileName);
        if (!saveDataString) {
            throw new Error("Tried to load game, but no game to load.");
        }
        else if (typeof saveDataString !== "string") {
            throw new Error("Tried to load game, but save wasn't a string.");
        }
        saveData = this.decodeSave(saveDataString);
        if (saveData) {
            const currentVersion = SharkGame.Save.saveUpdaters.length - 1;
            if (!sharkmisc.has(saveData, "saveVersion")) {
                saveData = SharkGame.Save.saveUpdaters[0](saveData);
            }
            else if (typeof saveData.saveVersion !== "number" || saveData.saveVersion <= 12) {
                throw new Error("This is a save from before New Frontiers 0.2, after which the save system was changed.");
            }
            else if (saveData.saveVersion === 15 || saveData.saveVersion === 16) {
                SharkGame.missingAspects = true;
            }
            if (saveData.saveVersion < currentVersion) {
                for (let i = saveData.saveVersion + 1; i <= currentVersion; i++) {
                    const updater = SharkGame.Save.saveUpdaters[i];
                    saveData = updater(saveData);
                    saveData.saveVersion = i;
                }
                log.addMessage("Updated save data from v " + saveData.version + " to " + SharkGame.VERSION + ".");
            }
            const currTimestamp = Date.now();
            if (typeof saveData.timestampLastSave !== "number") {
                saveData.timestampLastSave = currTimestamp;
            }
            if (typeof saveData.timestampGameStart !== "number") {
                saveData.timestampGameStart = currTimestamp;
            }
            if (typeof saveData.timestampRunStart !== "number") {
                saveData.timestampRunStart = currTimestamp;
            }
            if (typeof saveData.timestampRunEnd !== "number") {
                saveData.timestampRunEnd = currTimestamp;
            }
            SharkGame.timestampLastSave = saveData.timestampLastSave;
            SharkGame.timestampGameStart = saveData.timestampGameStart;
            SharkGame.timestampRunStart = saveData.timestampRunStart;
            SharkGame.timestampRunEnd = saveData.timestampRunEnd;
            SharkGame.timestampSimulated = saveData.timestampLastSave;
            SharkGame.flags = saveData.flags ? saveData.flags : {};
            SharkGame.persistentFlags = saveData.persistentFlags ? saveData.persistentFlags : {};
            $.each(saveData.resources, (resourceId, resource) => {
                if (SharkGame.PlayerResources.has(resourceId)) {
                    SharkGame.PlayerResources.get(resourceId).amount = isNaN(resource.amount) ? 0 : resource.amount;
                    SharkGame.PlayerResources.get(resourceId).totalAmount = isNaN(resource.totalAmount) ? 0 : resource.totalAmount;
                }
            });
            if (saveData.world) {
                if (!Object.keys(SharkGame.WorldTypes).includes(saveData.world.type)) {
                    world.worldType = "start";
                    gateway.badWorld = true;
                }
                else {
                    world.worldType = saveData.world.type;
                }
            }
            if (saveData.memories) {
                mem.worldMemories = saveData.memories.world || mem.worldMemories;
                mem.persistentMemories = saveData.memories.persistent || mem.persistentMemories;
            }
            SharkGame.Upgrades.purchaseQueue = [];
            _.each(saveData.upgrades, (upgradeId) => {
                SharkGame.Upgrades.purchaseQueue.push(upgradeId);
            });
            if (_.some(saveData.aspects, (_aspectLevel, aspectId) => {
                return !sharkmisc.has(SharkGame.Aspects, aspectId);
            })) {
                SharkGame.missingAspects = true;
            }
            $.each(saveData.aspects, (aspectId, level) => {
                if (sharkmisc.has(SharkGame.Aspects, aspectId)) {
                    SharkGame.Aspects[aspectId].level = level;
                }
            });
            _.each(saveData.completedWorlds, (worldType) => {
                gateway.markWorldCompleted(worldType);
            });
            if (saveData.tabs && saveData.tabs.home) {
                if (typeof saveData.tabs.home === "object") {
                    $.each(saveData.tabs, (tabName, discoveryArray) => {
                        if (sharkmisc.has(SharkGame.Tabs, tabName) && tabName !== "current") {
                            SharkGame.Tabs[tabName].discovered = discoveryArray[0];
                            SharkGame.Tabs[tabName].seen = discoveryArray[1];
                        }
                    });
                }
                else {
                    $.each(saveData.tabs, (tabName, discovered) => {
                        if (sharkmisc.has(SharkGame.Tabs, tabName) && tabName !== "current") {
                            SharkGame.Tabs[tabName].discovered = discovered;
                            SharkGame.Tabs[tabName].seen = true;
                        }
                    });
                }
            }
            if (saveData.tabs && saveData.tabs.current) {
                SharkGame.Tabs.current = saveData.tabs.current;
            }
            if (saveData.completedRequirements) {
                SharkGame.Gate.completedRequirements = sharkmisc.cloneDeep(saveData.completedRequirements);
            }
            if (saveData.planetPool) {
                gateway.planetPool = saveData.planetPool;
            }
            $.each(saveData.settings, (settingId, currentvalue) => {
                SharkGame.Settings.current[settingId] = currentvalue;
                if (SharkGame.Settings[settingId] && typeof SharkGame.Settings[settingId].onChange === "function") {
                    SharkGame.Settings[settingId].onChange();
                }
            });
            if (saveData.gateway) {
                if (typeof saveData.gateway.wonGame === "boolean") {
                    SharkGame.wonGame = saveData.gateway.wonGame;
                }
                if (typeof saveData.gateway.betweenRuns === "boolean") {
                    SharkGame.gameOver = saveData.gateway.betweenRuns;
                }
            }
            if (!SharkGame.gameOver) {
                let secondsElapsed = (Date.now() - saveData.timestampLastSave) / 1000;
                if (secondsElapsed < 0) {
                    secondsElapsed = 0;
                }
                else {
                    SharkGame.flags.needOfflineProgress = secondsElapsed;
                }
            }
            if (saveData.keybinds) {
                SharkGame.Keybinds.keybinds = saveData.keybinds;
            }
        }
        else {
            throw new Error("Couldn't load saved game. I don't know how to break this to you, but I think your save is corrupted. Your save: " + saveDataString);
        }
    },
    importData(data) {
        try {
            main.wipeGame();
            SharkGame.Save.loadGame(data);
            main.setUpGame();
        }
        catch (err) {
            log.addError(err);
        }
        SharkGame.TabHandler.setUpTab();
    },
    exportData() {
        let saveData;
        try {
            saveData = SharkGame.Save.saveGame();
        }
        catch (err) {
            log.addError(err);
        }
        if (saveData.substring(0, 2) !== "<~") {
            saveData = ascii85.encode(saveData);
        }
        return saveData;
    },
    savedGameExists(tag = "") {
        return localStorage.getItem(SharkGame.Save.saveFileName + tag) !== null;
    },
    deleteSave(tag = "") {
        localStorage.removeItem(SharkGame.Save.saveFileName + tag);
    },
    getTaggedSaveCharacteristics(tag) {
        if (tag === undefined) {
            SharkGame.Log.addError("Tried to get characteristics of a tagged save, but no tag was given.");
            throw new Error("Tried to get characteristics of a tagged save, but no tag was given.");
        }
        const save = this.decodeSave(localStorage.getItem(SharkGame.Save.saveFileName + tag));
        let text;
        if (save) {
            text = ` from ${SharkGame.TextUtil.formatTime(Date.now() - save.timestampLastSave)} ago`;
            if (save.resources.essence) {
                text += ` with ${save.resources.essence.totalAmount || 0} lifetime essence`;
            }
        }
        else {
            SharkGame.Log.addError(`Tried to get characteristics of ${SharkGame.Save.saveFileName + tag}, but no such save exists.`);
            throw new Error(`Tried to get characteristics of ${SharkGame.Save.saveFileName + tag}, but no such save exists.`);
        }
        return text;
    },
    createTaggedSave(tag) {
        if (tag === undefined) {
            SharkGame.Log.addError("Tried to create a tagged save, but no tag was given.");
            throw new Error("Tried to create a tagged save, but no tag was given.");
        }
        localStorage.setItem(SharkGame.Save.saveFileName + tag, localStorage.getItem(SharkGame.Save.saveFileName));
    },
    loadTaggedSave(tag) {
        if (tag === undefined) {
            SharkGame.Log.addError("Tried to load a tagged save, but no tag was given.");
            throw new Error("Tried to load a tagged save, but no tag was given.");
        }
        if (this.savedGameExists(tag)) {
            this.importData(localStorage.getItem(SharkGame.Save.saveFileName + tag));
        }
        else {
            SharkGame.Log.addError(`Tried to load ${SharkGame.Save.saveFileName + tag}, but no such save exists.`);
        }
    },
    wipeSave() {
        this.createTaggedSave("Backup");
        this.deleteSave();
    },
    saveUpdaters: [
        function update0(save) {
            save.saveVersion = 0;
            save.version = null;
            save.timestamp = null;
            save.resources = {};
            [
                "essence",
                "shark",
                "ray",
                "crab",
                "scientist",
                "nurse",
                "laser",
                "maker",
                "planter",
                "brood",
                "crystalMiner",
                "autoTransmuter",
                "fishMachine",
                "science",
                "fish",
                "sand",
                "crystal",
                "kelp",
                "seaApple",
                "sharkonium",
            ].forEach((resourceName) => (save.resources[resourceName] = { amount: null, totalAmount: null }));
            save.upgrades = {};
            [
                "crystalBite",
                "crystalSpade",
                "crystalContainer",
                "underwaterChemistry",
                "seabedGeology",
                "thermalVents",
                "laserRays",
                "automation",
                "engineering",
                "kelpHorticulture",
                "xenobiology",
                "biology",
                "rayBiology",
                "crabBiology",
                "sunObservation",
                "transmutation",
                "exploration",
                "farExploration",
                "gateDiscovery",
            ].forEach((upgrade) => (save.upgrades[upgrade] = null));
            save.tabs = {
                current: "home",
                home: { discovered: true },
                lab: { discovered: false },
                gate: { discovered: false },
            };
            save.settings = {
                buyAmount: 1,
                offlineModeActive: true,
                autosaveFrequency: 5,
                logMessageMax: 15,
                sidebarWidth: "25%",
                showAnimations: true,
                colorCosts: true,
            };
            save.gateCostsMet = {
                fish: false,
                sand: false,
                crystal: false,
                kelp: false,
                seaApple: false,
                sharkonium: false,
            };
            return save;
        },
        function update1(save) {
            save = $.extend(true, save, {
                resources: { sandDigger: { amount: 0, totalAmount: 0 }, junk: { amount: 0, totalAmount: 0 } },
                upgrades: { statsDiscovery: null, recyclerDiscovery: null },
                settings: { showTabHelp: true, groupResources: true },
                timestampLastSave: save.timestamp,
                timestampGameStart: null,
                timestampRunStart: null,
            });
            save.tabs = {
                current: save.tabs.current,
                home: save.tabs.home.discovered,
                lab: save.tabs.lab.discovered,
                gate: save.tabs.gate.discovered,
                stats: false,
                recycler: false,
            };
            delete save.timestamp;
            return save;
        },
        function update2(save) {
            save = $.extend(true, save, {
                settings: { iconPositions: "top" },
            });
            return save;
        },
        function update3(save) {
            save = $.extend(true, save, {
                settings: { showTabImages: true },
                tabs: { reflection: false },
                timestampRunEnd: null,
            });
            _.each([
                "shrimp",
                "lobster",
                "dolphin",
                "whale",
                "chimaera",
                "octopus",
                "eel",
                "queen",
                "berrier",
                "biologist",
                "pit",
                "worker",
                "harvester",
                "treasurer",
                "philosopher",
                "chorus",
                "transmuter",
                "explorer",
                "collector",
                "scavenger",
                "technician",
                "sifter",
                "skimmer",
                "purifier",
                "heater",
                "spongeFarmer",
                "berrySprayer",
                "glassMaker",
                "silentArchivist",
                "tirelessCrafter",
                "clamCollector",
                "sprongeSmelter",
                "seaScourer",
                "prostheticPolyp",
                "sponge",
                "jellyfish",
                "clam",
                "coral",
                "algae",
                "coralglass",
                "delphinium",
                "spronge",
                "tar",
                "ice",
            ], (resourceId) => {
                save.resources[resourceId] = { amount: 0, totalAmount: 0 };
            });
            _.each([
                "environmentalism",
                "thermalConditioning",
                "coralglassSmelting",
                "industrialGradeSponge",
                "aquamarineFusion",
                "coralCircuitry",
                "sprongeBiomimicry",
                "dolphinTechnology",
                "spongeCollection",
                "jellyfishHunting",
                "clamScooping",
                "pearlConversion",
                "crustaceanBiology",
                "eusociality",
                "wormWarriors",
                "cetaceanAwareness",
                "dolphinBiology",
                "delphinePhilosophy",
                "coralHalls",
                "eternalSong",
                "eelHabitats",
                "creviceCreches",
                "bioelectricity",
                "chimaeraMysticism",
                "abyssalEnigmas",
                "octopusMethodology",
                "octalEfficiency",
            ], (upgradeId) => {
                save.upgrades[upgradeId] = false;
            });
            save.world = { type: "start", level: 1 };
            save.artifacts = {};
            _.each([
                "permanentMultiplier",
                "planetTerraformer",
                "gateCostReducer",
                "planetScanner",
                "sharkMigrator",
                "rayMigrator",
                "crabMigrator",
                "shrimpMigrator",
                "lobsterMigrator",
                "dolphinMigrator",
                "whaleMigrator",
                "eelMigrator",
                "chimaeraMigrator",
                "octopusMigrator",
                "sharkTotem",
                "rayTotem",
                "crabTotem",
                "shrimpTotem",
                "lobsterTotem",
                "dolphinTotem",
                "whaleTotem",
                "eelTotem",
                "chimaeraTotem",
                "octopusTotem",
                "progressTotem",
                "carapaceTotem",
                "inspirationTotem",
                "industryTotem",
                "wardingTotem",
            ], (artifactId) => {
                save.artifacts[artifactId] = 0;
            });
            save.gateway = { betweenRuns: false };
            return save;
        },
        function update4(save) {
            save = $.extend(true, save, {
                settings: { buttonDisplayType: "pile" },
            });
            return save;
        },
        function update5(save) {
            save = $.extend(true, save, {
                gateway: { wonGame: false },
            });
            return save;
        },
        function update6(save) {
            save.resources.numen = { amount: 0, totalAmount: 0 };
            save.gateCostsMet = [false, false, false, false, false, false];
            return save;
        },
        function update7(save) {
            _.each(["eggBrooder", "diver"], (resourceId) => {
                save.resources[resourceId] = { amount: 0, totalAmount: 0 };
            });
            _.each([
                "agriculture",
                "ancestralRecall",
                "utilityCarapace",
                "primordialSong",
                "leviathanHeart",
                "eightfoldOptimisation",
                "mechanisedAlchemy",
                "mobiusShells",
                "imperialDesigns",
            ], (upgradeId) => {
                save.upgrades[upgradeId] = false;
            });
            return save;
        },
        function update8(save) {
            save = $.extend(true, save, {
                completedWorlds: {},
            });
            _.each(["iterativeDesign", "superprocessing"], (upgradeId) => {
                save.upgrades[upgradeId] = false;
            });
            _.each(["start", "marine", "chaotic", "haven", "tempestuous", "volcanic", "abandoned", "shrouded", "frigid"], (worldType) => {
                save.completedWorlds[worldType] = false;
            });
            return save;
        },
        function update9(save) {
            save = $.extend(true, save, {
                settings: { enableThemes: true, framerate: 20 },
            });
            return save;
        },
        function update10(save) {
            save = $.extend(true, save, {
                settings: { boldCosts: true },
            });
            return save;
        },
        function update11(save) {
            _.each(["investigator", "filter", "ancientPart"], (resourceId) => {
                save.resources[resourceId] = { amount: 0, totalAmount: 0 };
            });
            _.each(["farAbandonedExploration", "reverseEngineering", "highEnergyFusion", "artifactAssembly", "superiorSearchAlgorithms"], (upgradeId) => {
                save.upgrades[upgradeId] = false;
            });
            return save;
        },
        function update12(save) {
            save = $.extend(true, save, {
                settings: { grottoMode: "simple", incomeTotalMode: "absolute" },
            });
            return save;
        },
        function update13(save) {
            _.each(["historian", "crimsonCombine", "kelpCultivator"], (resourceName) => {
                save.resources[resourceName] = { amount: 0, totalAmount: 0 };
            });
            _.each(["coralCollection", "whaleCommunication", "delphineHistory", "whaleSong", "farHavenExploration", "crystallineConstruction"], (upgradeName) => {
                save.upgrades[upgradeName] = false;
            });
            return save;
        },
        function update14(save) {
            _.each([
                "planetTerraformer",
                "shrimpMigrator",
                "lobsterMigrator",
                "dolphinMigrator",
                "whaleMigrator",
                "eelMigrator",
                "chimaeraMigrator",
                "octopusMigrator",
                "shrimpTotem",
                "lobsterTotem",
                "dolphinTotem",
                "whaleTotem",
                "eelTotem",
                "chimaeraTotem",
                "octopusTotem",
                "carapaceTotem",
                "inspirationTotem",
                "industryTotem",
            ], (deprecatedTotem) => {
                if (sharkmisc.has(save.artifacts, deprecatedTotem)) {
                    delete save.artifacts[deprecatedTotem];
                }
            });
            if (sharkmisc.has(save, "gateCostsMet")) {
                delete save.gateCostsMet;
            }
            if (sharkmisc.has(save.settings, "iconPositions")) {
                save.settings.showIcons = save.settings.iconPositions !== "off";
                delete save.settings.iconPositions;
            }
            else {
                save.settings.showIcons = true;
            }
            save.settings.minimizedTopbar = true;
            if (sharkmisc.has(save.resources, "philosopher")) {
                delete save.resources.philosopher;
            }
            if (sharkmisc.has(save.upgrades, "coralHalls")) {
                delete save.upgrades.coralHalls;
            }
            _.each(save.resources, (resource, resourceId) => {
                if ([0, null].includes(resource.amount) && [0, null].includes(resource.totalAmount)) {
                    delete save.resources[resourceId];
                }
            });
            _.each(save.artifacts, (level, artifactId) => {
                if (level === 0 || level === null) {
                    delete save.artifacts[artifactId];
                }
            });
            const purchasedUpgrades = [];
            $.each(save.upgrades, (upgradeId, purchased) => {
                if (purchased === true) {
                    purchasedUpgrades.push(upgradeId);
                }
            });
            save.upgrades = purchasedUpgrades;
            const completedWorlds = [];
            _.each(save.completedWorlds, (completed, worldType) => {
                if (completed === true) {
                    completedWorlds.push(worldType);
                }
            });
            save.completedWorlds = completedWorlds;
            return save;
        },
        function update15(save) {
            if (sharkmisc.has(save, "settings")) {
                if (sharkmisc.has(save.settings, "showTabHelp")) {
                    if (!sharkmisc.has(save.settings, "showTooltips")) {
                        save.settings.showTooltips = save.settings.showTabHelp;
                    }
                    delete save.settings.showTabHelp;
                }
            }
            if (sharkmisc.has(save, "artifacts")) {
                delete save.artifacts;
            }
            if (!sharkmisc.has(save, "aspects")) {
                save.aspects = {};
            }
            return save;
        },
        function update16(save) {
            if (save.settings.colorCosts) {
                save.settings.colorCosts = "color";
            }
            else {
                save.settings.colorCosts = "none";
            }
            save.flags = {};
            save.persistentFlags = {};
            save.planetPool = [];
            return save;
        },
        function update17(save) {
            return save;
        },
        function update18(save) {
            if (save.resources.essence && save.resources.essence.totalAmount > 0 && save.aspects.apotheosis) {
                if (save.aspects.pathOfIndustry) {
                    save.aspects.tokenOfIndustry = save.aspects.pathOfIndustry;
                    save.aspects.pathOfIndustry = 0;
                }
                if (save.aspects.pathOfEnlightenment) {
                    save.aspects.pathOfEnlightenment = 0;
                    save.aspects.distantForesight = 1;
                }
                save.aspects.pathOfEnlightenment = 1;
            }
            return save;
        },
        function update19(save) {
            save.keybinds = SharkGame.Keybinds.defaultBinds;
            return save;
        },
    ],
};
//# sourceMappingURL=save.js.map