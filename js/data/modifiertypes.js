"use strict";
SharkGame.ModifierReference = new Map();
SharkGame.ModifierTypes = {
    upgrade: {
        multiplier: {
            incomeMultiplier: {
                defaultValue: 1,
                apply(current, degree, resource) {
                    const incomes = SharkGame.ResourceMap.get(resource).income;
                    $.each(incomes, (resourceId, income) => {
                        incomes[resourceId] = income * degree;
                    });
                    return current * degree;
                },
                effectDescription(degree, resource, background) {
                    return sharktext.getResourceName(resource, undefined, undefined, background) + " speed × " + degree;
                },
                getEffect(genDegree, _outDegree, _gen, _out) {
                    return genDegree;
                },
                applyToInput(input, genDegree, _outDegree, _gen, _out) {
                    return input * genDegree;
                },
            },
            resourceBoost: {
                defaultValue: 1,
                apply(current, degree, boostedResource) {
                    SharkGame.ResourceMap.forEach((generatingResource) => {
                        $.each(generatingResource.income, (generatedResource, amount) => {
                            if (generatedResource === boostedResource && amount > 0) {
                                generatingResource.income[generatedResource] = amount * degree;
                            }
                        });
                    });
                    return current * degree;
                },
                effectDescription(degree, resource, background) {
                    return "All " + sharktext.getResourceName(resource, undefined, undefined, background) + " production × " + degree;
                },
                getEffect(_genDegree, outDegree, _gen, _out) {
                    return outDegree;
                },
                applyToInput(input, _genDegree, outDegree, _gen, _out) {
                    return input * outDegree;
                },
            },
            incomeBoost: {
                defaultValue: 1,
                apply(current, degree, resource) {
                    const incomes = SharkGame.ResourceMap.get(resource).income;
                    $.each(incomes, (resouceId, income) => {
                        if (income > 0 && resouceId !== "tar") {
                            incomes[resouceId] = income * degree;
                        }
                    });
                    return current * degree;
                },
                effectDescription(degree, resource, background) {
                    return sharktext.getResourceName(resource, undefined, undefined, background) + " efficiency × " + degree;
                },
                getEffect(genDegree, _outDegree, gen, out) {
                    return SharkGame.ResourceMap.get(gen).income[out] > 0 && out !== "tar" ? genDegree : 1;
                },
                applyToInput(input, genDegree, _outDegree, _gen, out) {
                    return input * (input > 0 && out !== "tar" ? genDegree : 1);
                },
            },
            sandMultiplier: {
                defaultValue: 1,
                apply(current, degree, resource) {
                    const incomes = SharkGame.ResourceMap.get(resource).income;
                    if (incomes.sand) {
                        incomes.sand = incomes.sand * degree;
                    }
                    return current * degree;
                },
                effectDescription(degree, resource, background) {
                    return (sharktext.getResourceName(resource, undefined, undefined, background) +
                        " collection of " +
                        sharktext.getResourceName("sand", undefined, undefined, background) +
                        " × " +
                        degree);
                },
                getEffect(genDegree, _outDegree, _gen, out) {
                    return out === "sand" ? genDegree : 1;
                },
                applyToInput(input, genDegree, _outDegree, _gen, out) {
                    return input * (out === "sand" ? genDegree : 1);
                },
            },
            kelpMultiplier: {
                defaultValue: 1,
                apply(current, degree, resource) {
                    const incomes = SharkGame.ResourceMap.get(resource).income;
                    if (incomes.kelp) {
                        incomes.kelp = incomes.kelp * degree;
                    }
                    return current * degree;
                },
                effectDescription(degree, resource, background) {
                    return (sharktext.getResourceName(resource, undefined, undefined, background) +
                        " collection of " +
                        sharktext.getResourceName("kelp", undefined, undefined, background) +
                        " × " +
                        degree);
                },
                getEffect(genDegree, _outDegree, _gen, out) {
                    return out === "kelp" ? genDegree : 1;
                },
                applyToInput(input, genDegree, _outDegree, _gen, out) {
                    return input * (out === "kelp" ? genDegree : 1);
                },
            },
            heaterMultiplier: {
                defaultValue: 1,
                apply(current, degree, resource) {
                    const incomes = SharkGame.ResourceMap.get(resource).income;
                    if (incomes.ice && incomes.ice < 0) {
                        incomes.ice = incomes.ice * degree;
                    }
                    return current * degree;
                },
                effectDescription(degree, resource, background) {
                    return (sharktext.getResourceName(resource, false, 2, background) +
                        " melt " +
                        sharktext.getResourceName("ice", undefined, undefined, background) +
                        " " +
                        degree +
                        "× faster.");
                },
                getEffect(genDegree, _outDegree, _gen, _out) {
                    return genDegree;
                },
                applyToInput(input, genDegree, _outDegree, _gen, out) {
                    return input * (out === "ice" && input < 0 ? genDegree : 1);
                },
            },
        },
        other: {
            addCoralIncome: {
                defaultValue: 0,
                apply(current, degree, resource) {
                    if (!SharkGame.ResourceMap.get(resource).baseIncome) {
                        SharkGame.ResourceMap.get(resource).baseIncome = {};
                    }
                    if (!SharkGame.ResourceMap.get(resource).income) {
                        SharkGame.ResourceMap.get(resource).income = {};
                    }
                    const baseIncomes = SharkGame.ResourceMap.get(resource).baseIncome;
                    baseIncomes.coral = (baseIncomes.coral ? baseIncomes.coral : 0) + degree;
                    res.reapplyModifiers(resource, "coral");
                    return current + degree;
                },
                effectDescription(degree, resource, background) {
                    return `Add ${degree} ${sharktext.getResourceName("coral", false, false, background)}/s to ${sharktext.getResourceName(resource, false, 69, background)}`;
                },
                getEffect(_genDegree, _outDegree, _gen, _out) {
                    return 1;
                },
                applyToInput(input, _genDegree, _outDegree, _gen, _out) {
                    return input;
                },
            },
            addJellyIncome: {
                defaultValue: 0,
                apply(current, degree, resource) {
                    if (!SharkGame.ResourceMap.get(resource).baseIncome) {
                        SharkGame.ResourceMap.get(resource).baseIncome = {};
                    }
                    if (!SharkGame.ResourceMap.get(resource).income) {
                        SharkGame.ResourceMap.get(resource).income = {};
                    }
                    const baseIncomes = SharkGame.ResourceMap.get(resource).baseIncome;
                    baseIncomes.jellyfish = (baseIncomes.jellyfish ? baseIncomes.jellyfish : 0) + degree;
                    res.reapplyModifiers(resource, "jellyfish");
                    return current + degree;
                },
                effectDescription(degree, resource, background) {
                    return `Add ${degree} ${sharktext.getResourceName("jellyfish", false, false, background)}/s to ${sharktext.getResourceName(resource, false, 69, background)}`;
                },
                getEffect(_genDegree, _outDegree, _gen, _out) {
                    return 1;
                },
                applyToInput(input, _genDegree, _outDegree, _gen, _out) {
                    return input;
                },
            },
            addFishIncome: {
                defaultValue: 0,
                apply(current, degree, resource) {
                    if (!SharkGame.ResourceMap.get(resource).baseIncome) {
                        SharkGame.ResourceMap.get(resource).baseIncome = {};
                    }
                    if (!SharkGame.ResourceMap.get(resource).income) {
                        SharkGame.ResourceMap.get(resource).income = {};
                    }
                    const baseIncomes = SharkGame.ResourceMap.get(resource).baseIncome;
                    baseIncomes.fish = (baseIncomes.fish ? baseIncomes.fish : 0) + degree;
                    res.reapplyModifiers(resource, "fish");
                    return current + degree;
                },
                effectDescription(degree, resource, background) {
                    return `Add ${degree} ${sharktext.getResourceName("fish", false, false, background)}/s to ${sharktext.getResourceName(resource, false, 69, background)}`;
                },
                getEffect(_genDegree, _outDegree, _gen, _out) {
                    return 1;
                },
                applyToInput(input, _genDegree, _outDegree, _gen, _out) {
                    return input;
                },
            },
            addSpongeIncome: {
                defaultValue: 0,
                apply(current, degree, resource) {
                    if (!SharkGame.ResourceMap.get(resource).baseIncome) {
                        SharkGame.ResourceMap.get(resource).baseIncome = {};
                    }
                    if (!SharkGame.ResourceMap.get(resource).income) {
                        SharkGame.ResourceMap.get(resource).income = {};
                    }
                    const baseIncomes = SharkGame.ResourceMap.get(resource).baseIncome;
                    baseIncomes.sponge = (baseIncomes.sponge ? baseIncomes.sponge : 0) + degree;
                    res.reapplyModifiers(resource, "sponge");
                    return current + degree;
                },
                effectDescription(degree, resource, background) {
                    return `Add ${degree} ${sharktext.getResourceName("sponge", false, false, background)}/s to ${sharktext.getResourceName(resource, false, 69, background)}`;
                },
                getEffect(_genDegree, _outDegree, _gen, _out) {
                    return 1;
                },
                applyToInput(input, _genDegree, _outDegree, _gen, _out) {
                    return input;
                },
            },
            addAlgaeIncome: {
                defaultValue: 0,
                apply(current, degree, resource) {
                    if (!SharkGame.ResourceMap.get(resource).baseIncome) {
                        SharkGame.ResourceMap.get(resource).baseIncome = {};
                    }
                    if (!SharkGame.ResourceMap.get(resource).income) {
                        SharkGame.ResourceMap.get(resource).income = {};
                    }
                    const baseIncomes = SharkGame.ResourceMap.get(resource).baseIncome;
                    baseIncomes.algae = (baseIncomes.algae ? baseIncomes.algae : 0) + degree;
                    res.reapplyModifiers(resource, "algae");
                    return current + degree;
                },
                effectDescription(degree, resource, background) {
                    return `Add ${degree} ${sharktext.getResourceName("algae", false, false, background)}/s to ${sharktext.getResourceName(resource, false, 69, background)}`;
                },
                getEffect(_genDegree, _outDegree, _gen, _out) {
                    return 1;
                },
                applyToInput(input, _genDegree, _outDegree, _gen, _out) {
                    return input;
                },
            },
            addSandIncome: {
                defaultValue: 0,
                apply(current, degree, resource) {
                    if (!SharkGame.ResourceMap.get(resource).baseIncome) {
                        SharkGame.ResourceMap.get(resource).baseIncome = {};
                    }
                    if (!SharkGame.ResourceMap.get(resource).income) {
                        SharkGame.ResourceMap.get(resource).income = {};
                    }
                    const baseIncomes = SharkGame.ResourceMap.get(resource).baseIncome;
                    baseIncomes.sand = (baseIncomes.sand ? baseIncomes.sand : 0) + degree;
                    res.reapplyModifiers(resource, "sand");
                    return current + degree;
                },
                effectDescription(degree, resource, background) {
                    return `Add ${degree} ${sharktext.getResourceName("sand", false, false, background)}/s to ${sharktext.getResourceName(resource, false, 69, background)}`;
                },
                getEffect(_genDegree, _outDegree, _gen, _out) {
                    return 1;
                },
                applyToInput(input, _genDegree, _outDegree, _gen, _out) {
                    return input;
                },
            },
        },
    },
    world: {
        multiplier: {
            planetaryIncomeMultiplier: {
                defaultValue: 1,
                name: "Planetary Income Multiplier",
                apply(current, degree, resource) {
                    const incomes = SharkGame.ResourceMap.get(resource).income;
                    $.each(incomes, (resouceId, income) => {
                        incomes[resouceId] = income * (1 + degree);
                    });
                    return current * (1 + degree);
                },
                effectDescription(degree, resource, background) {
                    return "Income from " + sharktext.getResourceName(resource, false, 2, background) + " ×" + (1 + degree).toFixed(2);
                },
                getEffect(genDegree, _outDegree, _gen, _out) {
                    return genDegree;
                },
                applyToInput(input, genDegree, _outDegree, _gen, _out) {
                    return input * genDegree;
                },
            },
            planetaryIncomeReciprocalMultiplier: {
                defaultValue: 1,
                name: "Planetary Income Reciprocal Multiplier",
                apply(current, degree, resource) {
                    const incomes = SharkGame.ResourceMap.get(resource).income;
                    $.each(incomes, (resourceId, income) => {
                        incomes[resourceId] = income * (1 / (1 + degree));
                    });
                    return current * (1 / (1 + degree));
                },
                effectDescription(degree, resource, background) {
                    return "Income from " + sharktext.getResourceName(resource, false, 2, background) + " ×" + (1 / (1 + degree)).toFixed(2);
                },
                getEffect(genDegree, _outDegree, _gen, _out) {
                    return genDegree;
                },
                applyToInput(input, genDegree, _outDegree, _gen, _out) {
                    return input * genDegree;
                },
            },
            planetaryResourceBoost: {
                defaultValue: 1,
                name: "Planetary Boost",
                apply(current, degree, boostedResource) {
                    SharkGame.ResourceMap.forEach((generatingResource) => {
                        $.each(generatingResource.income, (generatedResource, amount) => {
                            if (generatedResource === boostedResource && amount > 0) {
                                generatingResource.income[generatedResource] = amount * (1 + degree);
                            }
                        });
                    });
                    return current * (1 + degree);
                },
                effectDescription(degree, resource, background) {
                    return "All " + sharktext.getResourceName(resource, false, 2, background) + " production ×" + (1 + degree).toFixed(2);
                },
                getEffect(_genDegree, outDegree, _gen, _out) {
                    return outDegree;
                },
                applyToInput(input, _genDegree, outDegree, _gen, _out) {
                    return input * outDegree;
                },
            },
            planetaryResourceReciprocalBoost: {
                defaultValue: 1,
                name: "Planetary Reciprocal Boost",
                apply(current, degree, boostedResource) {
                    SharkGame.ResourceMap.forEach((generatingResource) => {
                        $.each(generatingResource.income, (generatedResource, amount) => {
                            if (generatedResource === boostedResource && amount > 0) {
                                generatingResource.income[generatedResource] = amount * (1 / (1 + degree));
                            }
                        });
                    });
                    return current * (1 / (1 + degree));
                },
                effectDescription(degree, resource, background) {
                    return "All " + sharktext.getResourceName(resource, false, 2, background) + " production ×" + (1 / (1 + degree)).toFixed(2);
                },
                getEffect(_genDegree, outDegree, _gen, _out) {
                    return outDegree;
                },
                applyToInput(input, _genDegree, outDegree, _gen, _out) {
                    return input * outDegree;
                },
            },
            planetaryFishMultiplier: {
                defaultValue: 1,
                apply(current, degree, boostedGenerator) {
                    const incomes = SharkGame.ResourceMap.get(boostedGenerator).income;
                    if (incomes.fish) {
                        incomes.fish = incomes.fish * degree;
                    }
                    return current * degree;
                },
                effectDescription(degree, boostedGenerator, background) {
                    return (sharktext.getResourceName(boostedGenerator, undefined, undefined, background) +
                        " collection of " +
                        sharktext.getResourceName("fish", undefined, undefined, background) +
                        " × " +
                        degree);
                },
                getEffect(degree, _gen, _out) {
                    return degree;
                },
                applyToInput(input, genDegree, _outDegree, _gen, out) {
                    return input * (out === "fish" ? genDegree : 1);
                },
            },
        },
        other: {
            planetaryIncome: {
                defaultValue: 0,
                name: "Income per Climate Level",
                apply(current, degree, resource) {
                    if (!SharkGame.ResourceMap.get("world").baseIncome) {
                        SharkGame.ResourceMap.get("world").baseIncome = {};
                        SharkGame.ResourceMap.get("world").income = {};
                    }
                    const baseIncomes = SharkGame.ResourceMap.get("world").baseIncome;
                    baseIncomes[resource] = (baseIncomes[resource] ? baseIncomes[resource] : 0) + degree;
                    res.reapplyModifiers("world", resource);
                    return current + degree;
                },
                effectDescription(degree, resource, background) {
                    return ("Gain " + sharktext.beautify(degree) + " " + sharktext.getResourceName(resource, false, degree, background) + " per second");
                },
                applyToInput(input, _genDegree, _outDegree, _gen, _out) {
                    return input;
                },
            },
        },
    },
    aspect: {
        multiplier: {
            pathOfIndustry: {
                defaultValue: 1,
                apply(current, degree, resource) {
                    const incomes = SharkGame.ResourceMap.get(resource).income;
                    $.each(incomes, (resouceId, income) => {
                        if (income > 0 && resouceId !== "tar") {
                            incomes[resouceId] = income * degree;
                        }
                    });
                    return current * degree;
                },
                effectDescription(degree, resource, background) {
                    return sharktext.getResourceName(resource, undefined, undefined, background) + " efficiency × " + degree;
                },
                getEffect(genDegree, _outDegree, gen, out) {
                    return SharkGame.ResourceMap.get(gen).income[out] > 0 && out !== "tar" ? genDegree : 1;
                },
                applyToInput(input, genDegree, _outDegree, _gen, out) {
                    return input * (input > 0 && out !== "tar" ? genDegree : 1);
                },
            },
            constructedConception: {
                defaultValue: 1,
                apply(current, degree, resource) {
                    const incomes = SharkGame.ResourceMap.get(resource).income;
                    $.each(incomes, (resouceId, income) => {
                        if (income > 0 && resouceId !== "tar") {
                            incomes[resouceId] = income * 2 ** degree;
                        }
                    });
                    return current * degree;
                },
                effectDescription(degree, resource, background) {
                    return sharktext.getResourceName(resource, undefined, undefined, background) + " efficiency × " + degree;
                },
                getEffect(genDegree, _outDegree, gen, out) {
                    return SharkGame.ResourceMap.get(gen).income[out] > 0 && out !== "tar" ? 2 ** (genDegree - 1) : 1;
                },
                applyToInput(input, genDegree, _outDegree, _gen, out) {
                    return input * (input > 0 && out !== "tar" ? 2 ** (genDegree - 1) : 1);
                },
            },
            theTokenForGenerators: {
                defaultValue: 1,
                apply(current, degree, resource) {
                    const incomes = SharkGame.ResourceMap.get(resource).income;
                    $.each(incomes, (resourceId, income) => {
                        incomes[resourceId] = income * degree;
                    });
                    return current * degree;
                },
                effectDescription(degree, resource, background) {
                    return sharktext.getResourceName(resource, undefined, undefined, background) + " speed × " + degree;
                },
                getEffect(genDegree, _outDegree, gen, out) {
                    return SharkGame.ResourceMap.get(gen).income[out] > 0 && out !== "tar" ? genDegree : 1;
                },
                applyToInput(input, genDegree, _outDegree, _gen, _out) {
                    return input * genDegree;
                },
            },
            theTokenForResources: {
                defaultValue: 1,
                apply(current, degree, boostedResource) {
                    SharkGame.ResourceMap.forEach((generatingResource) => {
                        $.each(generatingResource.income, (generatedResource, amount) => {
                            if (generatedResource === boostedResource && amount > 0) {
                                generatingResource.income[generatedResource] = amount * degree;
                            }
                        });
                    });
                    return current * degree;
                },
                effectDescription(degree, resource, background) {
                    return "All " + sharktext.getResourceName(resource, undefined, undefined, background) + " production × " + degree;
                },
                getEffect(_genDegree, outDegree, gen, out) {
                    return SharkGame.ResourceMap.get(gen).income[out] > 0 && out !== "tar" ? outDegree : 1;
                },
                applyToInput(input, _genDegree, outDegree, _gen, _out) {
                    return input > 0 ? input * outDegree : input;
                },
            },
        },
        other: {
            clawSharpening: {
                defaultValue: 0,
                apply(_current, degree, resource) {
                    const baseIncomes = SharkGame.ResourceMap.get(resource).baseIncome;
                    baseIncomes.fish = 0.1 * 2 ** (degree - 1);
                    res.reapplyModifiers(resource, "fish");
                    return degree;
                },
                getEffect(_genDegree, _outDegree, _gen, _out) {
                    return 1;
                },
                applyToInput(input, _genDegree, _outDegree, _gen, _out) {
                    return input;
                },
            },
        },
    },
};
//# sourceMappingURL=modifiertypes.js.map