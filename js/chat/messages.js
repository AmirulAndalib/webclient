
var Message = function(chatRoom, messagesBuff, vals) {
    var self = this;

    self.chatRoom = chatRoom;
    self.messagesBuff = messagesBuff;


    MegaDataObject.attachToExistingJSObject(
        self,
        {
            'userId': true,
            'messageId': true,
            'orderValue': false,

            'message': true,
            'textContents': false,

            'delay': true,

            'orderValue': false,

            'sent': false,
            'deleted': false
        },
        true,
        vals
    );

    self._parent = chatRoom.messagesBuff;
};

Message._mockupNonLoadedMessage = function(msgId, msg, orderValueIfNotFound) {
    if(!msg) {
        return {
            messageId: msgId,
            orderValue: orderValueIfNotFound
        };
    } else {
        return msg;
    }
};

Message.prototype.getState = function() {
    var self = this;
    var mb = self.messagesBuff;

    if (!self.orderValue) {
        return Message.STATE.NULL;
    }

    var lastReceivedMessage = Message._mockupNonLoadedMessage(mb.lastDelivered, mb.messages[mb.lastDelivered], 0);
    var lastSeenMessage = Message._mockupNonLoadedMessage(mb.lastSeen, mb.messages[mb.lastSeen], 0);

    if(self.userId === u_handle) {
        // can be NOT_SENT, SENT, DELIVERED and DELETED
        if (self.deleted === true) {
            return Message.STATE.DELETED;
        }
        else if (self.sent === false) {
            return Message.STATE.NOT_SENT;
        }
        else if (self.sent === true && self.orderValue > lastReceivedMessage.orderValue) {
            return Message.STATE.SENT;
        }
        else if (self.sent === true && self.orderValue <= lastReceivedMessage.orderValue) {
            return Message.STATE.DELIVERED;
        }
        else {
            console.error("Was not able to determinate state from pointers [1].");
            return -1;
        }
    } else {
        // can be NOT_SEEN, SEEN and DELETED
        if (self.deleted === true) {
            return Message.STATE.DELETED;
        }
        else if (self.orderValue > lastSeenMessage.orderValue) {
            return Message.STATE.NOT_SEEN;
        }
        else if (self.orderValue <= lastSeenMessage.orderValue) {
            return Message.STATE.SEEN;
        }

        else {
            console.error("Was not able to determinate state from pointers [2].");
            return -2;
        }
    }
};

Message.STATE = {
    'NULL': 0,
    'NOT_SEEN': 1,
    'NOT_SENT': 2,
    'SENT': 3,
    'DELIVERED': 4,
    'SEEN': 6,
    'DELETED': 8
};


/**
 * Simple interface/structure wrapper for inline dialogs
 * @param opts
 * @constructor
 */
var ChatDialogMessage = function(opts) {
    assert(opts.messageId, 'missing messageId');
    assert(opts.type, 'missing type');

    MegaDataObject.attachToExistingJSObject(
        this,
        {
            'type': true,
            'messageId': true,
            'textMessage': true,
            'authorContact': true,
            'delay': true,
            'buttons': true,
            'read': true,
            'persist': true,
            'deleted': 0,
            'seen': false
        },
        true,
        ChatDialogMessage.DEFAULT_OPTS
    );
    $.extend(true, this, opts);

    return this;
};

/**
 * Default values for the ChatDialogMessage interface/datastruct.
 *
 * @type {Object}
 */
ChatDialogMessage.DEFAULT_OPTS = {
    'type': '',
    'messageId': '',
    'textMessage': '',
    'authorContact': '',
    'delay': 0,
    'buttons': {},
    'read': false,
    'persist': true
};


/**
 * Basic collection class that should collect all messages from different sources (chatd at the moment and xmpp in the
 * future)
 *
 * @param chatRoom
 * @param chatdInt
 * @constructor
 */
