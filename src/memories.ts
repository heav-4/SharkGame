SharkGame.Memories = {
    worldMemories: {} as Record<WorldName, HomeMessageName[]>,
    persistentMemories: {} as Record<WorldName, HomeMessageName[]>,
    messageLookup: null as unknown as MemoryModule["messageLookup"],

    init() {
        // create the quick lookup table for home events
        SharkGame.Memories.messageLookup = new RequiredKeyMap();
        _.each(SharkGame.HomeMessages.messages, (worldHomeMessageArray) => {
            $.each(worldHomeMessageArray, (index, homeMessageData) => {
                SharkGame.Memories.messageLookup.set(homeMessageData.name, index);
            });
        });

        this.worldMemories = {} as Record<WorldName, HomeMessageName[]>;
        this.persistentMemories = {} as Record<WorldName, HomeMessageName[]>;

        $.each(SharkGame.WorldTypes, (worldType) => {
            this.worldMemories[worldType] = [];
            this.persistentMemories[worldType] = [];
        });
    },

    addMemory(worldType, messageName) {
        if (!mem.worldMemories[worldType].includes(messageName)) mem.worldMemories[worldType].push(messageName);
    },

    elevateMemories() {
        $.each(this.worldMemories, (worldType) => {
            _.each(this.worldMemories[worldType], (memoryName) => {
                if (!this.persistentMemories[worldType].includes(memoryName)) this.persistentMemories[worldType].push(memoryName);
            });
        });
    },
};
