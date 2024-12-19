import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import ModalDialogsUI from '../../../ui/modalDialogs.jsx';
import Button from './button.jsx';
import ModeSwitch from './modeSwitch.jsx';
import { Emoji } from '../../../ui/utils.jsx';
import { filterAndSplitSources, PAGINATION } from './stream.jsx';
import { MODE } from './call.jsx';

export default class StreamHead extends MegaRenderMixin {
    delayProcID = null;

    static NAMESPACE = 'stream-head';
    static EVENTS = {
        FULLSCREEN: 'fullscreenchange',
        SIMPLETIP: new Event('simpletipClose'),
        CLICK_DIALOG: 'click'
    };

    domRef = React.createRef();
    durationRef = React.createRef();
    dialogRef = React.createRef();
    topicRef = React.createRef();
    interval = undefined;

    state = {
        dialog: false,
        duration: undefined,
        banner: false,
        modeSwitch: false,
    };

    get fullscreen() {
        return document.fullscreenElement;
    }

    get duration() {
        return (Date.now() - this.props.call.ts) / 1000;
    }

    get durationString() {
        return this.duration ? secondsToTimeShort(this.duration) : '--:--:--';
    }

    /**
     * updateDurationDOM
     * @description Sets and updates the call duration string in the UI.
     * @returns {void}
     */

    updateDurationDOM = () => {
        if (this.durationRef) {
            this.durationRef.current.innerText = this.durationString;
        }
    };

    /**
     * closeTooltips
     * @description Helper that is invoked when the call enters fullscreen mode -- closes all tooltips that are
     * currently rendered across the UI.
     * @returns {void}
     */

    closeTooltips = () => {
        for (const node of this.domRef.current.querySelectorAll('.simpletip')) {
            node.dispatchEvent(StreamHead.EVENTS.SIMPLETIP);
        }
    };

    /**
     * toggleFullscreen
     * @description Toggles fullscreen.
     * @returns {Promise<void>}
     */

    toggleFullscreen = () => this.fullscreen ? document.exitFullscreen() : document.documentElement.requestFullscreen();

    /**
     * toggleBanner
     * @description Toggles the information banner that is displayed after copying the meeting link --
     * `N link was copied to the clipboard`.
     * @param {function} [callback] optional callback function to invoke after toggling the banner state
     */

    toggleBanner = callback => this.setState(state => ({ banner: !state.banner }), () => callback && callback());

    /**
     * handleDialogClose
     * @description Handles the closing of the meeting information dialog.
     * @param target
     * @returns {boolean|void}
     */

    handleDialogClose = ({ target }) => {
        if (this.state.dialog) {
            const { topicRef, dialogRef, delayProcID } = this;
            const topicElement = topicRef && topicRef.current;
            const targetDialog = dialogRef && dialogRef.current && dialogRef.current;
            const dialogElement = targetDialog.domRef?.current;

            if (topicElement.contains(target)) {
                return;
            }

            return (
                (target.classList.contains('icon-dialog-close') || !dialogElement.contains(target)) &&
                this.setState({ dialog: false }, () => delayProcID && delay.cancel(delayProcID))
            );
        }
    };

    /**
     * getModerators
     * @description Retrieves the room moderators and returns singular/plural string that lists the moderator names.
     * @returns {string} formatted string listing the moderator names
     */

    getModerators = () => {
        const members = this.props.chatRoom?.members;

        if (members) {
            const moderators = [];
            for (const [handle, role] of Object.entries(members)) {
                if (role === ChatRoom.MembersSet.PRIVILEGE_STATE.OPERATOR) {
                    moderators.push(M.getNameByHandle(handle));
                }
            }

            return mega.utils.trans.listToString(moderators, mega.icu.format(l.meeting_moderators, moderators.length));
        }
    };

    /**
     * Dialog
     * @description The call information dialog -- contains list of the call moderators, incl.
     * link for the current call.
     * @returns {JSX.Element}
     */

    Dialog = () => {
        const link = `${getBaseUrl()}/${this.props.chatRoom.publicLink}`;
        const mods = this.getModerators();
        return (
            <ModalDialogsUI.ModalDialog
                ref={this.dialogRef}
                {...this.state}
                mods={mods}
                name="meeting-info-dialog"
                title={l[18132] /* `Information` */}
                className="group-chat-link dialog-template-main theme-dark-forced in-call-info"
                hideOverlay={true}>
                <section className="content">
                    <div className="content-block">
                        <Emoji className="info">{mods}</Emoji>
                        <div className="info">{l.copy_and_share /* `Copy this link to send your invite` */}</div>
                        <div className="link-input-container">
                            <div className="mega-input with-icon box-style">
                                <i className="sprite-fm-mono icon-link" />
                                <input
                                    type="text"
                                    className="megaInputs"
                                    readOnly={true}
                                    value={link}
                                />
                            </div>
                            <Button
                                className="mega-button positive copy-to-clipboard"
                                onClick={() => {
                                    if (copyToClipboard(link)) {
                                        this.toggleBanner(() => {
                                            this.delayProcID =
                                                delay(`${StreamHead.NAMESPACE}-banner`, this.toggleBanner, 10000);
                                        });
                                    }
                                }}>
                                <span>{l[63] /* `Copy` */}</span>
                            </Button>
                        </div>
                        {this.state.banner && (
                            <div className="banner-copy-success">
                                {l[7654] /* `1 link was copied to the clipboard` */}
                            </div>
                        )}
                    </div>
                </section>
                <footer>
                    <div className="footer-container" />
                </footer>
            </ModalDialogsUI.ModalDialog>
        );
    };