var MessagesBuff = function(chatRoom, chatdInt) {
    var self = this;

    self.chatRoom = chatRoom;
    self.chatdInt = chatdInt;
    self.chatd = chatdInt.chatd;

    self.messages = new MegaDataSortedMap("messageId", "orderValue,delay", this);

    self.lastSeen = null;
    self.lastSent = null;
    self.lastDelivered = null;
    self.isRetrievingHistory = false;
    self.firstMessageId = null;
    self.lastMessageId = null;
    self.lastDeliveredMessageRetrieved = false;
    self.lastSeenMessageRetrieved = false;
    self.retrievedAllMessages = false;

    self.chatdIsProcessingHistory = false;
    self._currentHistoryPointer = 0;
    self.$msgsHistoryLoading = null;
    self._unreadCountCache = 0;

    self.logger = MegaLogger.getLogger("messagesBuff[" + chatRoom.roomJid.split("@")[0] + "]", {}, chatRoom.logger);

    manualTrackChangesOnStructure(self, true);

    self._parent = chatRoom;

    var chatRoomId = chatRoom.roomJid.split("@")[0];

    self.chatd.rebind('onMessageLastSeen.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (chatRoom.roomJid === self.chatRoom.roomJid) {
            self.lastSeen = eventData.messageId;
            self.messages.trackDataChange();
        }
    });

    self.chatd.rebind('onMessageConfirm.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (chatRoom.roomJid === self.chatRoom.roomJid) {
            self.lastSent = eventData.messageId;
            self.messages.trackDataChange();
        }
    });

    self.chatd.rebind('onMessageLastReceived.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (chatRoom.roomJid === self.chatRoom.roomJid) {
            self.setLastReceived(eventData.messageId);
        }
    });

    self.chatd.rebind('onMessagesHistoryDone.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (chatRoom.roomJid === self.chatRoom.roomJid) {
            self.isRetrievingHistory = false;
            self.chatdIsProcessingHistory = false;

            if (self.$msgsHistoryLoading && self.$msgsHistoryLoading.state() === 'pending') {
                self.$msgsHistoryLoading.resolve();
            }

            //self.messages.forEach(function(v, k) {
            //    var messageObject = self.chatdInt._getKarereObjFromChatdObj(v);
            //
            //    if (messageObject) {
            //        messageObject.orderValue = v.id;
            //        chatRoom.appendMessage(messageObject);
            //    }
            //});

            self.trackDataChange();
        }
    });


    self.chatd.rebind('onMessagesHistoryInfo.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (chatRoom.roomJid === self.chatRoom.roomJid) {
            self.firstMessageId = eventData.oldest;
            self.lastMessageId = eventData.newest;
            self.trackDataChange();
        }
    });

    self.chatd.rebind('onMessagesHistoryRequest.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (chatRoom.roomJid === self.chatRoom.roomJid) {
            self.isRetrievingHistory = true;
            self.trackDataChange();
        }
    });

    self.chatd.rebind('onMessageStore.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (chatRoom.roomJid === self.chatRoom.roomJid) {
            //console.error("onMessageStore.messagesBuff", self.chatRoom.roomJid, self.isRetrievingHistory, eventData);


            var msgObject = new Message(chatRoom,
                self,
                {
                    'messageId': eventData.messageId,
                    'userId': eventData.userId,
                    'message': eventData.message,
                    'textContents': eventData.message, // TODO: use encryption to prefill this value!
                    'delay': eventData.ts,
                    'orderValue': eventData.id
                }
            );

            if (eventData.messageId === self.lastSeen) {
                self.lastSeenMessageRetrieved = true;
            }
            if (eventData.messageId === self.lastDelivered) {
                self.lastDeliveredMessageRetrieved = true;
            }
            if (eventData.messageId === self.firstMessageId) {
                self.retrievedAllMessages = true;
            }

            // is my own message?
            if (!eventData.isNew) {
                // mark as sent, since the msg was echoed from the server
                if (eventData.userId === u_handle) {
                    msgObject.sent = true;
                }
            }

            //console.error(msgObject.messageId, msgObject.userId, constStateToText(Message.STATE, msgObject.state));

            self.messages.push(msgObject);

            if(!eventData.isNew) {
                if(eventData.userId !== u_handle) {
                    if (self.lastDeliveredMessageRetrieved === true) {
                        // received a message from history, which was NOT marked as received, e.g. was sent during
                        // this user was offline, so -> do proceed and mark it as received automatically
                        self.setLastReceived(eventData.messageId);

                    }
                }
            } else {
                // if not from history
                // mark as received if not sent by me
                if (eventData.userId !== u_handle) {
                    self.setLastReceived(eventData.messageId);
                }
            }
        }
    });

    self.chatd.rebind('onMessageCheck.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (chatRoom.roomJid === self.chatRoom.roomJid) {
            self.retrieveChatHistory();
        }
    });

    self.chatd.rebind('onMessageUpdated.messagesBuff' + chatRoomId, function(e, eventData) {
        var chatRoom = self.chatdInt._getChatRoomFromEventData(eventData);

        if (self.chatRoom.chatId !== chatRoom.chatId) {
            return; // ignore event
        }
        if (eventData.state === "CONFIRMED") {
            if (!eventData.id) {
                debugger;
            }
            //console.error("Confirmed: ", eventData.id);

            var found = false;

            self.messages.forEach(function(v, k) {
                if (v.internalId === eventData.id) {
                    var confirmedMessage = new Message(
                        chatRoom,
                        self,
                        {
                            'messageId': eventData.messageId,
                            'userId': u_handle,
                            'message': eventData.message,
                            'textContents': eventData.message, // TODO: use encryption to prefill this property
                            'delay': v.delay,
                            'orderValue': eventData.id,
                            'sent': true
                        }
                    );


                    self.messages.removeByKey(v.messageId);
                    self.messages.push(confirmedMessage);

                    self.lastMessageId = self.messages.getItem(self.messages.length - 1).messageId;

                    found = true;

                    throw StopIteration; // break
                }
            });
            if (!found) {
                self.logger.error("Message that was confirmed not found: ", eventData);
            }
        }
    });


    self.addChangeListener(function() {
        var newCounter = 0;
        self.messages.forEach(function(v, k) {
            if(v.getState && v.getState() === Message.STATE.NOT_SEEN) {
                newCounter++;
            }
        });
        if(self._unreadCountCache !== newCounter) {
            self._unreadCountCache = newCounter;
            self.chatRoom.megaChat.updateSectionUnreadCount();
        }
    });
};


