import React from 'react';
import { compose, ContactAwareComponent } from '../mixins';
import {MegaRenderMixin} from '../mixins';
import { Emoji, ParsedHTML, OFlowEmoji, reactStringWrap } from '../../ui/utils.jsx';
import { PerfectScrollbar } from '../../ui/perfectScrollbar.jsx';
import { Button } from '../../ui/buttons.jsx';
import { Dropdown, DropdownItem } from '../../ui/dropdowns.jsx';
import ContactsPanel from './contactsPanel/contactsPanel.jsx';
import ModalDialogs from "../../ui/modalDialogs";
import Link from "./link.jsx";
import { withUpdateObserver } from './updateObserver.jsx';

export const MAX_FREQUENTS = 3;

const closeDropdowns = () => {
    document.dispatchEvent(new Event('closeDropdowns'));
};

export class ContactButton extends ContactAwareComponent {
    static defaultProps = {
        'manualDataChangeTracking': true,
        'skipQueuedUpdatesOnResize': true
    };

    constructor(props) {
        super(props);
        this.dropdownItemGenerator = this.dropdownItemGenerator.bind(this);
    }

    customIsEventuallyVisible() {
        if (this.props.chatRoom) {
            return this.props.chatRoom.isCurrentlyActive;
        }
        return -1;
    }

