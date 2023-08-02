"use strict";
SharkGame.MathUtil = {
    constantCost(current, difference, cost) {
        if (typeof current === "object") {
            return cost.times(difference);
        }
        return difference * cost;
    },
    constantMax(current, available, cost) {
        if (typeof current === "object") {
            return available.dividedBy(cost).plus(current);
        }
        available = Math.floor(Math.floor(available) * (1 - 1e-9) + 0.1);
        return available / cost + current;
    },
    linearCost(current, difference, constant) {
        if (typeof current === "object") {
            return constant.dividedBy(2).times(difference.times(difference).plus(difference).plus(current.times(2).times(difference)));
        }
        else {
            return (constant / 2) * (difference * difference + difference + 2 * difference * current);
        }
    },
    linearMax(current, available, cost) {
        if (typeof current === "object") {
            return current.times(current).plus(current).plus(available.times(2).dividedBy(cost)).plus(0.25).squareRoot().minus(0.5);
        }
        else {
            available = Math.floor(Math.floor(available) * (1 - 1e-9));
            return Math.sqrt(current * current + current + (2 * available) / cost + 0.25) - 0.5;
        }
    },
    uniqueCost(current, difference, cost) {
        if (typeof current === "object") {
            if (current.lessThan(1) && current.plus(difference).lessThanOrEqualTo(2)) {
                return cost;
            }
            else {
                return new Decimal(Number.POSITIVE_INFINITY);
            }
        }
        if (current < 1 && current + difference <= 2) {
            return cost;
        }
        else {
            return Number.POSITIVE_INFINITY;
        }
    },
    uniqueMax(current) {
        return typeof current === "object" ? new Decimal(1) : 1;
    },
    getBuyAmount(noMaxBuy) {
        if (SharkGame.Settings.current.buyAmount === "custom") {
            const customInput = document.getElementById("custom-input");
            return customInput instanceof HTMLInputElement && Math.floor(customInput.valueAsNumber) >= 1 && customInput.valueAsNumber < 1e18
                ? Math.floor(customInput.valueAsNumber)
                : 1;
        }
        if (SharkGame.Settings.current.buyAmount < 0 && noMaxBuy) {
            return 1;
        }
        return SharkGame.Settings.current.buyAmount;
    },
    getPurchaseAmount(resource, owned = res.getResource(resource)) {
        const buy = sharkmath.getBuyAmount();
        if (buy > 0) {
            return buy;
        }
        else {
            return Math.floor(owned / -buy);
        }
    },
};
SharkGame.TextUtil = {
    plural(number) {
        return number === 1 ? "" : "s";
    },
    getDeterminer(name) {
        const firstLetter = SharkGame.ResourceMap.get(name).name.charAt(0);
        if ([
            "kelp",
            "sand",
            "algae",
            "coral",
            "spronge",
            "delphinium",
            "coralglass",
            "porite",
            "sharkonium",
            "residue",
            "tar",
            "ice",
            "science",
            "arcana",
            "calcinium",
            "seagrass",
        ].includes(name)) {
            return "";
        }
        else if ("aeiou".includes(firstLetter)) {
            return "an";
        }
        else {
            return "a";
        }
    },
    getIsOrAre(name, amount = res.getResource(name)) {
        if ([
            "sand",
            "algae",
            "coral",
            "sponge",
            "spronge",
            "delphinium",
            "coralglass",
            "porite",
            "sharkonium",
            "residue",
            "tar",
            "ice",
            "science",
            "arcana",
            "kelp",
            "calcinium",
            "seagrass",
        ].includes(name) ||
            amount === 1) {
            return "is";
        }
        return "are";
    },
    shouldHideNumberOfThis(name) {
        return ["world", "aspectAffect", "specialResourceOne", "specialResourceTwo"].includes(name);
    },
    boldString(string) {
        return `<span class='bold'>${string}</span>`;
    },
    beautify(number, suppressDecimals, toPlaces) {
        if (cad.noNumberBeautifying) {
            return number.toExponential(5);
        }
        else if (SharkGame.Settings.current.notation === "exponen") {
            return number.toExponential(2);
        }
        let formatted;
        let negative = false;
        if (number < 0) {
            negative = true;
            number *= -1;
        }
        if (number === Number.POSITIVE_INFINITY) {
            formatted = "infinite";
        }
        else if (number < 1 && number >= 0) {
            if (suppressDecimals) {
                formatted = "0";
            }
            else if (number >= 0.01) {
                formatted = number.toFixed(2) + "";
            }
            else if (number >= 0.001) {
                formatted = number.toFixed(3) + "";
            }
            else if (number >= 0.0001) {
                formatted = number.toFixed(4) + "";
            }
            else if (number >= 0.00001) {
                formatted = number.toFixed(5) + "";
            }
            else {
                formatted = "0";
            }
            if (negative) {
                formatted = "-" + formatted;
            }
        }
        else {
            let suffixes;
            switch (SharkGame.Settings.current.notation) {
                case "SI":
                    suffixes = ["", "k", "M", "G", "T", "P", "E", "Z", "Y"];
                    break;
                default:
                    suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp"];
            }
            const digits = Math.floor(Math.log10(number));
            const precision = Math.max(0, 2 - (digits % 3));
            const suffixIndex = Math.floor(digits / 3);
            let suffix;
            if (suffixIndex >= suffixes.length) {
                if (number > 1e290) {
                    formatted = "max";
                }
                else if (number > 1e200) {
                    formatted = "too much";
                }
                else if (number > 1e100) {
                    formatted = "tons";
                }
                else {
                    formatted = "lots";
                }
            }
            else {
                suffix = suffixes[suffixIndex];
                if (suffixIndex > 0) {
                    number /= Math.pow(1000, suffixIndex);
                }
                let formattedNumber;
                if (suffixIndex === 0) {
                    if (toPlaces && toPlaces - digits > 0 && number !== Math.floor(number)) {
                        formattedNumber = number.toFixed(toPlaces - digits);
                    }
                    else {
                        formattedNumber = Math.floor(number);
                    }
                }
                else if (suffixIndex > 0) {
                    formattedNumber = number.toFixed(precision) + suffix;
                }
                else {
                    formattedNumber = number.toFixed(precision);
                }
                formatted = (negative ? "-" : "") + formattedNumber;
            }
        }
        return formatted;
    },
    beautifyIncome(number, also = "") {
        if (cad.noNumberBeautifying) {
            return number.toExponential(3) + also;
        }
        const abs = Math.abs(number);
        if (abs >= 0.001) {
            number = sharktext.beautify(number, false, 2);
            number += also;
            number += "/s";
        }
        else if (abs > 0.000001) {
            number *= 3600;
            number = number.toFixed(3);
            number += also;
            number += "/h";
        }
        else {
            number = 0 + also + "/s";
        }
        return number;
    },
    formatTime(milliseconds) {
        const numCentiseconds = Math.floor((milliseconds % 1000) / 10);
        const numSeconds = Math.floor(milliseconds / 1000);
        const numMinutes = Math.floor(numSeconds / 60);
        const numHours = Math.floor(numMinutes / 60);
        const numDays = Math.floor(numHours / 24);
        const numWeeks = Math.floor(numDays / 7);
        const numMonths = Math.floor(numWeeks / 4);
        const numYears = Math.floor(numMonths / 12);
        const formatCentiseconds = (milliseconds / 1000 < 10 ? "." + numCentiseconds.toString(10).padStart(2, "0") : "") + (numMinutes === 0 ? "s" : "");
        const formatSeconds = (numSeconds % 60).toString(10).padStart(numSeconds >= 60 ? 2 : 0, "0");
        const formatMinutes = numMinutes > 0 ? (numMinutes % 60).toString(10).padStart(2, "0") + ":" : "";
        const formatHours = numHours > 0 ? (numHours % 24).toString() + ":" : "";
        const formatDays = numDays > 0 ? (numDays % 7).toString() + "D, " : "";
        const formatWeeks = numWeeks > 0 ? (numWeeks % 4).toString() + "W, " : "";
        const formatMonths = numMonths > 0 ? (numMonths % 12).toString() + "M, " : "";
        const formatYears = numYears > 0 ? numYears.toString() + "Y, " : "";
        return formatYears + formatMonths + formatWeeks + formatDays + formatHours + formatMinutes + formatSeconds + formatCentiseconds;
    },
    getResourceName(resourceName, darken, arbitraryAmount, background, textToColor) {
        if (res.isCategory(resourceName)) {
            return textToColor || SharkGame.ResourceCategories[resourceName].name;
        }
        const resource = SharkGame.ResourceMap.get(resourceName);
        const amount = arbitraryAmount || Math.floor(SharkGame.PlayerResources.get(resourceName).amount);
        let name = textToColor || (amount - 1 < SharkGame.EPSILON ? resource.singleName : resource.name);
        let extraStyle = "";
        if (SharkGame.flags.egg) {
            if (amount > 1) {
                name = "eggs";
            }
            else {
                name = "egg";
            }
        }
        if (name === "world") {
            name = Math.random() > 0.0005 ? "world" : "ZA WARUDO";
        }
        if (SharkGame.Settings.current.boldCosts) {
            name = "<b>" + name + "</b>";
        }
        if (SharkGame.Settings.current.colorCosts !== "none") {
            let color = SharkGame.Settings.current.colorCosts === "color" ? resource.color : sharkcolor.getBrightColor(resource.color);
            if (darken) {
                color = sharkcolor.colorLum(resource.color, -0.5);
            }
            else if (background) {
                const backRLum = sharkcolor.getRelativeLuminance(background);
                const colorRLum = sharkcolor.getRelativeLuminance(color);
                let contrast;
                if (colorRLum > backRLum) {
                    contrast = (colorRLum + 0.05) / (backRLum + 0.05);
                }
                else {
                    contrast = (backRLum + 0.05) / (colorRLum + 0.05);
                }
                const tolerance = 3.5;
                if (contrast < tolerance) {
                    const requiredLuminance = tolerance * backRLum + 0.05 * tolerance - 0.05;
                    color = sharkcolor.correctLuminance(color, requiredLuminance > 1 ? (backRLum + 0.05) / tolerance - 0.05 : requiredLuminance);
                }
            }
            extraStyle = " style='color:" + color + "'";
        }
        return "<span class='click-passthrough'" + extraStyle + ">" + name + "</span>";
    },
    resourceListToString(resourceList, darken, backgroundColor) {
        if ($.isEmptyObject(resourceList)) {
            return "";
        }
        let formattedResourceList = "";
        _.each(resourceList, (resourceAmount, resourceId) => {
            if (typeof resourceAmount === "object") {
                resourceAmount = resourceAmount.toNumber();
            }
            if (resourceAmount > 0 && world.doesResourceExist(resourceId)) {
                formattedResourceList += sharktext.beautify(resourceAmount);
                formattedResourceList += " " + sharktext.getResourceName(resourceId, darken, resourceAmount, backgroundColor) + ", ";
            }
        });
        formattedResourceList = formattedResourceList.slice(0, -2);
        return formattedResourceList;
    },
};
SharkGame.ColorUtil = {
    colorLum(hex, lum) {
        hex = String(hex).replace(/[^0-9a-f]/gi, "");
        if (hex.length < 6) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        lum = lum || 0;
        let rgb = "#";
        for (let i = 0; i < 3; i++) {
            const color = parseInt(hex.substring(i * 2, (i + 1) * 2), 16);
            const colorString = Math.round(Math.min(Math.max(0, color + color * lum), 255)).toString(16);
            rgb += colorString.padStart(2, "0");
        }
        return rgb;
    },
    getRelativeLuminance(color) {
        color = String(color).replace(/[^0-9a-f]/gi, "");
        const red = parseInt(color.substring(0, 2), 16) / 255;
        const green = parseInt(color.substring(2, 4), 16) / 255;
        const blue = parseInt(color.substring(4, 6), 16) / 255;
        let lum = 0;
        _.each([red, green, blue], (piece, index) => {
            if (piece <= 0.03928) {
                piece = piece / 12.92;
            }
            else {
                piece = ((piece + 0.055) / 1.055) ** 2.4;
            }
            lum += piece * [0.2126, 0.7152, 0.0722][index];
        });
        return lum;
    },
    correctLuminance(color, luminance) {
        color = String(color).replace(/[^0-9a-f]/gi, "");
        const red = parseInt(color.substring(0, 2), 16) / 255;
        const green = parseInt(color.substring(2, 4), 16) / 255;
        const blue = parseInt(color.substring(4, 6), 16) / 255;
        const varA = 1.075 * (0.2126 * red ** 2 + 0.7152 * green ** 2 + 0.0722 * blue ** 2);
        const varB = -0.075 * (0.2126 * red + 0.7152 * green + 0.0722 * blue);
        const ratio = Math.max((-varB + Math.sqrt(varB ** 2 + 4 * varA * luminance)) / (2 * varA), 0);
        const redString = parseInt(Math.min(255, 255 * red * ratio).toFixed(0))
            .toString(16)
            .padStart(2, "0");
        const greenString = parseInt(Math.min(255, 255 * green * ratio).toFixed(0))
            .toString(16)
            .padStart(2, "0");
        const blueString = parseInt(Math.min(255, 255 * blue * ratio).toFixed(0))
            .toString(16)
            .padStart(2, "0");
        return "#" + redString + greenString + blueString;
    },
    convertColorString(color) {
        const colors = color
            .substring(4)
            .replace(/[^0-9a-f]/gi, " ")
            .split(" ");
        let colorstring = "#";
        for (let i = 0; i < 3; i++) {
            colorstring += ("00" + parseInt(colors[i * 2]).toString(16)).substring(parseInt(colors[i * 2]).toString(16).length);
        }
        return colorstring;
    },
    getBrightColor(color) {
        color = String(color).replace(/[^0-9a-f]/gi, "");
        const red = parseInt(color.substring(0, 2), 16) / 255;
        const green = parseInt(color.substring(2, 4), 16) / 255;
        const blue = parseInt(color.substring(4, 6), 16) / 255;
        const most = Math.max(red, green, blue);
        const redString = parseInt((255 * (1 / most) * red).toFixed(0)).toString(16);
        const greenString = parseInt((255 * (1 / most) * green).toFixed(0)).toString(16);
        const blueString = parseInt((255 * (1 / most) * blue).toFixed(0)).toString(16);
        return "#" + redString + greenString + blueString;
    },
    getElementColor(id, propertyName = "background-color") {
        const color = getComputedStyle(document.getElementById(id)).getPropertyValue(propertyName);
        return sharkcolor.convertColorString(color);
    },
    getVariableColor(variable) {
        return getComputedStyle(document.body).getPropertyValue(variable).replace(/ /g, "");
    },
};
SharkGame.TimeUtil = {
    getRunTime(ignoreMinuteHandAndPause) {
        const realRunTime = Date.now() - SharkGame.timestampRunStart;
        const pausedTime = SharkGame.persistentFlags.totalPausedTime + SharkGame.persistentFlags.currentPausedTime;
        let storedTime = SharkGame.flags.minuteHandTimer;
        if (typeof SharkGame.flags.hourHandLeft === "number") {
            storedTime -= SharkGame.flags.hourHandLeft;
        }
        if (typeof SharkGame.flags.bonusTime === "number") {
            storedTime -= SharkGame.flags.bonusTime;
        }
        if (ignoreMinuteHandAndPause) {
            return realRunTime;
        }
        else {
            return realRunTime - pausedTime - storedTime;
        }
    },
};
SharkGame.MiscUtil = {
    tryAddProperty(object, property, value) {
        if (object[property] === undefined) {
            object[property] = value;
        }
        return object;
    },
    cloneDeep(obj) {
        if (obj instanceof HTMLAllCollection) {
            return obj;
        }
        switch (typeof obj) {
            case "bigint":
            case "number":
            case "string":
            case "boolean":
            case "undefined":
            case "symbol":
                return obj;
            case "function":
                return obj;
            case "object": {
                if (obj === null) {
                    return null;
                }
                else if (Array.isArray(obj)) {
                    const clone = [];
                    for (const item of obj) {
                        clone.push(this.cloneDeep(item));
                    }
                    return clone;
                }
                else {
                    const clone = Object.create(Object.getPrototypeOf(obj));
                    const keys = Reflect.ownKeys(obj);
                    for (const key of keys) {
                        const descriptor = Reflect.getOwnPropertyDescriptor(obj, key);
                        if (descriptor.get !== undefined || descriptor.set !== undefined) {
                            Object.defineProperty(clone, key, descriptor);
                        }
                        else {
                            switch (typeof descriptor.value) {
                                case "boolean":
                                case "string":
                                case "number":
                                case "bigint":
                                case "symbol":
                                case "object":
                                    clone[key] = this.cloneDeep(descriptor.value);
                                    break;
                                case "undefined":
                                    console.warn("Property with value undefined? Huh?", descriptor, obj);
                                    clone[key] = this.cloneDeep(descriptor.value);
                                    break;
                                case "function":
                                    clone[key] = descriptor.value.bind(clone);
                                    break;
                                default:
                                    throw new Error(`Cannot clone object of type ${typeof descriptor.value} (This should never happen, why must you do this to me, JavaScript?)`);
                            }
                        }
                    }
                    return clone;
                }
            }
        }
    },
    has(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    },
};
//# sourceMappingURL=util.js.map