"use strict";
SharkGame.World = {
    _worldType: "start",
    get worldType() {
        return this._worldType;
    },
    set worldType(worldType) {
        document.body.classList.remove(this._worldType);
        document.body.classList.add(worldType);
        this._worldType = worldType;
    },
    worldResources: new Map(),
    worldRestrictedCombinations: new Map(),
    init() {
        world.resetWorldProperties();
        world.worldType = "start";
    },
    setup() {
        res.setResource("world", 1);
        res.setTotalResource("world", 1);
        world.apply();
        res.setResource("specialResourceOne", 1);
        res.setTotalResource("specialResourceOne", 1);
        res.setResource("specialResourceTwo", 1);
        res.setTotalResource("specialResourceTwo", 1);
    },
    apply() {
        world.applyWorldProperties();
        world.applyGateCosts();
    },
    resetWorldProperties() {
        const worldResources = world.worldResources;
        world.worldRestrictedCombinations.clear();
        SharkGame.ResourceMap.forEach((_resourceData, resourceName) => {
            worldResources.set(resourceName, {});
            worldResources.get(resourceName).exists = true;
        });
    },
    applyWorldProperties() {
        const worldResources = world.worldResources;
        const worldInfo = SharkGame.WorldTypes[world.worldType];
        if (worldInfo.includedResources) {
            SharkGame.ResourceMap.forEach((_resourceData, resourceName) => {
                worldResources.get(resourceName).exists = false;
            });
            _.each(worldInfo.includedResources, (group) => {
                if (sharkmisc.has(SharkGame.InternalCategories, group)) {
                    _.each(SharkGame.InternalCategories[group].resources, (resource) => {
                        worldResources.get(resource).exists = true;
                    });
                }
                else {
                    worldResources.get(group).exists = true;
                }
            });
        }
        _.each(worldInfo.absentResources, (absentResource) => {
            worldResources.get(absentResource).exists = false;
        });
        _.each(worldInfo.modifiers, (modifierData) => {
            res.applyModifier(modifierData.modifier, modifierData.resource, modifierData.amount);
        });
        res.buildIncomeNetwork();
    },
    applyGateCosts() {
        const worldInfo = SharkGame.WorldTypes[world.worldType];
        SharkGame.Gate.createSlots(worldInfo.gateRequirements);
    },
    getWorldEntryMessage() {
        return SharkGame.WorldTypes[world.worldType].entry;
    },
    doesResourceExist(resourceName) {
        return world.worldResources.get(resourceName)?.exists ?? false;
    },
    forceExistence(resourceName) {
        const resource = world.worldResources.get(resourceName);
        if (resource)
            resource.exists = true;
    },
    isScoutingMission() {
        if (SharkGame.flags.scouting) {
            return true;
        }
        if (!gateway.completedWorlds.includes(world.worldType)) {
            SharkGame.flags.scouting = true;
            return true;
        }
        else {
            return false;
        }
    },
};
//# sourceMappingURL=world.js.map