MessagesBuff.prototype.getUnreadCount = function() {
    return this._unreadCountCache;
};

MessagesBuff.prototype.setLastSeen = function(msgId) {
    var self = this;
    var targetMsg = Message._mockupNonLoadedMessage(msgId, self.messages[msgId], 999999999);
    var lastMsg = Message._mockupNonLoadedMessage(self.lastSeen, self.messages[self.lastSeen], 0);

    if (!self.lastSeen || lastMsg.orderValue < targetMsg.orderValue) {
        self.lastSeen = msgId;

        if (!self.isRetrievingHistory) {
            self.chatdInt.markMessageAsSeen(self.chatRoom, msgId);
        }

        // check if last recv needs to be updated
        var lastRecvMessage = self.messages[self.lastDelivered];
        if (self.lastDelivered && !lastRecvMessage) {
            lastRecvMessage = {
                'messageId': self.lastDelivered,
                'orderValue': 0 /* from history! */
            };
        }

        if(!lastRecvMessage || lastRecvMessage.orderValue < targetMsg.orderValue) {
            self.setLastReceived(msgId);
        }

        self.trackDataChange();
    }
};


MessagesBuff.prototype.setLastReceived = function(msgId) {
    var self = this;
    var targetMsg = Message._mockupNonLoadedMessage(msgId, self.messages[msgId], 0);
    var lastMsg = Message._mockupNonLoadedMessage(self.lastDelivered, self.messages[self.lastDelivered], 999999999);
    console.error("set last received", msgId);

    if (!self.lastDelivered || lastMsg.orderValue < targetMsg.orderValue) {
        console.error("Would SET last recv: ", lastMsg ? lastMsg.messageId : undefined, targetMsg ? targetMsg.messageId : undefined, msgId, self.lastDelivered);

        self.lastDelivered = msgId;
        if (!self.isRetrievingHistory) {
            self.chatdInt.markMessageAsReceived(self.chatRoom, msgId);
        }

        self.trackDataChange();
    } else {
        console.error("Would not set last recv: ", lastMsg.messageId, targetMsg.messageId, self.lastDelivered);
    }
};


