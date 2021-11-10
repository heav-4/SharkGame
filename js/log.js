"use strict";
SharkGame.Log = {
    initialised: false,
    messages: [],
    totalCount: 0,

    init() {
        this.moveLog();
        log.initialised = true;
    },

    moveLog() {
        $("#log").remove();
        const logDiv = $("<div id='log'></div>");

        switch (SharkGame.Settings.current.logLocation) {
            case "left":
                $("#sidebar").append(logDiv.append("<h3>Log<h3/>").append($("<ul id='messageList'></ul>").addClass("forLeftSide")));
                $("#wrapper").removeClass("topLogActive");
                $("#titlebackground").removeClass("topLogActive");
                break;
            case "top":
                $("#titlebar").append(logDiv);
                logDiv
                    .append($("<button id='extendLog' class='min close-button'>⯆</button>").on("click", log.toggleExtendedLog))
                    .append("<ul id='messageList'></ul>");
                $("#wrapper").addClass("topLogActive");
                $("#titlebackground").addClass("topLogActive");
                break;
            default:
                $("#rightLogContainer").append(logDiv.append("<h3>Log<h3/>").append($("<ul id='messageList'></ul>").addClass("forRightSide")));
                $("#wrapper").removeClass("topLogActive");
                $("#titlebackground").removeClass("topLogActive");
        }

        const prevMessages = _.cloneDeep(log.messages);
        log.messages = [];
        _.each(prevMessages, (message) => {
            if (message.hasClass("discovery")) {
                log.addDiscovery(message.html());
            } else if (message.hasClass("error")) {
                log.addError(message.html());
            } else {
                log.addMessage(message.html());
            }
        });
    },

    addMessage(message) {
        const showAnims = SharkGame.Settings.current.showAnimations;

        if (!log.initialised) {
            log.init();
        }
        const messageItem = $("<li>").html(message);

        if (this.totalCount % 2 === 1) {
            messageItem.addClass("evenMessage");
        }

        if (showAnims) {
            messageItem.hide().css("opacity", 0).prependTo("#messageList").slideDown(50).animate({ opacity: 1.0 }, 100);
        } else {
            messageItem.prependTo("#messageList");
        }
        log.messages.push(messageItem);

        log.correctLogLength();

        this.totalCount += 1;

        return messageItem;
    },

    addError(message) {
        if (message instanceof Error) {
            console.error(message);
            message = message.message;
        }
        const messageItem = log.addMessage("Error: " + message);
        messageItem.addClass("error");
        return messageItem;
    },

    addDiscovery(message) {
        const messageItem = log.addMessage(message);
        messageItem.addClass("discovery");
        return messageItem;
    },

    correctLogLength() {
        const showAnims = SharkGame.Settings.current.showAnimations;
        const logMax = SharkGame.Settings.current.logMessageMax;

        if (log.messages.length >= logMax) {
            while (log.messages.length > logMax) {
                const oldestMessage = log.messages[0];
                // remove oldest message
                if (showAnims) {
                    log.messages[0].animate({ opacity: 0 }, 100, "swing", () => {
                        $(oldestMessage).remove();
                    });
                } else {
                    oldestMessage.remove();
                }

                // shift array (remove first item)
                log.messages.shift();
            }
        }
    },

    clearMessages(logThing = true) {
        // remove each element from page
        _.each(log.messages, (message) => {
            message.remove();
        });
        // wipe array
        log.messages = [];
        if (logThing) log.addMessage("Log cleared.");
    },

    toggleExtendedLog() {
        const title = $("#title");
        const messageList = $("#messageList");
        if (messageList.hasClass("scrollable")) {
            title.removeClass("biggerTitleDiv");
            messageList.removeClass("scrollable");
            $("#extendLog").html("⯆");
        } else {
            title.addClass("biggerTitleDiv");
            messageList.addClass("scrollable");
            $("#extendLog").html("⯅");
        }
    },

    haveAnyMessages() {
        return log.messages.length > 0;
    },
};
