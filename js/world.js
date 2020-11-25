SharkGame.WorldModifiers = {
    planetaryIncome: {
        name: "Planetary Income",
        apply(level, resourceName, amount) {
            const wr = SharkGame.World.worldResources;
            wr[resourceName].income = level * amount;
        }
    },
    planetaryConstantIncome: {
        name: "Planetary Constant Income",
        apply(level, resourceName, amount) {
            const wr = SharkGame.World.worldResources;
            wr[resourceName].income = amount;
        }
    },
    planetaryIncomeMultiplier: {
        name: "Planetary Income Multiplier",
        apply(level, resourceName, amount) {
            const wr = SharkGame.World.worldResources;
            wr[resourceName].incomeMultiplier = 1 + level * amount;
        }
    },
    planetaryConstantIncomeMultiplier: {
        name: "Constant Planetary Income Multiplier",
        apply(level, resourceName, amount) {
            const wr = SharkGame.World.worldResources;
            wr[resourceName].incomeMultiplier = amount;
        }
    },
    planetaryIncomeReciprocalMultiplier: {
        name: "Planetary Income Reciprocal Multiplier",
        apply(level, resourceName, amount) {
            const wr = SharkGame.World.worldResources;
            wr[resourceName].incomeMultiplier = 1 / (1 + level * amount);
        }
    },
    planetaryResourceBoost: {
        name: "Planetary Boost",
        apply(level, resourceName, amount) {
            const wr = SharkGame.World.worldResources;
            wr[resourceName].boostMultiplier = 1 + level * amount;
        }
    },
    planetaryResourceReciprocalBoost: {
        name: "Planetary Reciprocal Boost",
        apply(level, resourceName, amount) {
            const wr = SharkGame.World.worldResources;
            wr[resourceName].boostMultiplier = 1 / (1 + level * amount);
        }
    },
    planetaryStartingResources: {
        name: "Planetary Starting Resources",
        apply(level, resourceName, amount) {
            const bonus = level * amount;
            const res = SharkGame.Resources.getTotalResource(resourceName);
            if(res < bonus) {
                SharkGame.Resources.changeResource(resourceName, bonus);
            }
        }
    },
    planetaryGeneratorRestriction: {
        name: "Restricted Generator-Income Combination",
        apply(resourceName, restriction) {
            const wrst = SharkGame.World.worldRestrictedCombinations;
            if(!wrst[resourceName]) {
                wrst[resourceName] = [];
            }
            wrst[resourceName].push(restriction);
        }
    }
};

SharkGame.World = {

    worldType: "start",
    worldResources: {},
    worldRestrictedCombinations: {},
    planetLevel: 1,

    init() {
        const w = SharkGame.World;
        //w.worldType = "start";
        //w.planetLevel = 1;
        //w.worldResources = {};
        w.resetWorldProperties();
    },

    apply() {
        const w = SharkGame.World;
        w.applyWorldProperties(w.planetLevel);
        w.applyGateCosts(w.planetLevel);
    },

    resetWorldProperties() {
        const w = SharkGame.World;
        const wr = w.worldResources;
        const rt = SharkGame.ResourceTable;
        w.worldRestrictedCombinations = {};

        // set up defaults
        $.each(rt, (k, v) => {
            wr[k] = {};
            wr[k].exists = true;
            wr[k].income = 0;
            wr[k].incomeMultiplier = 1;
            wr[k].boostMultiplier = 1;
            wr[k].artifactMultiplier = 1;
        });
    },

    applyWorldProperties(level) {
        const w = SharkGame.World;
        const wr = w.worldResources;
        const worldInfo = SharkGame.WorldTypes[w.worldType];

        // get multiplier
        const terraformMultiplier = w.getTerraformMultiplier();
        const effectiveLevel = Math.max(Math.floor(level * terraformMultiplier), 1);

        // disable resources not allowed on planet
        $.each(worldInfo.absentResources, (i, v) => {
            wr[v].exists = false;
        });

        // apply world modifiers
        _.each(worldInfo.modifiers, (modifierData) => {
            if(modifierData.type === "multiplier"){
                if(SharkGame.Resources.isCategory(modifierData.resource)) {
                    const resourceList = SharkGame.Resources.getResourcesInCategory(modifierData.resource);
                    _.each(resourceList, (resourceName) => {
                        SharkGame.WorldModifiers[modifierData.modifier].apply(effectiveLevel, resourceName, modifierData.amount);
                    });
                } else {
                    SharkGame.WorldModifiers[modifierData.modifier].apply(effectiveLevel, modifierData.resource, modifierData.amount);
                }
            } else {
                let resourceList = [modifierData.resource];
                let restrictionList = [modifierData.restriction];
                if(SharkGame.Resources.isCategory(modifierData.resource)) {
                    resourceList = SharkGame.Resources.getResourcesInCategory(modifierData.resource);
                }
                if(SharkGame.Resources.isCategory(modifierData.restriction)) {
                    restrictionList = SharkGame.Resources.getResourcesInCategory(modifierData.restriction);
                }
                _.each(resourceList, (resourceName) => {
                    _.each(restrictionList, (restriction) => {
                        SharkGame.WorldModifiers[modifierData.modifier].apply(resourceName, restriction);
                    });
                });
            }
        });
        SharkGame.Resources.buildApplicableNetworks();
    },

    applyGateCosts(_level) {
        const w = SharkGame.World;
        const worldInfo = SharkGame.WorldTypes[w.worldType];

        // get multiplier
        const gateCostMultiplier = w.getGateCostMultiplier();

        SharkGame.Gate.createSlots(worldInfo.gateCosts, w.planetLevel, gateCostMultiplier);
    },

    getWorldEntryMessage() {
        const w = SharkGame.World;
        return SharkGame.WorldTypes[w.worldType].entry;
    },

    // does this resource exist on this planet?
    doesResourceExist(resourceName) {
        const info = SharkGame.World.worldResources[resourceName];
        return info.exists;
    },

    forceExistence(resourceName) {
        SharkGame.World.worldResources[resourceName].exists = true;
    },

    getWorldIncomeMultiplier(resourceName) {
        return SharkGame.World.worldResources[resourceName].incomeMultiplier;
    },

    getWorldBoostMultiplier(resourceName) {
        return SharkGame.World.worldResources[resourceName].boostMultiplier;
    },

    getArtifactMultiplier(resourceName) {
        const artifactMultiplier = SharkGame.World.worldResources[resourceName].artifactMultiplier;
        return artifactMultiplier;
    },

    // these things are only impacted by artifacts so far

    getTerraformMultiplier() {
        const ptLevel = SharkGame.Artifacts.planetTerraformer.level;
        return ptLevel > 0 ? Math.pow(0.9, ptLevel) : 1;
    },

    getGateCostMultiplier() {
        const gcrLevel = SharkGame.Artifacts.gateCostReducer.level;
        return gcrLevel > 0 ? Math.pow(0.9, gcrLevel) : 1;
    }
};