MessagesBuff.prototype.messagesHistoryIsLoading = function() {
    var self = this;
    return (
            self.$msgsHistoryLoading && self.$msgsHistoryLoading.state() === 'pending'
        ) || self.chatdIsProcessingHistory;
};

MessagesBuff.prototype.retrieveChatHistory = function() {
    var self = this;

    if (self.messagesHistoryIsLoading()) {
        return self.$msgsHistoryLoading;
    } else {
        self.chatdIsProcessingHistory = true;
        self._currentHistoryPointer -= 32;
        self.$msgsHistoryLoading = new MegaPromise();
        self.chatdInt.retrieveHistory(
            self.chatRoom,
            self._currentHistoryPointer
        );


        var timeoutPromise = createTimeoutPromise(function() {
            return self.$msgsHistoryLoading.state() !== 'pending'
        }, 100, 10000)
            .always(function() {
                self.chatdIsProcessingHistory = false;
            })
            .fail(function() {
                self.$msgsHistoryLoading.reject();
            });

        self.$msgsHistoryLoading.fail(function() {
            console.error("HIST FAILED: ", arguments);
            self._currentHistoryPointer += 32;
        });


        return self.$msgsHistoryLoading;
    }
};

MessagesBuff.prototype.haveMoreHistory = function() {
    var self = this;

    if (!self.firstMessageId || !self.messages[self.firstMessageId]) {
        return true;
    } else {
        return false;
    }
};


MessagesBuff.prototype.markAllAsSeen = function() {
    var self = this;
    var lastToBeMarkedAsSeen = null;

    var keys = clone(self.messages.keys());
    keys.forEach(function(k) {
        var msg = self.messages[k];

        if(msg.userId !== u_handle) {
            lastToBeMarkedAsSeen = k;
            return false; // break?
        }
    });

    if(lastToBeMarkedAsSeen) {
        self.setLastSeen(lastToBeMarkedAsSeen);
    }
};
MessagesBuff.prototype.markAllAsReceived = function() {
    var self = this;

    var lastToBeMarkedAsReceived = null;

    // TODO: move to .getItem(-1).messageId ?
    var keys = clone(self.messages.keys());
    keys.forEach(function(k) {
        var msg = self.messages[k];

        lastToBeMarkedAsReceived = k;
    });

    if(lastToBeMarkedAsReceived) {
        self.setLastReceived(lastToBeMarkedAsReceived);
    }
};


/**
 * Get message by Id
 * @param messageId {string} message id
 * @returns {boolean}
 */
MessagesBuff.prototype.getMessageById = function(messageId) {
    var self = this;
    var found = false;
    $.each(self.messages, function(k, v) {
        if (v.messageId === messageId) {
            found = v;
            return false; //break;
        }
    });

    return found;
};

MessagesBuff.prototype.removeMessageById = function(messageId) {
    var self = this;
    self.messages.forEach(function(v, k) {
        if (v.deleted === 1) {
            return; // skip
        }

        if (v.messageId === messageId) {
            v.deleted = 1;
            if (!v.seen) {
                v.seen = true;
            }

            // cleanup the messagesIndex
            self.messages.removeByKey(v.messageId);
            return false; // break;
        }
    });
};
MessagesBuff.prototype.removeMessageBy = function(cb) {
    var self = this;
    self.messages.forEach(function(v, k) {
        if (cb(v, k) === true) {
            self.removeMessageById(v.messageId);
        }
    });
};
MessagesBuff.prototype.removeMessageByType = function(type) {
    var self = this;
    self.removeMessageBy(function(v, k) {
        if (v.type === type) {
            return true;
        }
        else {
            return false;
        }
    })
};