    Pagination = () => {
        const { mode, peers, page, streamsPerPage, floatDetached, chunksLength, call, onMovePage } = this.props;
        if (mode !== MODE.THUMBNAIL || !peers) {
            return null;
        }
        const { screen, video, rest } = filterAndSplitSources(peers, call);

        if (screen.length + video.length + rest.length > (floatDetached ? streamsPerPage + 1 : streamsPerPage)) {
            return (
                <div className={`${StreamHead.NAMESPACE}-pagination`}>
                    <Button
                        className={`
                            carousel-button-prev
                            theme-dark-forced
                            ${page !== 0 ? '' : 'disabled'}
                        `}
                        icon="sprite-fm-mono icon-arrow-left"
                        onClick={() => page !== 0 && onMovePage(PAGINATION.PREV)}
                    />
                    <div>{page + 1}/{chunksLength}</div>
                    <Button
                        className={`
                            carousel-button-next
                            theme-dark-forced
                            ${page < chunksLength - 1 ? '' : 'disabled'}
                        `}
                        icon="sprite-fm-mono icon-arrow-right"
                        onClick={() => page < chunksLength - 1 && onMovePage(PAGINATION.NEXT)}
                    />
                </div>
            );
        }

        return null;
    };

    componentWillUnmount() {
        super.componentWillUnmount();
        clearInterval(this.durationInterval);
        document.removeEventListener(StreamHead.EVENTS.FULLSCREEN, this.closeTooltips);
        document.removeEventListener(StreamHead.EVENTS.CLICK_DIALOG, this.handleDialogClose);
    }

    componentDidMount() {
        super.componentDidMount();
        this.durationInterval = setInterval(this.updateDurationDOM, 1000);
        document.addEventListener(StreamHead.EVENTS.FULLSCREEN, this.closeTooltips);
        document.addEventListener(StreamHead.EVENTS.CLICK_DIALOG, this.handleDialogClose);
    }

    render() {
        const { NAMESPACE } = StreamHead;
        const {
            mode,
            streamsPerPage,
            chatRoom,
            onStreamsPerPageChange,
            onCallMinimize,
            onModeChange,
            setActiveElement
        } = this.props;
        const { dialog } = this.state;
        const SIMPLETIP = { position: 'bottom', offset: 5, className: 'theme-dark-forced' };

        //
        // `StreamHead`
        // -------------------------------------------------------------------------

        return (
            <div
                ref={this.domRef}
                className={`${NAMESPACE}`}>
                {dialog && <this.Dialog />}
                <div className={`${NAMESPACE}-content theme-dark-forced`}>
                    <div className={`${NAMESPACE}-info`}>
                        <div
                            ref={this.durationRef}
                            className="stream-duration">
                            {this.durationString}
                        </div>
                        <div
                            ref={this.topicRef}
                            className={`
                                stream-topic
                                ${chatRoom.isMeeting && chatRoom.publicLink ? 'has-meeting-link' : ''}
                            `}
                            onClick={() =>
                                chatRoom.isMeeting &&
                                chatRoom.publicLink &&
                                this.setState({ dialog: !dialog, banner: false }, () =>
                                    setActiveElement(this.state.dialog)
                                )
                            }>
                            <Emoji>{chatRoom.getRoomTitle()}</Emoji>
                            {chatRoom.isMeeting && chatRoom.publicLink && (
                                <i
                                    className={`
                                        sprite-fm-mono
                                        ${dialog ? 'icon-arrow-up' : 'icon-arrow-down'}
                                    `}
                                />
                            )}
                        </div>
                    </div>
                    <this.Pagination />
                    <div className={`${NAMESPACE}-controls`}>
                        <ModeSwitch
                            mode={mode}
                            streamsPerPage={streamsPerPage}
                            onStreamsPerPageChange={onStreamsPerPageChange}
                            onModeChange={onModeChange}
                            setActiveElement={setActiveElement}
                        />
                        <Button
                            className="head-control"
                            simpletip={{ ...SIMPLETIP, label: this.fullscreen ? l.exit_fullscreen : l[17803] }}
                            icon={this.fullscreen ? 'icon-fullscreen-leave' : 'icon-fullscreen-enter'}
                            onClick={this.toggleFullscreen}>
                            <span>
                                {this.fullscreen ?
                                    l.exit_fullscreen /* `Exit full screen` */ :
                                    l[17803] /* `Full screen` */
                                }
                            </span>
                        </Button>
                        <Button
                            className="head-control"
                            simpletip={{ ...SIMPLETIP, label: l.minimize /* `Minimize` */}}
                            icon="icon-call-min-mode"
                            onClick={() => {
                                onCallMinimize();
                                eventlog(500305);
                            }}>
                            <div>{l.minimize /* `Minimize` */}</div>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
}
