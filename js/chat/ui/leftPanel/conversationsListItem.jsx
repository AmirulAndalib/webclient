import React from 'react';
import { MegaRenderMixin, timing } from '../../mixins';
import utils, { OFlowParsedHTML, ParsedHTML } from '../../../ui/utils.jsx';
import { Avatar, ContactPresence } from '../contacts.jsx';

export default class ConversationsListItem extends MegaRenderMixin {
    domRef = React.createRef();

    state = {
        isLoading: true,
    };

    isLoading() {
        const mb = this.props.chatRoom.messagesBuff;

        if (mb.haveMessages) {
            return false;
        }

        return mb.messagesHistoryIsLoading() || mb.joined === false && mb.isDecrypting;
    }

    specShouldComponentUpdate() {
        return !this.state.isLoading;
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        this.props.chatRoom.unbind('onUnreadCountUpdate.conversationsListItem');
    }

    componentDidMount() {
        super.componentDidMount();
        this.eventuallyScrollTo();
        const promise = this.isLoading();
        if (promise && promise.always) {
            promise.always(() => {
                if (this.isMounted()) {
                    this.setState({ isLoading: false });
                }
            });
        }
        else if (promise === false) {
            this.setState({ isLoading: false });
        }
        this.props.chatRoom.rebind('onUnreadCountUpdate.conversationsListItem', () => {
            this.safeForceUpdate();
        });
    }

    componentDidUpdate() {
        super.componentDidUpdate();

        this.eventuallyScrollTo();
    }

    @utils.SoonFcWrap(40, true)
    eventuallyScrollTo() {
        const chatRoom = this.props.chatRoom || false;

        if (chatRoom._scrollToOnUpdate) {

            if (chatRoom.isCurrentlyActive) {
                chatRoom.scrollToChat();
            }
            else {
                chatRoom._scrollToOnUpdate = false;
            }
        }
    }

    getConversationTimestamp() {
        const { chatRoom } = this.props;
        if (chatRoom) {
            const lastMessage = chatRoom.messagesBuff.getLatestTextMessage();
            const timestamp = lastMessage && lastMessage.delay || chatRoom.ctime;
            return todayOrYesterday(timestamp * 1000) ? getTimeMarker(timestamp) : time2date(timestamp, 17);
        }
        return null;
    }

    getScheduledDateTime() {
        const { scheduledMeeting } = this.props.chatRoom;

        if (scheduledMeeting) {
            const { nextOccurrenceStart, nextOccurrenceEnd } = scheduledMeeting;

            return {
                date: time2date(nextOccurrenceStart / 1000, 19),
                startTime: toLocaleTime(nextOccurrenceStart),
                endTime: toLocaleTime(nextOccurrenceEnd)
            };
        }
    }

