SharkGame.FunFacts = {
    dilutedResources: ["shark", "ray", "crab", "fish"], // dilute these while not in starter to keep the fun facts fresher

    showFact() {
        log.addMessage(this.getFact());
    },

    getFact() {
        const pool = this.getPool();
        return SharkGame.choose(pool);
    },

    getPool() {
        const pool = [];
        const currentWorld = world.worldType;
        if (
            this.worldBased[currentWorld] &&
            (!this.worldBased[currentWorld].areRequirementsMet || this.worldBased[currentWorld].areRequirementsMet())
        ) {
            _.each(this.worldBased[currentWorld].messages, (fact) => {
                pool.push(sharktext.boldString(`Fun fact: `) + `<i>${fact}</i>`);
            });
        }

        let anyAvailableResource = false;
        $.each(this.resourceBased, (resource, facts) => {
            // purposefully dilute some facts if we are not on the starter world
            // I want these facts to be more likely relevant than not
            if (world.doesResourceExist(resource) && res.getTotalResource(resource)) {
                anyAvailableResource = true;
                if (!this.dilutedResources.includes(resource) || currentWorld === "start" || Math.random() < 0.25) {
                    _.each(facts, (fact) => {
                        pool.push(
                            sharktext.boldString(
                                `${sharktext.getResourceName(
                                    resource,
                                    false,
                                    1,
                                    SharkGame.Log.isNextMessageEven()
                                        ? sharkcolor.getVariableColor("--color-dark")
                                        : sharkcolor.getVariableColor("--color-med")
                                )} fact: `
                            ) + `<i>${fact}</i>`
                        );
                    });
                }
            }
        });

        if (anyAvailableResource) {
            // only 10% chance to include the 'default' facts
            // this is because those facts are seen all over the place
            // they would end up diluting the world-specific and resource-specific facts
            //
            // also acts as a failsafe in case there are no other facts to display
            if (Math.random() < 0.1 || pool.length === 0) {
                _.each(this.default, (fact) => {
                    pool.push(sharktext.boldString(`Fun fact: `) + `<i>${fact}</i>`);
                });
            }
            return pool;
        } else {
            return ["Fun fact: <i>New fun facts are unlocked as you see new stuff. Keep playing to unlock some!</i>"];
        }
    },

    worldBased: {
        frigid: {},
        volcanic: {
            messages: [
                "This world was originally called Violent, now it's Volcanic. Playtesters got confused and thought the world had violence, when really, it just has the threat of violence.",
                "Hydrothermal vents do not spew fire in real life. They spew smoke.",
                "Hydrothermal vents support a diverse array of sea life due to their high output of minerals. Bacteria eat these minerals, forming the base of a food chain.",
                "Hydrothermal vents are found at fault lines in the earth's crust, where water becomes superheated due to magma rising close to the ocean floor.",
            ],
            areRequirementsMet() {
                return SharkGame.Upgrades.purchased.includes("thermalVents");
            },
        },
        shrouded: {},
        abandoned: {
            messages: ["This world was the first one to be remade for New Frontiers."],
        },
        haven: {
            messages: ["Kelp paper is real. You cannot write on it though."],
            areRequirementsMet() {
                return SharkGame.Upgrades.purchased.includes("sunObservation");
            },
        },
        marine: {},
        tempestuous: {
            messages: ["'Tempestuous' does not mean stormy. It means emotionally turbulent. But it's close enough."],
        },
    },

    resourceBased: {
        // add fish facts at some point
        shark: [
            "There are many species of sharks that investigate things with their mouths. This can end badly for the subject of investigation.",
            "There have been social behaviours observed in lemon sharks, and evidence that suggests they prefer company to being alone.",
            "Some shark species display 'tonic immobility' when rubbed on the nose. They stop moving, appear deeply relaxed, and can stay this way for up to 15 minutes before swimming away.",
            "In some shark species eggs hatch within their mothers, and in some of these species the hatched babies eat unfertilised or even unhatched eggs.",
            "More people are killed by lightning every year than by sharks.",
            "White sharks have been observed to have a variety of body language signals to indicate submission and dominance towards each other without violence.",
            "A kiss from a shark can make you immortal. But only if they want you to be immortal.",
            "A shark is worth one in the bush, and a bunch in the sea water. Don't put sharks in bushes.",
            "Sharks are very old, evolutionarily speaking. The first sharks emerged some time around 400 million years ago.",
            "Sharks have very rough skin, like sandpaper. In fact, shark skin was literally used as sandpaper in the past.",
            "Sharks do not have bones. Neither do rays.",
        ],
        crystal: ["Magic crystals are probably not real."],
        ray: [
            "Rays can be thought of as flattened sharks. The two are very closely related evolutionarily.",
            "Rays are pancakes of the sea. (note: probably not true)",
            "Rays do not have bones. Neither do sharks.",
        ],
        crab: [
            "Throughout history, many species crustaceans have independently evovled into crabs for no discernable reason. The phenomenon is called carcinisation.",
            "Some species of crab exhibit a kind of claw asymmetry. Called the crusher and cutter, they have different shapes that give their claws more specialized purposes.",
        ],
        octopus: [
            "It's octopuses, not octopi.",
            "Octopuses are capable of extremely advanced camoflague. They can change color, pattern, and texture to match their surroundings, enough to easily fool anything, even humans.",
            "In novel circumstances, octopuses are capable of simple problem-solving. Some will step back and thoroughly analyze things when confused.",
            "Octopuses can get bored in captivity. They may fiddle with toys or interact with humans for entertainment.",
            "Octopuses have great dexterity. They can use their tentacles in a variety of ways to manipulate objects.",
            "Octopuses have no bones whatsoever.",
            "Each limb of an octopus is considered to individually have a brain to itself. They can be thought of as soldiers (little brains) being commanded by a general in the center (big brain).",
        ],
        dolphin: [
            "Dolphins are considered some of the most intelligent animal problem-solvers, next to monkeys, elephants and parrots as examples.",
            "Dolphins are not smug in real life. Probably. Maybe.",
            "Dolphins are creative and capable of handling abstract concepts. In captivity, they can be asked to try inventing new tricks, and will often succeed.",
            "Dolphins have been seen directly communicating with each other. In fact, it is believed that they hold full conversations with one another.",
        ],
        whale: [
            "The top 10 largest animal species are all whales.",
            "While some whales are active hunters, others are merely supersized filter feeders. This game's whales are of unspecified type.",
            "Whales are very social creatures. Most whales travel in small groups called pods, which might make up clans, and then communities. Some whales, however, are solitary.",
            "It is not completely understood why whales sing, but scientists agree it serves some kind of social purpose." /* Whales are observed to react to each other's songs and come to */,
        ],
        urchin: [
            "Sea urchins primarily eat kelp. A lot of kelp.",
            "Sea urchins have been observed to wear various items on top of themselves, such as rocks. If you give them little hats, they will wear those too. It is not agreed upon why they do this.",
            "Most sea urchins are not venomous.",
            "The spines on most sea urchins are not very sharp. Many species of urchin can be held in the palm.",
        ],
        squid: [
            "Squid eat crabs. They're not eating yours out of politeness.",
            "Giant squid are real. They live incredibly deep in the ocean.",
            "Squid have no bones whatsoever.",
            // Squid have camoflague look into it
        ],
        lobster: [
            "Lobsters really do eat clams. They instinctively know how to crack them open.",
            "Lobsters can live for an extremely long time. Rarely, some will live longer than humans.",
            "Lobsters have teeth in their stomach, not in their mouth, and they chew with those teeth, too.",
            "Lobsters have asymmetric claws. One of them, called the crusher, is used for...crushing. The other, called the pincer, is used for...pincing. Marine biologists were feeling creative, clearly.",
        ],
        shrimp: [
            "There are real eusocial shrimps that live in communities in sponges on reefs, complete with queens.",
            "Shrimp are close relatives of lobsters. They have a lot of similarities, and in some ways are just smaller, narrower lobsters.",
        ],
        eel: [
            // "Eels come in a wide range of sizes, from just a few inches to multiple meters.",
        ],
        chimaera: [
            "Chimaera are closely related to sharks and rays.",
            "Chimaera are deep-sea animals, usually found more than 500 meters (~1500 feet) below the surface of the ocean.",
            "Chimaera have a venomous spine in front of their dorsal fin.",
            "Chimaera are not purple, they are completely pale. They don't bother with colors because deep-sea animals like chimaera cannot be seen anyways.",
            "Chimaera do not have bones. Neither do sharks or rays.",
        ],
        swordfish: [
            "Swordfish are indeed a kind of fish, unlike sharks and rays.",
            "The top speed of marlins and swordfish is commonly reported to be 60 mph, but this is not accurate. It's actually closer to 30 mph.",
            "The bill of a swordfish is used to slash like a sword, not stab like a spear.",
        ],
        seaApple: [
            "Sea apples are a type of sea cucumber. They feed on debris and detritus.",
            "Sea apples are in no way actually attracted to kelp. The apples in this game are weird.",
        ],
        jellyfish: [
            // "Sharks would definitely not have a way of acquiring most kinds of jellyfish in real life.",
            "Jellyfish can be extremely dangerous. Some kinds of box jellyfish have fatal stings.",
            // do more research into jellies
        ],
        sharkonium: ["There is nothing suspicious about the machines."],
        porite: [
            "The idea for porite comes from the structure of bones, which have spongey insides that reduce their weight while retaining their strength.",
        ],
        calcinium: ["Calcinium was inspired by the appearance and texture of limestone and seashells."],
        laser: [
            "Sharks with lasers were overdone, okay? 'Laser ray' is a pun, so it's obviously superior.",
            "Sand probably does not actually fuse into magic crystals. Unless you count glass.",
            "We do not know how the rays strap lasers to themselves. It is known only to the sharks.",
            "Laser rays take power directly from the heat of hydrothermal vents, so they are each tethered to a small operating area.",
        ],
        coral: [
            "Some coral can actually catch small fish.",
            "Coral is not a plant, it is an animal. A weird, stationary animal.",
            "Coral are primarily carnivores. They eat plankton (teeny tiny things that can't swim), grabbing them with little tentacles and pulling them into their mouths.",
            "Many kinds of coral have a mutualistic relationship with certain species of alage, who produce nutrients in exchange for carbon dioxide and shelter.",
        ],
        sponge: [
            "Sponges are incredibly distinct from all other animals. They are asymmetric, have no organs, and their cells can change specialization at will.",
            "Sponges are incredibly, incredibly old, evolutionarily speaking. They probably date back at least 600 million years.",
            "Sponge is not a plant, it is an animal. A weird, amorphous animal.",
            "The pores in sponges are designed to help them filter water for food at maximum efficiency.",
            "Many species of sponge have a mualistic realitionship with certain species of algae. The algaes use photosynthesis to produce food for the sponges.",
        ],
        algae: [
            "Algae comes in many different shapes, sizes, and forms, like 'valonia ventricosa,' a species where every individual cell can grow larger than a grape. Look it up, it's insane.",
            "Algae is neither plant nor animal. It is something else entirely (a protist?).",
            "Kelp is a kind of algae. In fact, all seaweed is algae. The sea has very few true plants.",
        ],
        kelp: ["Kelp is not a plant, it's a kind of algae. Algae is also not a plant."],
        seagrass: ["Unlike kelp, seagrass is a true plant. It is one of very few under the sea."],
        arcana: ["Arcane, super-charged energy crystals are definitely not real."],
        ice: ["In the original shark game, ice used to eat away your resources instead of slowing their production."],
        tar: ["In the original shark game, tar was gained passively. Machines produced basically none of it."],
    },

    default: [
        "Shark Game's initial bare minimum code came from an abandoned idle game about bees. Almost no trace of bees remains!",
        "The existence of resources that create resources that create resources in this game were inspired by Derivative Clicker!",
        "Kitten Game was an inspiration for this game! This surprises probably no one. The very first message the game gives you is a nod of sorts.",
        "There is a surprising deficit of cookie in this game.",
        "Remoras were banished from the oceans in the long bygone eras. The sharks hope they never come back.",
        "Fun facts will only talk about things you have already seen in-game.",
        "Fun facts have always been in the game's code, but have never been exposed until this system for displaying them was added.",
        "New Frontiers, this Shark Game mod, was inspired by the unfolding nature of the Candy Box games and A Dark Room.",
        "Any timewalls in this game can be completely bypassed with good strategy.",
        "This game has keybinds. They are more useful than you might think. Check the options menu.",
    ],
};