    dropdownItemGenerator() {
        let { contact, dropdowns, chatRoom, dropdownRemoveButton } = this.props;
        dropdowns = dropdowns ? dropdowns : [];
        const moreDropdowns = [];

        const onContactClicked = () => {
            if (contact.c === 2) {
                loadSubPage('fm/account');
            }
            if (contact.c === 1) {
                loadSubPage('fm/chat/contacts/' + contact.u);
            }
        };

        moreDropdowns.push(
            <div
                className="dropdown-avatar rounded"
                key="mainContactInfo"
                onClick={onContactClicked}>
                <Avatar
                    className="avatar-wrapper context-avatar"
                    chatRoom={chatRoom}
                    contact={contact}
                    hideVerifiedBadge="true"
                />
                <div className="dropdown-user-name" >
                    <div className="name">
                        <ContactAwareName overflow={true} contact={contact} />
                        <ContactPresence className="small" contact={contact} />
                    </div>
                    {contact && (
                        megaChat.FORCE_EMAIL_LOADING || (contact.c === 1 || contact.c === 2)
                    ) && <span className="email">{contact.m}</span>}
                </div>
            </div>
        );

        moreDropdowns.push(
            <ContactFingerprint key="fingerprint" contact={contact} />
        );

        if (dropdowns.length && contact.c !== 2) {
            moreDropdowns.push(dropdowns);
            moreDropdowns.push(
                <hr key="top-separator" />
            );
        }

        if (contact.u === u_handle) {
            moreDropdowns.push(
                <DropdownItem
                    key="view0"
                    icon="sprite-fm-mono icon-user-filled"
                    label={l[187] /* `My Account` */}
                    onClick={() => loadSubPage('fm/account')}
                />
            );
        }
        if (contact.c === 1) {
            const startAudioCall = () => {
                megaChat.createAndShowPrivateRoom(contact.u)
                    .then(room => {
                        room.setActive();
                        room.startAudioCall();
                    });
            };

            if (megaChat.currentlyOpenedChat && megaChat.currentlyOpenedChat === contact.u) {
                moreDropdowns.push(
                    <div
                        key="startAudioVideoCall"
                        data-simpletipposition='top'
                        className='simpletip'
                        data-simpletip={!megaChat.hasSupportForCalls ? l.call_not_suported : ''}>
                        <DropdownItem
                            disabled={!megaChat.hasSupportForCalls}
                            key="startCall"
                            className="sprite-fm-mono-before icon-arrow-right-before"
                            icon="sprite-fm-mono icon-phone"
                            submenu={megaChat.hasSupportForCalls}
                            label={l[19125]} /* `Start Call...` */
                        />
                        <div className="dropdown body submenu" key="dropdownGroup">
                            <div>
                                <DropdownItem
                                    key="startAudio"
                                    icon="sprite-fm-mono icon-phone"
                                    disabled={!megaChat.hasSupportForCalls}
                                    label={l[1565]} /* `Audio` */
                                    onClick={startAudioCall}
                                />
                            </div>
                            <div>
                                <DropdownItem
                                    key="startVideo"
                                    icon="sprite-fm-mono icon-video-call-filled"
                                    disabled={!megaChat.hasSupportForCalls}
                                    label={l[1566]} /* `Video` */
                                    onClick={() => {
                                        megaChat.createAndShowPrivateRoom(contact.u)
                                            .then(room => {
                                                room.setActive();
                                                room.startVideoCall();
                                            });
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                );
            }
            else {
                moreDropdowns.push(
                    <DropdownItem
                        key="startChat"
                        icon="sprite-fm-mono icon-chat"
                        label={l[5885] /* `Start conversation` */}
                        onClick={() => {
                            loadSubPage('fm/chat/p/' + contact.u);
                        }}
                    />
                );
            }

            moreDropdowns.push(
                <hr key="files-separator" />
            );

            moreDropdowns.push(
                <DropdownItem
                    key="send-files-item"
                    icon="sprite-fm-mono icon-send-files"
                    label={l[6834]} /* `Send files` */
                    disabled={mega.paywall}
                    onClick={() => {
                        megaChat.openChatAndSendFilesDialog(contact.u);
                    }}
                />
            );
            moreDropdowns.push(
                <DropdownItem
                    key="share-item"
                    icon="sprite-fm-mono icon-folder-outgoing-share"
                    label={l[6775]} /* `Share folders` */
                    onClick={() => {
                        openCopyShareDialog(contact.u);
                    }}
                />
            );
        }
        else if (!is_chatlink && !is_eplusplus && (!contact.c || (contact.c === 2 && contact.u !== u_handle))) {
            moreDropdowns.push(
                <DropdownItem
                    key="view2"
                    icon="sprite-fm-mono icon-add"
                    label={l[101] /* `Add Contact` */}
                    onClick={() => {
                        const isAnonymousUser = (!u_handle || u_type !== 3);
                        const ADD_CONTACT = 'addContact';

                        if (is_chatlink && isAnonymousUser) {
                            megaChat.loginOrRegisterBeforeJoining(undefined, undefined, undefined, true);
                            if (localStorage.getItem(ADD_CONTACT) === null) {
                                localStorage.setItem(
                                    ADD_CONTACT,
                                    JSON.stringify({ u: contact.u, unixTime: unixtime() })
                                );
                            }
                        }
                        else {
                            loadingDialog.show();
                            M.syncContactEmail(contact.u, true)
                                .then(email => {
                                    if (Object.values(M.opc || {}).some(cr => cr.m === email)) {
                                        closeDialog();
                                        msgDialog(
                                            'warningb', '', l[17545] /* `Invite already sent, waiting for response` */
                                        );
                                    }
                                    else {
                                        M.inviteContact(M.u[u_handle].m, email);
                                        // `Contact invited`
                                        const title = l[150];
                                        // `User has been invited and will appear in your contact list once accepted.`
                                        const msg = l[5898].replace('[X]', email);

                                        closeDialog();
                                        msgDialog('info', title, msg.replace('[X]', email));
                                    }
                                })
                                .catch(() => {
                                    const { chatRoom } = this.props;
                                    const { u: userHandle } = contact;

                                    if (chatRoom.call) {
                                        return mBroadcaster.sendMessage('meetings:ephemeralAdd', userHandle);
                                    }

                                    const name = M.getNameByHandle(userHandle);
                                    return msgDialog(
                                        'info',
                                        '',
                                        // `%1 is using an ephemeral session.`
                                        l.ephemeral_title
                                            ? l.ephemeral_title.replace('%1', name)
                                            : `${name} is using an ephemeral session.`,
                                        /* `Please add them to your contact list once they register their account.` */
                                        l.ephemeral_info
                                    );
                                })
                                .finally(() => loadingDialog.hide());
                        }
                    }}
                />
            );
        }

        // Don't show Set Nickname button if not logged in or clicking your own name
        if (u_attr && contact.u !== u_handle) {
            // Add a Set Nickname button for contacts and non-contacts (who are visible in a group chat)
            if (
                moreDropdowns.length > 0 &&
                !(moreDropdowns.length === 2 && moreDropdowns[1] && moreDropdowns[1].key === "fingerprint")
            ) {
                moreDropdowns.push(
                    <hr key="nicknames-separator" />
                );
            }
            moreDropdowns.push(
                <DropdownItem
                    key="set-nickname"
                    icon="sprite-fm-mono icon-rename"
                    label={
                        contact.nickname === ''
                            ? l.set_nickname_label /* `Set nickname` */
                            : l.edit_nickname_label /* `Edit nickname` */
                    }
                    onClick={() => nicknames.setNicknameDialog.init(contact.u)}
                />
            );
        }

        if (dropdownRemoveButton && dropdownRemoveButton.length) {
            moreDropdowns.push(
                <hr key="remove-separator" />
            );
            moreDropdowns.push(
                dropdownRemoveButton
            );
        }

        return moreDropdowns;
    }

    render() {
        let {
            label = '', className = '', contact, dropdownIconClasses = [], verticalOffset,
            dropdownDisabled, noLoading, noContextMenu,
        } = this.props;

        let dropdownPosition = "left top";
        let vertOffset = 0;
        let horizOffset = -30;

        if (!contact) {
            return null;
        }

        if (label) {
            className = `user-card-name ${className}${className.includes('message') ? '' : ' selectable-txt'}`;
            dropdownIconClasses = '';
            dropdownPosition = 'left bottom';
            vertOffset = 25;
            horizOffset = 0;
        }
        if (typeof verticalOffset !== 'undefined') {
            vertOffset = verticalOffset;
        }

        if (!contact.name && !contact.m && !noLoading && this.isLoadingContactInfo()) {
            label = <em className="contact-name-loading" />;
            className = `contact-button-loading ${className}`;
        }

        return (
            noContextMenu
                ? <div className="user-card-name light selectable-txt">{label}</div>
                : <Button
                    className={className}
                    icon={dropdownIconClasses}
                    disabled={dropdownDisabled}
                    label={label}>
                    <Dropdown
                        className="context contact-card-dropdown"
                        positionMy={dropdownPosition}
                        positionAt={dropdownPosition}
                        vertOffset={vertOffset}
                        horizOffset={horizOffset}
                        dropdownItemGenerator={this.dropdownItemGenerator}
                        noArrow={true}
                    />
                </Button>
        );
    }
}

export class ContactVerified extends MegaRenderMixin {
    static defaultProps = {
        'manualDataChangeTracking': true,
        'skipQueuedUpdatesOnResize': true
    }
    attachRerenderCallbacks() {
        this.addDataStructListenerForProperties(this.props.contact, [
            'fingerprint',
        ]);
    }
    render() {
        if (is_chatlink) {
            return null;
        }
        var contact = this.props.contact;
        if (!contact) {
            return null;
        }

        if (u_authring && u_authring.Ed25519) {
            var verifyState = u_authring.Ed25519[contact.u] || {};
            if (verifyState.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON) {
                return (
                    <div
                        className={`
                            user-card-verified
                            ${this.props.className || ''}
                        `}>
                    </div>
                );
            }
        }
        else if (!pubEd25519[contact.u]) {
            crypt.getPubEd25519(contact.u)
                .then(() => {
                    if (pubEd25519[contact.u]) {
                        this.safeForceUpdate();
                    }
                });
        }

        return null;
    }
}

export class ContactPresence extends MegaRenderMixin {
    domRef = React.createRef();

    static defaultProps = {
        manualDataChangeTracking: true,
        skipQueuedUpdatesOnResize: true
    };

    attachRerenderCallbacks() {
        this.addDataStructListenerForProperties(this.props.contact, ['presence']);
    }

    render() {
        const { contact, className } = this.props;

        if (!contact || !contact.c) {
            return null;
        }

        return (
            <div
                ref={this.domRef}
                className={`
                    user-card-presence
                    ${megaChat.userPresenceToCssClass(contact.presence)}
                    ${className || ''}
                `}
            />
        );
    }
}

export const LastActivity = compose(withUpdateObserver)(
    (() =>
        class LastActivity extends ContactAwareComponent {
            attachRerenderCallbacks() {
                this._attachRerenderCbContacts([
                    'ats',
                    'lastGreen',
                    'presence',
                ]);
            }

            shouldComponentUpdate() {
                return true;
            }

            render() {
                const { contact, showLastGreen } = this.props;

                if (!contact) {
                    return null;
                }

                const lastActivity = !contact.ats || contact.lastGreen > contact.ats ? contact.lastGreen : contact.ats;
                const SECONDS = Date.now() / 1000 - lastActivity;
                const FORTY_FIVE_DAYS = 3888000; // seconds
                const timeToLast = SECONDS > FORTY_FIVE_DAYS ? l[20673] : time2last(lastActivity, true);
                const hasActivityStatus = showLastGreen && contact.presence <= 2 && lastActivity;

                return (
                    <span>
                        {hasActivityStatus ?
                            (l[19994] || 'Last seen %s').replace('%s', timeToLast) :
                            M.onlineStatusClass(contact.presence)[0]
                        }
                    </span>
                );
            }
        })()
);

export class ContactAwareName extends ContactAwareComponent {
    render() {
        const { contact, emoji, overflow } = this.props;
        if (!contact || !M.u[contact.u || contact.h]) {
            return null;
        }
        const name = M.getNameByHandle(contact.u || contact.h);
        if (emoji || overflow) {
            const EmojiComponent = overflow ? OFlowEmoji : Emoji;
            return <EmojiComponent {...this.props}>{name}</EmojiComponent>;
        }
        return <span>{name}</span>;
    }
}

export class MembersAmount extends ContactAwareComponent {
    render() {
        const { chatRoom } = this.props;
        return <span>{mega.icu.format(l[20233], Object.keys(chatRoom.members).length)}</span>;
    }
}

export class ContactFingerprint extends MegaRenderMixin {
    domRef = React.createRef();

    static defaultProps = {
        'manualDataChangeTracking': true,
        'skipQueuedUpdatesOnResize': true
    };

    attachRerenderCallbacks() {
        this.addDataStructListenerForProperties(this.props.contact, [
            'fingerprint'
        ]);
    }

    render() {
        const { contact, className } = this.props;

        if (!contact || !contact.u || is_chatlink) {
            return null;
        }

        var infoBlocks = [];

        userFingerprint(contact.u, function(fingerprints) {
            fingerprints.forEach(function(v, k) {
                infoBlocks.push(
                    <span key={"fingerprint-" + k}>
                        {v}
                    </span>
                );
            });
        });

        var verifyButton = null;

        if (contact.c === 1 && u_authring && u_authring.Ed25519) {
            var verifyState = u_authring.Ed25519[contact.u] || {};
            if (
                typeof verifyState.method === "undefined" ||
                verifyState.method < authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON
            ) {
                verifyButton = <Button
                    className="dropdown-verify active"
                    label={l.verify_credentials}
                    icon="sprite-fm-mono icon-key"
                    onClick={() => {
                        closeDropdowns();
                        fingerprintDialog(contact.u);
                    }} />
            }
        }

        return (
            infoBlocks.length ?
                <div
                    ref={this.domRef}
                    className={`
                        dropdown-fingerprint
                        ${className || ''}
                    `}>
                    <div className="contact-fingerprint-title">
                        <span>{l[6872]}</span>
                    </div>
                    <div className="contact-fingerprint-txt selectable-txt">{infoBlocks}</div>
                    {verifyButton}
                </div> :
                null
        );
    }
}


export class Avatar extends ContactAwareComponent {
    static defaultProps = {
        'manualDataChangeTracking': true,
        'skipQueuedUpdatesOnResize': true
    }

    render() {
        var self = this;
        var contact = this.props.contact;

        if (!contact) {
            return null;
        }

        if (!contact.m && contact.email) {
            contact.m = contact.email;
        }

        var avatarMeta = useravatar.generateContactAvatarMeta(contact);

        var classes = (
            this.props.className ? this.props.className : ' avatar-wrapper small-rounded-avatar'
        ) + ' ' + contact.u + ' in-chat';

        classes += " chat-avatar";

        var displayedAvatar;


        var verifiedElement = null;

        if (!this.props.hideVerifiedBadge && !is_chatlink) {
            verifiedElement = <ContactVerified
                contact={this.props.contact}
                className={this.props.verifiedClassName} />;
        }

        var extraProps = {};
        if (this.props.simpletip) {
            classes += " simpletip";
            if (this.props.simpletip === true) {
                extraProps['data-simpletip'] = M.getNameByHandle(contact.h || contact.u) ||
                    megaChat.plugins.userHelper.SIMPLETIP_USER_LOADER;
            }
            else {
                extraProps['data-simpletip'] = this.props.simpletip;
            }
            if (this.props.simpletipWrapper) {
                extraProps['data-simpletipwrapper'] = this.props.simpletipWrapper;
            }
            if (this.props.simpletipOffset) {
                extraProps['data-simpletipoffset'] = this.props.simpletipOffset;
            }
            if (this.props.simpletipPosition) {
                extraProps['data-simpletipposition'] = this.props.simpletipPosition;
            }
            if (this.props.simpletipClass) {
                extraProps['data-simpletip-class'] = this.props.simpletipClass;
            }
        }

        if (avatarMeta.type === "image") {
            displayedAvatar = <div className={classes} style={this.props.style}
                    {...extraProps}
                    onClick={self.props.onClick ? (e) => {
                        closeDropdowns();
                        self.props.onClick(e);
                    } : self.onClick}>
                        {verifiedElement}
                        <img src={avatarMeta.avatar} style={this.props.imgStyles}/>
            </div>;
        }
        else {
            classes += " color" + avatarMeta.avatar.colorIndex;
            var isLoading = self.isLoadingContactInfo();
            if (isLoading) {
                classes += " default-bg";
            }

            displayedAvatar = <div className={classes} style={this.props.style}
                {...extraProps}
                onClick={self.props.onClick ? (e) => {
                    closeDropdowns();
                    self.props.onClick(e);
                } : self.onClick}>
                {verifiedElement}
                <span>
                    {isLoading ? "" : avatarMeta.avatar.letters}
                </span>
            </div>;

        }

        return displayedAvatar;
    }
}

export class ContactCard extends ContactAwareComponent {
    static defaultProps = {
        'dropdownButtonClasses': "tiny-button",
        'dropdownIconClasses': "tiny-icon icons-sprite grey-dots",
        'presenceClassName': '',
        'manualDataChangeTracking': true,
        'skipQueuedUpdatesOnResize': true
    }
    attachRerenderCallbacks() {
        this._attachRerenderCbContacts(['presence']);
    }
    specShouldComponentUpdate(nextProps, nextState) {
        var self = this;

        var foundKeys = Object.keys(self.props);
        if (foundKeys.indexOf('dropdowns') >= 0) {
            array.remove(foundKeys, 'dropdowns', true);
        }

        let shouldUpdate;
        if (foundKeys.length) {
            let k = foundKeys[0];
            shouldUpdate = shallowEqual(nextProps[k], self.props[k]);
        }

        if (!shouldUpdate) {
            // ^^ if false or undefined.
            shouldUpdate = shallowEqual(nextState, self.state);
        }

        if (!shouldUpdate && self.state.props.dropdowns && nextProps.state.dropdowns) {
            // ^^ if still false or undefined.
            if (self.state.props.dropdowns.map && nextProps.state.dropdowns.map) {
                var oldKeys = self.state.props.dropdowns.map(child => child.key);
                var newKeys = nextProps.state.dropdowns.map(child => child.key);
                if (!shallowEqual(oldKeys, newKeys)) {
                    shouldUpdate = true;
                }
            }
        }

        return shouldUpdate;
    }
    render() {

        var self = this;
        var contact = this.props.contact;

        if (!contact) {
            return null;
        }

        var pres = megaChat.userPresenceToCssClass(contact.presence);
        var username = (this.props.namePrefix ? this.props.namePrefix : "") +
            (M.getNameByHandle(contact.u) || contact.m);

        if (contact.u === u_handle) {
            username += " (" + escapeHTML(l[8885]) + ")";
        }

        var escapedUsername = <OFlowEmoji>{username}</OFlowEmoji>;
        var dropdowns = this.props.dropdowns ? this.props.dropdowns : [];
        var noContextMenu = this.props.noContextMenu ? this.props.noContextMenu : "";
        var noContextButton = this.props.noContextButton ? this.props.noContextButton : "";
        var dropdownRemoveButton = self.props.dropdownRemoveButton ? self.props.dropdownRemoveButton : [];
        var highlightSearchValue = self.props.highlightSearchValue ? self.props.highlightSearchValue : false;
        var emailTooltips = self.props.emailTooltips ? self.props.emailTooltips : false;
        var searchValue = self.props.searchValue ? self.props.searchValue : "";
        var usernameBlock;

        if (!noContextMenu) {
            usernameBlock = <ContactButton key="lnk" dropdowns={dropdowns}
                noContextMenu={noContextMenu}
                contact={contact}
                className="light"
                label={escapedUsername}
                chatRoom={this.props.chatRoom}
                dropdownRemoveButton={dropdownRemoveButton}
                verticalOffset={0}
            />;
        }
        else {
            if (highlightSearchValue && searchValue.length > 0) {
                var matches = [];
                var regex = new RegExp(RegExpEscape(searchValue), 'gi');
                var result;

                // eslint-disable-next-line no-cond-assign
                while (result = regex.exec(username)) {
                    matches.push({idx: result.index, str: result[0]});
                }

                if (matches.length > 0) {
                    escapedUsername =
                        <ParsedHTML>{megaChat.highlight(megaChat.html(username), matches, true)}</ParsedHTML>;
                }
            }
            if (emailTooltips) {
                usernameBlock = <div
                    className="user-card-name light simpletip selectable-txt"
                    data-simpletip={contact.m}
                    data-simpletipposition="top">{escapedUsername}</div>;
            }
            else {
                usernameBlock = <div className="user-card-name light selectable-txt">{escapedUsername}</div>;
            }
        }

        var userCard = null;
        var className = this.props.className || "";
        if (className.indexOf("short") >= 0) {
            userCard = <div className="user-card-data">
                {usernameBlock}
                <div className="user-card-status">
                    {this.props.isInCall ?
                        <div className="audio-call">
                            <i className="sprite-fm-mono icon-phone" />
                        </div> :
                        null}
                    <LastActivity contact={contact} showLastGreen={this.props.showLastGreen} />
                </div>
            </div>;
        }
        else {
            userCard = <div className="user-card-data">
                {usernameBlock}
                <ContactPresence contact={contact} className={this.props.presenceClassName}/>
                {this.props.isInCall ?
                    <div className="audio-call">
                        <i className="sprite-fm-mono icon-phone" />
                    </div> :
                    null}
                <div className="user-card-email selectable-txt">{contact.m}</div>
            </div>
        }

        var selectionTick = null;
        if (this.props.selectable) {
            selectionTick =
                <div className="user-card-tick-wrap">
                    <i className="sprite-fm-mono icon-check" />
                </div>;
        }

        return <div
            className={
                "contacts-info body " +
                (pres === "offline" ? "offline" : "") +
                (className ? " " + className : "")
            }
            onClick={(e) => {
                if (self.props.onClick) {
                    self.props.onClick(contact, e);
                }
            }}
            onDoubleClick={(e) => {
                if (self.props.onDoubleClick) {
                    self.props.onDoubleClick(contact, e);
                }
            }}
            style={self.props.style}>
            <Avatar contact={contact} className="avatar-wrapper small-rounded-avatar"
                chatRoom={this.props.chatRoom} />

            {
                is_chatlink || noContextButton ? null :
                <ContactButton
                    key="button"
                    dropdowns={dropdowns}
                    dropdownIconClasses={self.props.dropdownIconClasses ? self.props.dropdownIconClasses : ""}
                    disabled={self.props.dropdownDisabled}
                    noContextMenu={noContextMenu}
                    contact={contact}
                    className={self.props.dropdownButtonClasses}
                    dropdownRemoveButton={dropdownRemoveButton}
                    noLoading={self.props.noLoading}
                    chatRoom={self.props.chatRoom}
                    verticalOffset={0}
                />
            }
            {selectionTick}
            {userCard}
        </div>;
    }
}

export class ContactItem extends ContactAwareComponent {
    static defaultProps = {
        'manualDataChangeTracking': true,
        'skipQueuedUpdatesOnResize': true
    }

    render() {
        var self = this;
        var contact = this.props.contact;

        if (!contact) {
            return null;
        }

        var username = this.props.namePrefix ? this.props.namePrefix : "" + M.getNameByHandle(contact.u);

        return <div className="selected-contact-card short">
            {/* eslint-disable-next-line sonarjs/no-identical-functions */}
            <div className="remove-contact-bttn"  onClick={(e) => {
                if (self.props.onClick) {
                    self.props.onClick(contact, e);
                }
            }}>
                <i className="tiny-icon small-cross"></i>
            </div>
            <Avatar contact={contact} className="avatar-wrapper small-rounded-avatar" hideVerifiedBadge={true}
                chatRoom={this.props.chatRoom} />
            <div
                className="user-card-data simpletip"
                data-simpletip={username || megaChat.plugins.userHelper.SIMPLETIP_USER_LOADER}
                data-simpletipposition="top">
                <ContactButton
                    noContextMenu={this.props.noContextMenu}
                    contact={contact}
                    className="light"
                    label={<Emoji>{username}</Emoji>}
                    chatRoom={this.props.chatRoom} />
            </div>
        </div>;
    }
}

export class ContactPickerWidget extends MegaRenderMixin {
    contactLinkListener = null;
    domRef = React.createRef();

    static defaultProps = {
        multipleSelectedButtonLabel: false,
        singleSelectedButtonLabel: false,
        nothingSelectedButtonLabel: false,
        allowEmpty: false,
        disableFrequents: false,
        notSearchInEmails: false,
        autoFocusSearchField: true,
        selectCleanSearchRes: true,
        disableDoubleClick: false,
        newEmptySearchResult: false,
        newNoContact: false,
        emailTooltips: false
    };

    state = {
        searchValue: '',
        selected: this.props.selected || [],
        publicLink: M.account && M.account.contactLink || undefined
    };

    onSearchChange = ev => {
        this.setState({ searchValue: ev.target.value });
    };

    renderParticipantsList = () => {
        const { contacts, emailTooltips, onSelected } = this.props;
        const { selected } = this.state;
        const $$list =
            contacts.map(handle => {
                const added = selected.includes(handle);
                return (
                    <ContactCard
                        key={handle}
                        className={`
                            contacts-search short
                            ${added ? 'selected' : ''}
                        `}
                        contact={M.u[handle]}
                        selectable={true}
                        emailTooltips={emailTooltips}
                        noContextButton={true}
                        noContextMenu={true}
                        onClick={() => {
                            this.setState(
                                { selected: added ? selected.filter(h => h !== handle) : [...selected, handle] },
                                () => onSelected(this.state.selected)
                            );
                        }}
                    />
                );
            });

        return (
            <PerfectScrollbar
                className="contacts-search-scroll"
                selected={selected}
                contacts={contacts}>
                <div className="contacts-search-subsection">
                    <div className="contacts-list-header">
                        {megaChat.activeCall ?
                            l.call_participants /* `Participants in the call` */ :
                            l[16217] /* `Participants` */}
                    </div>
                    <div className="contacts-search-list">{$$list}</div>
                </div>
            </PerfectScrollbar>
        );
    };

    renderInviteWarning() {
        const { chatRoom } = this.props;
        const { activeCall } = megaChat;
        // Check if the active call is in the current chat and if it exceeds the free plan limitation.
        if (
            !activeCall
            || activeCall.chatRoom.chatId !== chatRoom.chatId
            || !activeCall.sfuClient.callLimits
            || !activeCall.sfuClient.callLimits.usr
            || chatRoom.getCallParticipants().length < activeCall.sfuClient.callLimits.usr
        ) {
            return null;
        }

        return <div className="picker-user-limit-banner">
            {
                activeCall.organiser === u_handle ?
                    reactStringWrap(l.invite_limit_banner_organiser, '[A]', Link, {
                        onClick() {
                            window.open(`${getBaseUrl()}/pro`, '_blank', 'noopener,noreferrer');
                            eventlog(500263);
                        }
                    }) :
                    l.invite_limit_banner_host
            }
        </div>;
    }

    componentDidMount() {
        super.componentDidMount();
        setContactLink(this.domRef && this.domRef.current);
        this.contactLinkListener = mBroadcaster.addListener('contact:setContactLink', publicLink =>
            this.state.publicLink ? null : this.setState({ publicLink })
        );
    }

    componentDidUpdate() {

        var self = this;
        if (self.scrollToLastSelected && self.psSelected) {
            // set the flag back to false, so on next updates we won't scroll to the last item again.
            self.scrollToLastSelected = false;
            self.psSelected.scrollToPercentX(100, false);
        }
        if (self.searchContactsScroll) {
            self.searchContactsScroll.reinitialise();
        }
    }

    UNSAFE_componentWillMount() {
        if (super.UNSAFE_componentWillMount) {
            super.UNSAFE_componentWillMount();
        }

        var self = this;

        if (self.props.multiple) {
            var KEY_ENTER = 13;

            $(document.body).rebind('keypress.contactPicker' + self.getUniqueId(), function(e) {
                var keyCode = e.which || e.keyCode;
                if (keyCode === KEY_ENTER) {
                    if (self.state.selected) {
                        e.preventDefault();
                        e.stopPropagation();

                        closeDropdowns();

                        if (self.props.onSelectDone) {
                            self.props.onSelectDone(self.state.selected);
                        }
                    }
                }
            });
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        var self = this;

        delete self._foundFrequents;

        if (self.props.multiple) {
            $(document.body).off('keypress.contactPicker' + self.getUniqueId());
        }

        if (this.contactLinkListener) {
            mBroadcaster.removeListener(this.contactLinkListener);
        }
    }

    _eventuallyAddContact(v, contacts, selectableContacts, forced) {
        var self = this;
        if (!forced && (v.c !== 1 || v.u === u_handle)) {
            return false;
        }
        if (self.props.exclude && self.props.exclude.indexOf(v.u) > -1) {
            // continue;
            return false;
        }
        var isDisabled = false;
        if (!self.wasMissingKeysForContacts) {
            self.wasMissingKeysForContacts = {};
        }
        if (!self.wasMissingKeysForContacts[v.u] && (!pubCu25519[v.u] || !pubEd25519[v.u])) {
            // we don't want to preload keys each time...e.g. we want to only load them when needed, so ensure they
            // are loaded here
            self.wasMissingKeysForContacts[v.u] = true;

            ChatdIntegration._ensureKeysAreLoaded(undefined, [v.u])
                .always(function() {
                    if (self.isMounted()) {
                        self.safeForceUpdate();
                    }
                });
            isDisabled = true;
            return true;
        }
        else if (self.wasMissingKeysForContacts[v.u] && (!pubCu25519[v.u] || !pubEd25519[v.u])) {
            // keys not loaded, don't allow starting of new chats/any interaction with that user yet
            return false;
        }

        if (self.state.searchValue && self.state.searchValue.length > 0) {
            const norm = (s) => ChatSearch._normalize_str(String(s || '').toLowerCase());
            const sv = norm(this.state.searchValue);

            const skip =
                !norm(v.name).includes(sv) &&
                !norm(v.nickname).includes(sv) &&
                !norm(v.fullname).includes(sv) &&
                !norm(M.getNameByHandle(v.u)).includes(sv) &&
                (this.props.notSearchInEmails || !norm(v.m).includes(sv));

            // DON'T add to the contacts list if the contact's name or email does not match the search value
            if (skip) {
                return false;
            }
        }

        var selectedClass = "";
        if (self.state.selected && self.state.selected.indexOf(v.u) !== -1) {
            selectedClass = "selected";
        }

        contacts.push(
            <ContactCard
                disabled={isDisabled}
                contact={v}
                chatRoom={false}
                className={"contacts-search short " + selectedClass + (isDisabled ? " disabled" : "")}
                noContextButton="true"
                selectable={selectableContacts}
                onClick={self.props.readOnly ? () => {} : (contact) => {
                    if (isDisabled) {
                        return false;
                    }
                    var contactHash = contact.u;

                    // differentiate between a click and a double click.
                    // disable the doulbe click for add contacts to share dialog
                    if (
                        (contactHash === self.lastClicked && (new Date() - self.clickTime) < 500
                            && !self.props.disableDoubleClick) || !self.props.multiple
                    ) {
                        // is a double click
                        if (self.props.onSelected) {
                            self.props.onSelected([contactHash]);
                        }
                        self.props.onSelectDone([contactHash]);
                        closeDropdowns();
                        return;
                    }
                    else {
                        var selected = clone(self.state.selected || []);

                        // is a single click
                        if (selected.indexOf(contactHash) === -1) {
                            selected.push(contactHash);
                            // only set the scrollToLastSelected if a contact was added,
                            // so that the user can scroll left/right and remove contacts
                            // form the list using the X buttons in the UI.
                            self.scrollToLastSelected = true;
                            if (self.props.onSelected) {
                                self.props.onSelected(selected);
                            }
                        }
                        else {
                            if (selected.indexOf(contactHash) >= 0) {
                                array.remove(selected, contactHash);
                            }
                            if (self.props.onSelected) {
                                self.props.onSelected(selected);
                            }
                        }
                        self.setState({'selected': selected});
                        if (self.props.selectCleanSearchRes) {
                            self.setState({'searchValue': ''});
                        }
                        if (self.props.autoFocusSearchField) {
                            self.contactSearchField?.focus();
                        }
                    }
                    self.clickTime = new Date();
                    self.lastClicked = contactHash;
                }}
                noContextMenu={true}
                searchValue={self.state.searchValue}
                highlightSearchValue={self.props.highlightSearchValue}
                emailTooltips={self.props.emailTooltips}
                key={v.u}
            />
        );
        if (typeof this.props.onEventuallyUpdated === 'function') {
            this.props.onEventuallyUpdated();
        }
        return true;
    }

    render() {
        var self = this;

        var contacts = [];
        var frequentContacts = [];
        var extraClasses = "";

        var contactsSelected = [];

        var multipleContacts = null;
        var selectableContacts = false;
        var selectFooter = null;
        var selectedContacts = false;
        var isSearching = !!self.state.searchValue;


        var onAddContact = (e) => {

            e.preventDefault();
            e.stopPropagation();

            contactAddDialog();
            if (this.props.onClose) {
                this.props.onClose();
            }
        };

        if (self.props.readOnly) {
            var sel = self.state.selected || [];
            for (var i = 0; i < sel.length; i++) {
                var v = sel[i];
                contactsSelected.push(<ContactItem contact={M.u[v]} key={v} chatRoom={self.props.chatRoom} />);
            }
        }
        else if (self.props.multiple) {
            selectableContacts = true;

            var onSelectDoneCb = (e) => {

                e.preventDefault();
                e.stopPropagation();

                closeDropdowns();

                if (self.props.onSelectDone) {
                    self.props.onSelectDone(self.state.selected);
                }
            };
            var onContactSelectDoneCb = (contact) => {

                var contactHash = contact.u;

                // differentiate between a click and a double click.
                if (contactHash === self.lastClicked && (new Date() - self.clickTime) < 500) {
                    // is a double click
                    if (self.props.onSelected) {
                        self.props.onSelected([contactHash]);
                    }
                    self.props.onSelectDone([contactHash]);
                    return;
                }
                else {
                    var selected = clone(self.state.selected || []);

                    // is a single click
                    if (selected.indexOf(contactHash) === -1) {
                        selected.push(contactHash);
                        // only set the scrollToLastSelected if a contact was added, so that the user can scroll
                        // left/right and remove contacts form the list using the X buttons in the UI
                        self.scrollToLastSelected = true;

                        if (self.props.onSelected) {
                            self.props.onSelected(selected);
                        }
                    }
                    else {
                        if (selected.indexOf(contactHash) >= 0) {
                            array.remove(selected, contactHash);
                        }
                        if (self.props.onSelected) {
                            self.props.onSelected(selected);
                        }
                    }
                    self.setState({'selected': selected});
                    if (self.props.selectCleanSearchRes) {
                        self.setState({'searchValue': ''});
                    }
                    if (self.props.autoFocusSearchField) {
                        self.contactSearchField?.focus();
                    }
                }
                self.clickTime = new Date();
                self.lastClicked = contactHash;
            };
            var selectedWidthSize = self.props.selectedWidthSize || 54;
            var selectedWidth = self.state.selected.length * selectedWidthSize;

            if (!self.state.selected || self.state.selected.length === 0) {
                selectedContacts = false;
                var emptySelectionMsg = self.props.emptySelectionMsg || l[8889];

                multipleContacts =
                    <div className="horizontal-contacts-list">
                        <div className="contacts-list-empty-txt">
                            {
                                self.props.nothingSelectedButtonLabel ?
                                    self.props.nothingSelectedButtonLabel
                                    : emptySelectionMsg
                            }
                        </div>
                    </div>;
            }
            else {
                selectedContacts = true;

                onContactSelectDoneCb = onContactSelectDoneCb.bind(self);
                var sel2 = self.state.selected || [];
                for (var i2 = 0; i2 < sel2.length; i2++) {
                    var v2 = sel2[i2];
                    contactsSelected.push(
                        <ContactItem
                            key={v2}
                            chatRoom={self.props.chatRoom || false}
                            contact={M.u[v2]}
                            noContextMenu={true}
                            onClick={onContactSelectDoneCb}
                        />
                    );
                }

                multipleContacts =
                    <div className="horizontal-contacts-list">
                        <PerfectScrollbar className="perfectScrollbarContainer selected-contact-block horizontal-only"
                            selected={this.state.selected}
                            ref={function(psSelected) {
                                self.psSelected = psSelected;
                            }}>
                            <div className="select-contact-centre" style={{width: selectedWidth}}>
                                {contactsSelected}
                            </div>
                        </PerfectScrollbar>
                    </div>;
            }

            if (self.props.selectFooter) {

                selectFooter = <footer>
                    <button className="mega-button" onClick={onAddContact.bind(self)}>
                        <span>{l[71]}</span>
                    </button>
                    <div className="footer-spacing"></div>
                    <button className={`mega-button ${selectedContacts ? '' : 'disabled'}`}
                        onClick = {function(e) {
                            if (self.state.selected.length > 0) {
                                onSelectDoneCb(e);
                            }
                        }}>
                        <span>
                            {this.props.multipleSelectedButtonLabel ? this.props.multipleSelectedButtonLabel : l[8890]}
                        </span>
                    </button>
                </footer>;
            }
        }

        var alreadyAdded = {};
        var hideFrequents = !self.props.readOnly && !self.state.searchValue && frequentContacts.length > 0;
        var frequentsLoading = false;

        if (this.props.readOnly || this.props.disableFrequents) {
            hideFrequents = true;
            this._foundFrequents = [];
        }
        else if (!self._foundFrequents) {
            frequentsLoading = true;
            this._foundFrequents = [];

            megaChat.getFrequentContacts()
                .then((res) => {
                    this._foundFrequents = res.slice(Math.max(res.length - 30, 0), res.length).reverse();
                })
                .catch(dump)
                .finally(() => {
                    if (this.isMounted()) {
                        this.safeForceUpdate();
                    }
                });
        }

        for (let i = this._foundFrequents.length, total = 0; total < MAX_FREQUENTS && i--;) {
            const v = this._foundFrequents[i];

            if (v.userId in M.u && this._eventuallyAddContact(M.u[v.userId], frequentContacts, selectableContacts)) {
                alreadyAdded[v.userId] = 1;
                total++;
            }
        }

        self.props.contacts.forEach(function(v, k) {
            !alreadyAdded[v.h] && self._eventuallyAddContact(v, contacts, selectableContacts);
        });
        var sortFn = M.getSortByNameFn2(1);
        contacts.sort(function(a, b) {
            return sortFn(a.props.contact, b.props.contact);
        });

        if (Object.keys(alreadyAdded).length === 0) {
            hideFrequents = true;
        }
        var innerDivStyles = {};

        if (this.props.showMeAsSelected) {
            self._eventuallyAddContact(M.u[u_handle], contacts, selectableContacts, true);
        }
        var noOtherContacts = false;
        if (contacts.length === 0) {
            noOtherContacts = true;
            var noContactsMsg = "";
            if (M.u.length < 2) {
                noContactsMsg = l[8877];
            }
            else {
                noContactsMsg = l[8878];
            }

            if (hideFrequents) {
                contacts = <em>{noContactsMsg}</em>;
            }
        }

        var haveContacts = isSearching || frequentContacts.length !== 0 || !noOtherContacts;

        var contactsList;
        if (haveContacts) {
            if (frequentContacts.length === 0 && noOtherContacts) {
                if (self.props.newEmptySearchResult) {
                    contactsList = <div
                        className="chat-contactspicker-no-contacts flex flex-column flex-center searching mt-2">
                        <div className="section-icon sprite-fm-mono icon-contacts"></div>
                        <div className="fm-empty-cloud-txt small">{l[8674]}</div>
                    </div>;
                }
                else {
                    contactsList = <div className="chat-contactspicker-no-contacts flex flex-column mt-2">
                        <div className="contacts-list-header">
                            {l[165]}
                        </div>
                        <div className="flex flex-1 flex-column flex-center">
                            <div className="section-icon sprite-fm-mono icon-contacts"></div>
                            <div className="fm-empty-cloud-txt small">{l[784]}</div>
                            <div className="fm-empty-description small">{l[19115]}</div>
                        </div>
                    </div>;
                }
            }
            else {
                contactsList =
                    <PerfectScrollbar
                        ref={ref => {
                            self.searchContactsScroll = ref;
                        }}
                        className="contacts-search-scroll"
                        selected={this.state.selected}
                        changedHashProp={this.props.changedHashProp}
                        contacts={contacts}
                        frequentContacts={frequentContacts}
                        searchValue={this.state.searchValue}>
                        <>
                            <div
                                className="contacts-search-subsection"
                                style={{ display: hideFrequents ? 'none' : '' }}>
                                <div className="contacts-list-header">{l[20141] /* `Recents` */}</div>
                                {frequentsLoading ?
                                    <div className="loading-spinner">...</div> :
                                    <div
                                        className="contacts-search-list"
                                        style={innerDivStyles}>
                                        {frequentContacts}
                                    </div>
                                }
                            </div>
                            {contacts.length > 0 ?
                                <div className="contacts-search-subsection">
                                    <div className="contacts-list-header">
                                        {frequentContacts && frequentContacts.length === 0 ?
                                            /* `Participants` || `Contacts` */
                                            this.props.readOnly ? l[16217] : l[165] :
                                            l[165] /* `Contacts` */
                                        }
                                    </div>
                                    <div
                                        className="contacts-search-list"
                                        style={innerDivStyles}>
                                        {contacts}
                                    </div>
                                </div> :
                                undefined
                            }
                        </>
                    </PerfectScrollbar>;
            }
        }
        else if (self.props.newNoContact) {
            multipleContacts = "";
            contactsList = <div className="chat-contactspicker-no-contacts flex flex-column flex-center mt-2">
                <div className="section-icon sprite-fm-mono icon-contacts"></div>
                <div className="fm-empty-cloud-txt small">{l[784]}</div>
                <div className="fm-empty-description small">{l[19115]}</div>
            </div>;

            extraClasses += " no-contacts";
        }
        else {
            contactsList = <div className="chat-contactspicker-no-contacts flex flex-column flex-center mt-16">
                <div className="section-icon sprite-fm-mono icon-contacts"></div>
                <div className="fm-empty-cloud-txt small">{l[784]}</div>
                <div className="fm-empty-description small">{l[19115]}</div>
                <button className="mega-button positive large fm-empty-button" onClick={function() {
                    contactAddDialog();
                    if (self.props.onClose) {
                        self.props.onClose();
                    }
                }}>
                    <span>{l[101]}</span>
                </button>
                <div
                    className={`
                        ${this.state.publicLink ? '' : 'loading'}
                        empty-share-public
                    `}>
                    <i className="sprite-fm-mono icon-link-circle" />
                    <ParsedHTML>{l[19111]}</ParsedHTML>
                </div>
            </div>;

            extraClasses += " no-contacts";
        }

        const totalContactsNum = contacts.length + frequentContacts.length;
        const searchPlaceholderMsg = mega.icu.format(l.search_contact_placeholder, totalContactsNum);
        return (
            <div
                ref={this.domRef}
                className={`
                    ${this.props.className || ''}
                    ${extraClasses}
                `}>
                {this.props.topButtons && (
                    <div className="contacts-search-buttons">
                        {this.props.topButtons.map(button => {
                            const { key, icon, className, title, onClick } = button;
                            return (
                                <div
                                    key={key}
                                    className="button-wrapper"
                                    onClick={e => {
                                        closeDropdowns();
                                        onClick(e);
                                    }}>
                                    <Button
                                        className={`
                                            ${className || ''}
                                            ${key === 'newChatLink' ? 'branded-blue' : ''}
                                            mega-button
                                            round
                                            positive
                                        `}
                                        icon={icon}
                                    />
                                    <span className="button-title">{title}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
                {multipleContacts}
                {!this.props.readOnly && haveContacts && !this.props.hideSearch && (
                    <>
                        <div
                            className={`
                                contacts-search-header
                                ${this.props.headerClasses}
                            `}>
                            <i className="sprite-fm-mono icon-preview-reveal"/>
                            <input
                                autoFocus
                                type="search"
                                placeholder={searchPlaceholderMsg}
                                ref={nodeRef => {
                                    this.contactSearchField = nodeRef;
                                }}
                                onChange={this.onSearchChange}
                                value={this.state.searchValue}
                            />
                            <div
                                className={`
                                    search-result-clear
                                    ${this.state.searchValue && this.state.searchValue.length > 0 ? '' : 'hidden'}
                                `}
                                onClick={() => {
                                    this.setState({ searchValue: '' }, () =>
                                        this.contactSearchField?.focus()
                                    );
                                }}>
                                <i className="sprite-fm-mono icon-close-component"/>
                            </div>
                        </div>
                    </>
                )}
                {this.props.inviteWarningLabel && this.props.chatRoom && this.renderInviteWarning()}
                {!this.props.readOnly && haveContacts && !this.props.hideSearch &&
                    <div className="contacts-search-header-separator"/>
                }
                {this.props.participantsList ? this.renderParticipantsList() : contactsList}
                {selectFooter}
                {ContactsPanel.hasContacts() && this.props.showAddContact && (
                    <div className="contacts-search-bottom">
                        <Button
                            className="mega-button action positive"
                            icon="sprite-fm-mono icon-add-circle"
                            label={l[71] /* `Add contact` */}
                            onClick={() => {
                                contactAddDialog();
                                closeDropdowns();
                                this.props.onAddContact?.();
                            }}
                        />
                    </div>
                )}
            </div>
        );
    }
}

export const ContactPickerDialog = ({
    active,
    allowEmpty,
    className,
    exclude,
    megaChat,
    multiple,
    multipleSelectedButtonLabel,
    name,
    nothingSelectedButtonLabel,
    selectFooter,
    singleSelectedButtonLabel,
    inviteWarningLabel,
    chatRoom,
    onClose,
    onSelectDone,
}) => {
    return (
        <ModalDialogs.ModalDialog
            name={name}
            className={`
                ${className}
                contact-picker-dialog contacts-search
            `}
            onClose={onClose}>
            <ContactPickerWidget
                active={active}
                allowEmpty={allowEmpty}
                className="popup contacts-search small-footer"
                contacts={M.u}
                exclude={exclude}
                megaChat={megaChat}
                multiple={multiple}
                multipleSelectedButtonLabel={multipleSelectedButtonLabel}
                nothingSelectedButtonLabel={nothingSelectedButtonLabel}
                selectFooter={selectFooter}
                singleSelectedButtonLabel={singleSelectedButtonLabel}
                inviteWarningLabel={inviteWarningLabel}
                chatRoom={chatRoom}
                onClose={onClose}
                onSelectDone={onSelectDone}
            />
        </ModalDialogs.ModalDialog>
    );
};