    @timing(0.7, 8)
    render() {
        var classString = "";
        var chatRoom = this.props.chatRoom;
        if (!chatRoom || !chatRoom.chatId) {
            return null;
        }

        var roomId = chatRoom.chatId;

        // selected
        if (chatRoom.isCurrentlyActive) {
            classString += " active";
        }

        var nameClassString = "user-card-name conversation-name selectable-txt";

        var contactId;
        var id;
        let contact;

        if (chatRoom.type === 'private') {
            const handle = chatRoom.getParticipantsExceptMe()[0];
            contact = handle ? M.u[handle] : M.u[u_handle];
            id = `conversation_${htmlentities(contact.u)}`;
        }
        else if (chatRoom.type === 'group') {
            contactId = roomId;
            id = `conversation_${contactId}`;
            classString += ' groupchat';
        }
        else if (chatRoom.type === 'public') {
            contactId = roomId;
            id = `conversation_${contactId}`;
            classString += ' groupchat public';
        }
        else {
            return `Unknown room type for ${chatRoom.roomId}`;
        }

        var unreadCount = chatRoom.messagesBuff.getUnreadCount();
        var isUnread = false;

        var notificationItems = [];
        if (chatRoom.havePendingCall() && chatRoom.state !== ChatRoom.STATE.LEFT) {
            notificationItems.push(
                <i
                    className="tiny-icon white-handset"
                    key="callIcon"
                />
            );
        }
        if (unreadCount > 0) {
            notificationItems.push(
                <span key="unreadCounter">
                    {unreadCount > 9 ? "9+" : unreadCount}
                </span>
            );
            isUnread = true;
        }


        var lastMessageDiv = null;
        const showHideMsg  = mega.config.get('showHideChat');

        var lastMessage = showHideMsg ? '' : chatRoom.messagesBuff.getLatestTextMessage();
        var lastMsgDivClasses;

        if (lastMessage) {
            lastMsgDivClasses = "conversation-message" + (isUnread ? " unread" : "");
            const renderableSummary = chatRoom.messagesBuff.getRenderableSummary(lastMessage);

            if (chatRoom.havePendingCall() || chatRoom.haveActiveCall()) {
                lastMsgDivClasses += " call";
                classString += " call-exists";
            }
            lastMessageDiv =
                <div className={lastMsgDivClasses}>
                    <ParsedHTML>
                        {renderableSummary}
                    </ParsedHTML>
                </div>;

            if (
                lastMessage.textContents &&
                lastMessage.textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP &&
                lastMessage.getAttachmentMeta()[0]
            ) {
                const playTime = secondsToTimeShort(lastMessage.getAttachmentMeta()[0].playtime);
                lastMessageDiv = (
                    <div className={lastMsgDivClasses}>
                        <i className="sprite-fm-mono icon-audio-filled voice-message-icon" />
                        {playTime}
                    </div>
                );
            }

            if (lastMessage.metaType && lastMessage.metaType === Message.MESSAGE_META_TYPE.GEOLOCATION) {
                lastMessageDiv =
                    <div className={lastMsgDivClasses}>
                        <i className="sprite-fm-mono icon-location geolocation-icon" />
                        {l[20789]}
                    </div>;
            }
        }
        else {
            lastMsgDivClasses = "conversation-message";

            /**
             * Show "Loading" until:
             * 1. I'd fetched chats from the API.
             * 2. I'm retrieving history at the moment.
             * 3. I'd connected to chatd and joined the room.
             */
            lastMessageDiv = showHideMsg
                ? '' :
                <div className={lastMsgDivClasses}>
                    {this.state.isLoading ? l[7006] : l[8000]}
                </div>;
        }

        if (chatRoom.type !== 'public') {
            nameClassString += ' privateChat';
        }
        let roomTitle = <OFlowParsedHTML>{megaChat.html(chatRoom.getRoomTitle())}</OFlowParsedHTML>;
        if (chatRoom.type === 'private') {
            roomTitle = megaChat.WITH_SELF_NOTE && chatRoom.isNote ?
                <span className="note-chat-label">{l.note_label}</span> :
                <span>
                    <div className="user-card-wrapper">
                        <OFlowParsedHTML>{megaChat.html(chatRoom.getRoomTitle())}</OFlowParsedHTML>
                    </div>
                </span>;
        }
        nameClassString += chatRoom.type === "private" || chatRoom.type === "group" ? ' badge-pad' : '';

        const { scheduledMeeting, isMeeting } = chatRoom;
        const isUpcoming = scheduledMeeting && scheduledMeeting.isUpcoming;
        const { startTime, endTime } = this.getScheduledDateTime() || {};
        const isEmptyNote = chatRoom.isNote && !chatRoom.hasMessages();

        return (
            <li
                ref={this.domRef}
                id={id}
                className={`
                    ${classString}
                    ${isUpcoming ? 'upcoming-conversation' : ''}
                    ${this.props.className || ''}
                `}
                data-room-id={roomId}
                data-jid={contactId}
                onClick={ev => this.props.onConversationClick?.(ev) || loadSubPage(chatRoom.getRoomUrl(false))}>
                <div className="conversation-avatar">
                    {(chatRoom.type === 'group' || chatRoom.type === 'public') &&
                        <div
                            className={`
                                chat-topic-icon
                                ${isMeeting ? 'meeting-icon' : ''}
                            `}>
                            <i
                                className={
                                    isMeeting ?
                                        'sprite-fm-mono icon-video-call-filled' :
                                        'sprite-fm-uni icon-chat-group'
                                }
                            />
                        </div>
                    }
                    {chatRoom.type === 'private' && contact &&
                        chatRoom.isNote ?
                            <div
                                className={`
                                    note-chat-signifier
                                    ${isEmptyNote ? 'note-chat-empty' : ''}
                                `}>
                                <i className="sprite-fm-mono icon-file-text-thin-outline note-chat-icon" />
                            </div> :
                            <Avatar contact={contact}/>
                    }
                </div>
                <div className="conversation-data">
                    <div className="conversation-data-top">
                        <div className={`conversation-data-name ${nameClassString}`}>
                            {roomTitle}
                            {chatRoom.isMuted() ?
                                <i className="sprite-fm-mono icon-notification-off-filled muted-conversation-icon" /> :
                                null
                            }
                        </div>
                        {chatRoom.isNote ?
                            null :
                            <div className="conversation-data-badges">
                                {chatRoom.type === 'private' ? <ContactPresence contact={contact} /> : null}
                                {chatRoom.type === 'group' || chatRoom.type === 'private' ?
                                    <i className="sprite-fm-uni icon-ekr-key simpletip" data-simpletip={l[20935]} /> :
                                    null
                                }
                                {scheduledMeeting && scheduledMeeting.isUpcoming && scheduledMeeting.isRecurring &&
                                    <i className="sprite-fm-mono icon-repeat-thin-solid" />
                                }
                            </div>
                        }
                    </div>
                    <div className="clear" />
                    {isUpcoming ?
                        <div className="conversation-message-info">
                            <div className="conversation-scheduled-data">
                                <span>{startTime}</span>
                                <span>&nbsp; - &nbsp;</span>
                                <span>{endTime}</span>
                            </div>
                            <div className="conversation-scheduled-data">
                                {notificationItems.length > 0 ?
                                    <div
                                        className={`
                                            unread-messages
                                            items-${notificationItems.length}
                                            unread-upcoming
                                            ${unreadCount > 9 && notificationItems.length > 1 ? 'unread-spaced' : ''}
                                        `}>
                                        {notificationItems}
                                    </div> :
                                    null
                                }
                            </div>
                        </div> :
                        <div className="conversation-message-info">
                            {isEmptyNote ? null : lastMessageDiv}
                        </div>
                    }
                </div>
                {isUpcoming || isEmptyNote ?
                    null :
                    <div className="date-time-wrapper">
                        <div className="date-time">{this.getConversationTimestamp()}</div>
                        {notificationItems.length > 0 ?
                            <div
                                className={`
                                    unread-messages-container
                                    ${unreadCount > 9 && notificationItems.length > 1 ? 'unread-spaced' : ''}
                                `}>
                                <div className={`unread-messages items-${notificationItems.length}`}>
                                    {notificationItems}
                                </div>
                            </div> :
                            null
                        }
                    </div>
                }
            </li>
        );
    }
}