SharkGame.Changelog = {
    "<a href='https://github.com/Toby222/SharkGame'>New Frontiers</a> patch 20220712a": [
        "Time in the minute hand can now persist between worlds, with a few caveats.",
        "Added 3 new aspects that complement the changes to minute hand time.",
        "Changed the pricing and location of aspects on the tree.",
        "Disabling idle time accruing in the minute hand no longer completely removes it from the UI.",
        "Added a choice to use SI units.",
        "Fixed a bug where tooltips would persist when changing tabs via hotkey.",
        "Fixed a bug where the game throws errors when trying to disable buttons while paused.",
        "Greatly improved aspect tree on touchscreen devices.",
    ],
    "<a href='https://github.com/Toby222/SharkGame'>New Frontiers</a> patch 20220630a": [
        "Added a setting to disable idle time from the pause button.",
    ],
    "<a href='https://github.com/Toby222/SharkGame'>New Frontiers</a> patch 20220629a": [
        "Fixed a bug with a certain sponge button not appearing.",
        "Fixed a bug with pressing buttons that don't exist anymore.",
        "Updated the pause button, which now activates idle mode at will.",
    ],
    "<a href='https://github.com/Toby222/SharkGame'>New Frontiers</a> patch 20220625a": [
        "Added Volcanic worldtype.",
        "Added FUN FACTS! Press to receive a random fun fact! You get different ones based on where you are and what you own!",
        "World-time doesn't increase when you are offline or idle. That time is added only if you use it through the minute hand (time from the hour hand aspect is excluded).",
        "Stuff table tooltips now show how a resource slows or speeds up others.",
        "Began adding placeholder art to temporarily supplement actually completed art.",
        "Removed alpha notice.",
        "Added a link to the hub on the titlebar.",
        "New credits (see bottom of page).",
        "Fixed a bunch of miscellaneous bugs.",
        "Did other assorted tasks.",
    ],
    "<a href='https://github.com/Toby222/SharkGame'>New Frontiers</a> patch 20220603a": [
        "Added Marine worldtype.",
        "Planet descriptions are now much more vague until you've visited them.",
        "Distant Foresight greatly decreases vagueness of planet descriptions now.",
        "Swapped the order of some aspects on the tree.",
        "Revised the ending of the Abandoned world.",
        "Revised bits of the Shrouded world's story.",
        "Abandoned world gives one bonus essence, bumping its scouting reward to 5 and non-scouting reward to 3.",
        "By popular demand, added auto-transmuter to Shrouded.",
        "Fixed some miscellaneous bugs.",
        "Ixbix - tweaked text visibility system",
    ],
    "<a href='https://github.com/Toby222/SharkGame'>New Frontiers</a> 0.2 patch 20220125a": [
        "Added keybinds. You can now bind a large array of actions to different key combinations.",
        "Added backup saves. You can now back up your saves as you wish, with three slots!",
        "Added real species/family names when recruiting urchins and squid, instead of weird placeholder messages.",
        "When first unlocking cheats at 1000 lifetime essence, a special backup is automatically created.",
        "Added toggle for cheats; you don't have to see them if you don't want to.",
        "Made some more UI changes.",
        "Removed aspect: Anything and Everything",
        "Ixbix - fixed issues with gateway time spent in last world",
        "Ixbix - stopped minute hand slider from flopping around",
        "Ixbix - added touchscreen support for the aspect tree",
    ],
    "<a href='https://github.com/Toby222/SharkGame'>New Frontiers</a> 0.2 patch 20211201a": [
        "Added something special at 1000 total essence.",
        "Changed the aspect tree UI to remove unnecessary buttons from below the tree.",
        "Fixed some bugs related to the patience and gumption aspects.",
    ],
    "<a href='https://github.com/Toby222/SharkGame'>New Frontiers</a> 0.2 patch 20211109a": [
        "Final revamp of the aspect tree. Not the final addition to it, though.",
        "Added idle mode. The game will pause and accumulate idle time after 2 minutes of inactivity.",
        "The minute hand now stores offline progress and idle time. You can use your stored time in the form of a multiplier.",
        "Removed the playstyle choice because the new idle system does its job better.",
        "Implemented scouting. You get more essence when you first play a world, but SOME aspects can't be used.",
        "Implemented par times. If you beat a world faster than par, you get extra essence. Go even faster for even more.",
        "Added and changed sprites.",
        "Updated UI.",
        "Fixed some out-of-place flavor text.",
    ],
    "<a href='https://github.com/Toby222/SharkGame'>New Frontiers</a> 0.2 patch 20210814a": [
        "Added Shrouded worldtype.",
        "Changed the aspect tree and its aspects significantly. All essence must be refunded and all aspects must be reset because of this. Sorry!",
        "Implemented a basic 'playstyle' choice. The game will adjust pacing to suit your choice.",
        "You can now access the options menu in the gateway.",
        "'Wipe Save' now doesn't reset any settings. Added a separate button to reset settings.",
        "Added sprites.",
        "Greatly improved game stability when dealing with large numbers (above a quadrillion).",
        "Fixed bugs with save wiping and resetting.",
        "Fixed bugs with grotto.",
        "Fixed bugs with tooltips in the aspect tree.",
    ],
    "<a href='https://github.com/Toby222/SharkGame'>New Frontiers</a> 0.2 patch 20210728a": [
        "The log can now be in one of 3 spots. Change which one in options. Default is now right side.",
        "Added Resource Affect tooltips; mouse over the multipliers in the R column in the advanced grotto table and you can see what is causing them.",
        "Added work-in-progress (but functional) aspect table as an alternative to the tree, specifically for accessibility.",
        "Added extraction team sprite.",
        "Added historian sprite; decided to repurpose the old philosopher sprite from OG shark game.",
        "Updated tooltip formatting.",
        "Updated Recycler UI to eliminate quirkiness.",
        "Fixed a bug where costs disappear in no-icons mode.",
        "Fixed incorrect description of an aspect.",
        "Fixed bugs with importing saves.",
    ],
    "<a href='https://github.com/Toby222/SharkGame'>New Frontiers</a> 0.2 patch 20210713a": [
        "Tooltips show you how much you already own of what you're buying. Can be turned off in options.",
        "Tooltips have their numbers scale based on how much of something you're buying. Can be turned off in options.",
        "The key for advanced mode grotto has been enhanced.",
        "Tabs you haven't visited yet will glow. This is on a per-world basis.",
        "Gave scroll bars to some stuff.",
        "Changed the order of categories in the resource table to make more sense.",
        "You can close windows by clicking outside of them.",
        "Options menu is less wordy.",
        "Corrected a bunch of upgrade effect descriptions.",
        "Minor bugfixes.",
    ],
    "<a href='https://github.com/Toby222/SharkGame'>New Frontiers</a> 0.2 patch 20210709a": [
        "Added the Frigid worldtype.",
        "Replaced the Artifacts system with the Aspects system.",
        "Tweaked Haven.",
        "Tweaked UI colors.",
        "Grotto now shows how the world affects resources.",
        "Moved UI elements around to make the game not freak out on smaller screens.",
        "Moved buy amount buttons closer to the places you'll need them, they're not in the tab list anymore!",
        "Added 'bright' text color mode, screws up some colors but makes colored text easier to read.",
        "Added auto color-visibility adjuster. Tries to change the color of text if it would be hard to read on a certain background.",
    ],
    "<a href='https://github.com/Toby222/SharkGame'>New Frontiers</a> 0.2 patch 20210610a": [
        "Fixed bug where haven had no essence. Oops.",
        "Changed home messages a little.",
        "Retconned some previous patch notes.",
        "Added sprite for octopus investigator.",
        "Internal stuff.",
    ],
    "<a href='https://github.com/Toby222/SharkGame'>New Frontiers</a> 0.2 patch 20210515a": ["Added missing flavor text.", "Internal stuff."],
    "<a href='https://github.com/Toby222/SharkGame'>New Frontiers</a> 0.2 patch 20210422a": [
        "Implemented reworked gameplay for the Haven worldtype.",
        "Made sweeping changes to the UI.",
        "Improved grotto formatting.",
        "Changed the colors for Haven worlds.",
        "In the grotto, amounts for each producer now update live.",
        "Both kinds of tooltips update live.",
        "Tooltips can tell you more things: for example, it now says how much science you get from sea apples.",
        "Added minimized titlebar. You can switch it back to the old one in the options menu.",
        "Added categories to options menu. Now it's readable!",
    ],
    "<a href='https://github.com/Toby222/SharkGame'>New Frontiers</a> 0.2 patch 20210314a": [
        "Fixed bug related to how artifacts display in the grotto.",
        "Fixed bug related to artifact affects not applying properly.",
        "Fixed bug where the grotto would show an upgrade multiplier for everything, even if it was x1.",
        "Fixed bug where artifact effects would not reset when importing.",
        "Added 'INCOME PER' statistic to Simple grotto. Shows absolutely how much of a resource you get per generator.",
    ],
    "<a href='https://github.com/Toby222/SharkGame'>New Frontiers</a> 0.2 patch 20210312a": [
        "Added simplified grotto.",
        "Made grotto way easier to understand.",
        "Added tooltips to income table.",
        "Did internal rework of the multiplier system, created the modifier system.",
    ],
    "<a href='https://github.com/Toby222/SharkGame'>New Frontiers</a> 0.2 - New Perspectives (2021/??/??)": [
        "Scrapped Chaotic worldtype. Completely.",
        "Implemented gameplay for 1 out of 7 necessary planet reworks.",
        "Implemented new assets.",
    ],
    "<a href='https://github.com/spencers145/SharkGame'>New Frontiers</a> 0.11 - New Foundations (2021/1/27)": [
        "New, greatly improved UI for everything.",
        "Rebalanced stuff.",
        "Added world themes, so the page now changes color depending on what world you're in.",
        "Added a TPS/FPS setting, to make the game smoother and nicer to look at, or chunkier and easier on performance.",
        "Custom purchase amounts.",
        "Added a 'grace period'. Ice doesn't build up if you have no income for anything.",
        "Artifact descriptions and distant foresight planet properties are useful.",
        "See 5 artifact choices instead of 3. On that note, buffed base essence to 4 per world.",
    ],
    "<a href='https://github.com/spencers145/SharkGame'>New Frontiers</a> 0.1 - New is Old (2021/1/7)": [
        "22 NEW SPRITES! More are coming but we couldn't finish all the sprites in time!",
        "TRUE OFFLINE PROGRESS! Days are compressed to mere seconds with RK4 calculation.",
        "Attempted to rebalance worlds, especially frigid and abandoned, by making hazardous materials more threatening and meaningful.",
        "Halved the effectiveness of the 3 basic shark machines (except sand digger, which is 2/3 as productive), but added a new upgrade to counterbalance it.",
        "Added recycler efficiency system. The more you recycle at once, the more you lose in the process. Added an upgrade which makes the mechanic less harsh.",
        "Added new UI elements to the Recycler to make it less of a guessing game and more of a cost-benefit analysis.",
        "Increased the effectiveness of many machines.",
        "Greatly improved number formatting.",
        "World shaper has been disabled because it will probably break plans for future game balance.",
        "Distant foresight now has a max level of 5, and reveals 20% of world properties per level, up to 100% at level 5.",
        "Fixed exploits, bugs, and buggy exploits and exploitable bugs. No more crystals -> clams & sponges -> science & clams -> crystals loop.",
        "No more science from sponges.",
        "Removed jellyfish from a bunch of worlds where the resource was a dead end.",
    ],
    "0.71 (2014/12/20)": [
        "Fixed and introduced and fixed a whole bunch of horrible game breaking bugs. If your save was lost, I'm sorry.",
        "Made the recycler stop lying about what could be made.",
        "Made the recycler not pay out so much for animals.",
        "Options are no longer reset after completing a run for real this time.",
        "Bunch of tweaked gate costs.",
        "One new machine, and one new job.",
        "Ten new post-chasm-exploration technologies to invest copious amounts of science into.",
    ],
    "0.7 - Stranger Oceans (2014/12/19)": [
        "WHOLE BUNCH OF NEW STUFF ADDED.",
        "Resource system slightly restructured for something in the future.",
        "New worlds with some slight changes to availabilities, gate demands, and some other stuff.",
        "Categories added to Home Sea tab for the benefit of trying to make sense of all the buttons.",
        "Newly added actions show up in highlights for your convenience.",
        "The way progress continues beyond the gate is now... a little tweaked.",
        "Options are no longer reset after completing a run.",
        "Artifacts exist.",
        "Images are a work in progress. Apologies for the placeholder graphics in these trying times.",
        "Partial production when there's insufficient resources for things that take costs. Enjoy watching your incomes slow to a trickle!",
    ],
    "0.62 (2014/12/12)": [
        "Fixed infinity resource requirement for gate.",
        "Attempted to fix resource table breaking in some browsers for some sidebar widths.",
    ],
    "0.61 (2014/12/12)": [
        "Added categories for buttons in the home sea, because there are going to be so many buttons.",
        "Miscellaneous shuffling of files.",
        "Some groundwork laid for v0.7, which will be the actual official release.",
    ],
    "0.6 - Return of Shark (2014/12/8)": [
        "Major graphical update!",
        "Now features graphics sort of!",
        "Some UI rearrangements:" +
            "<ul><li>Researched techs now show in lab instead of grotto.</li>" +
            "<li>General stats now on right of grotto instead of left.</li>" +
            "<li>Large empty space in grotto right column reserved for future use!</li></ul>",
        "Pointless version subtitle!",
        "<span class='medDesc'>Added a donate link. Hey, sharks gotta eat.</span>",
    ],
    "0.59 (2014/09/30)": [
        "Bunch of small fixes and tweaks!",
        "End of run time now shown at the end of a run.",
        "A couple of fixes for issues only found in IE11.",
        "Fixed a bug that could let people buy hundreds of things for cheap by overwhelming the game's capacity for input. Hopefully fixed, anyway.",
        "Gaudy social media share menu shoehorned in below the game title. Enjoy!",
    ],
    "0.531 (2014/08/20)": [
        "Banned sea apples from the recycler because the feedback loop is actually far more crazy powerful than I was expecting. Whoops!",
    ],
    "0.53 (2014/08/18)": ["Changed Recycler so that residue into new machines is linear, but into new resources is constant."],
    "0.52 (2014/08/18)": [
        "Emergency bug-fixes.",
        "Cost to assemble residue into new things is now LINEAR (gets more expensive as you have more things) instead of CONSTANT.",
    ],
    "0.51 (2014/08/18)": [
        "Edited the wording of import/export saving.",
        "Made machine recycling less HORRIBLY BROKEN in terms of how much a machine is worth.",
    ],
    "0.5 (2014/08/18)": [
        "Added the Grotto - a way to better understand what you've accomplished so far.",
        "Added the Recycler. Enjoy discovering its function!",
        "Added sand machines for more machine sand goodness.",
        "Fixed oscillation/flickering of resources when at zero with anything providing a negative income.",
        "Added 'support' for people stumbling across the page with scripts turned off.",
        "Upped the gate kelp requirement by 10x, due to request.",
        "Added time tracking. Enjoy seeing how much of your life you've invested in this game.",
        "Added grouping for displaying resources on the left.",
        "Added some help and action descriptions.",
        "Added some text to the home tab to let people have an idea of where they should be heading in the very early game.",
        "Thanks to assistance from others, the saves are now much, much smaller than before.",
        "Made crab broods less ridiculously explosive.",
        "Adjusted some resource colours.",
        "Added a favicon, probably.",
        "<span class='medDesc'>Added an overdue copyright notice I guess.</span>",
    ],
    "0.48 (2014/08-ish)": [
        "Saves are now compressed both in local storage and in exported strings.",
        "Big costs significantly reduced.",
        "Buy 10, Buy 1/3 max and Buy 1/2 max buttons added.",
        "Research impact now displayed on research buttons.",
        "Resource effectiveness multipliers now displayed in table." +
            "<ul><li>These are not multipliers for how much of that resource you are getting.</li></ul>",
        "Some dumb behind the scenes things to make the code look nicer.",
        "Added this changelog!",
        "Removed upgrades list on the left. It'll come back in a future version.",
        "Added ray and crab generating resources, and unlocking techs.",
    ],
    "0.47 (2014/08-ish)": ["Bulk of game content added.", "Last update for Seamergency 2014!"],
    "0.4 (2014/08-ish)": ["Added Laboratory tab.", "Added the end of the game tab."],
    "0.3 (2014/08-ish)": ["Added description to options.", "Added save import/export.", "Added the ending panel."],
    "0.23 (2014/08-ish)": ["Added autosave.", "Income system overhauled.", "Added options panel."],
    "0.22 (2014/08-ish)": [
        "Offline mode added. Resources will increase even with the game off!",
        "(Resource income not guaranteed to be 100% accurate.)",
    ],
    "0.21 (2014/08-ish)": ["Save and load added."],
    "<0.21 (2014/08-ish)": ["A whole bunch of stuff.", "Resource table, log, initial buttons, the works."],
};
