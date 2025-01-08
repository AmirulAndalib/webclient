import React from 'react';
import { compose } from '../../../mixins.js';
import { Avatar } from '../../contacts.jsx';
import { isGuest } from '../call.jsx';
import Button from '../button.jsx';
import { withPermissionsObserver } from '../permissionsObserver.jsx';

class Preview extends React.Component {
    static NAMESPACE = 'preview-meeting';

    static STREAMS = {
        AUDIO: 1,
        VIDEO: 2
    };

    domRef = React.createRef();
    videoRef = React.createRef();
    stream = null;

    state = {
        audio: false,
        video: false,
        avatarMeta: undefined
    };

    constructor(props) {
        super(props);
        this.state.audio = this.props.audio || this.state.audio;
        if (this.props.video) {
            this.state.video = this.props.video;
            this.startStream(Preview.STREAMS.VIDEO);
            this.props.onToggle(this.state.audio, this.state.video);
        }
    }

    getTrackType = type => !type ? 'getTracks' : type === Preview.STREAMS.AUDIO ? 'getAudioTracks' : 'getVideoTracks';

    startStream = type => {
        // Cleanup previous streams, if any
        this.stopStream();

        const { audio, video } = this.state;
        navigator.mediaDevices.getUserMedia({ audio, video })
            .then(stream => {
                const videoRef = this.videoRef.current;
                if (videoRef) {
                    videoRef.srcObject = stream;
                    this.stream = stream;
                    if (this.props.onToggle) {
                        this.props.onToggle(this.state.audio, this.state.video);
                    }
                }
            })
            .catch(ex => {
                // Unable to start audio/video -> trigger media error, w/o enabling the control
                const stream = type === Preview.STREAMS.AUDIO ? 'audio' : 'video';
                return (
                    this.domRef.current &&
                    this.setState(state => ({ [stream]: !state[stream] }), () => {
                        megaChat.trigger('onLocalMediaError', {
                            [type === Preview.STREAMS.AUDIO ? 'mic' : 'camera']: `${ex.name}: ${ex.message}`
                        });
                        console.error(`${ex.name}: ${ex.message}`);
                    })
                );

            });
    };

    stopStream = type => {
        if (this.stream) {
            const trackType = this.getTrackType(type);
            const tracks = this.stream[trackType]();
            for (const track of tracks) {
                track.stop();
            }
        }
    };

    toggleStream = type => {
        const stream = type === Preview.STREAMS.AUDIO ? 'audio' : 'video';
        this.setState(state => ({ [stream]: !state[stream] }), () => {
            if (this.props.onToggle) {
                this.props.onToggle(this.state.audio, this.state.video);
            }
            return this.state[stream] ? this.startStream(type) : this.stopStream(type);
        });
        this.props.resetError?.(type === Preview.STREAMS.AUDIO ? Av.Audio : Av.Camera);
    };

    renderAvatar = () => {
        if (isGuest()) {
            return (
                <div className="avatar-guest">
                    <i className="sprite-fm-uni icon-owner" />
                </div>
            );
        }

        if (is_chatlink) {
            const { avatarUrl, color, shortName } = this.state.avatarMeta || {};
            return (
                <div
                    className={`
                        avatar-wrapper
                        ${color ? (`color${color}`) : ''}
                    `}>
                    {avatarUrl && <img src={avatarUrl} alt=""/>}
                    {color && <span>{shortName}</span>}
                </div>
            );
        }

        return <Avatar contact={M.u[u_handle]} />;
    };

    componentWillUnmount() {
        this.stopStream();
    }

    componentDidMount() {
        if (this.props.onToggle) {
            this.props.onToggle(this.state.audio, this.state.video);
        }
        this.setState({ avatarMeta: is_chatlink ? generateAvatarMeta(u_handle) : undefined });
    }

    render() {
        const { NAMESPACE } = Preview;
        const { hasToRenderPermissionsWarning, renderPermissionsWarning } = this.props;
        const { audio, video } = this.state;
        const SIMPLETIP_PROPS = { label: undefined, position: 'top', className: 'theme-dark-forced' };

        return (
            <div
                ref={this.domRef}
                className={`
                    ${NAMESPACE}
                    local-stream-mirrored
                `}>
                {video && <div className={`${NAMESPACE}-video-overlay`} />}
                <video className={video ? 'streaming' : ''} muted={true} autoPlay={true} ref={this.videoRef} />
                {!video && this.renderAvatar()}

                <div className={`${NAMESPACE}-controls`}>
                    <div className="preview-control-wrapper">
                        <Button
                            simpletip={{
                                ...SIMPLETIP_PROPS,
                                label: audio ? l[16214] /* `Mute` */ : l[16708] /* `Unmute` */
                            }}
                            className={`
                                mega-button
                                round
                                theme-light-forced
                                ${NAMESPACE}-control
                                ${audio ? '' : 'with-fill'}
                            `}
                            icon={audio ? 'icon-mic-thin-outline' : 'icon-mic-off-thin-outline'}
                            onClick={() => {
                                this.toggleStream(Preview.STREAMS.AUDIO);
                            }}>
                        </Button>
                        <span>{l.mic_button /* `Mic` */}</span>
                        {hasToRenderPermissionsWarning(Av.Audio) ? renderPermissionsWarning(Av.Audio) : null}
                    </div>
                    <div className="preview-control-wrapper">
                        <Button
                            simpletip={{
                                ...SIMPLETIP_PROPS,
                                label: video ? l[22894] /* `Disable video` */ : l[22893] /* `Enable video`*/
                            }}
                            className={`
                                mega-button
                                round
                                theme-light-forced
                                ${NAMESPACE}-control
                                ${video ? '' : 'with-fill'}
                            `}
                            icon={video ? 'icon-video-thin-outline' : 'icon-video-off-thin-outline'}
                            onClick={() => this.toggleStream(Preview.STREAMS.VIDEO)}>
                        </Button>
                        <span>{l.camera_button /* `Camera` */}</span>
                        {hasToRenderPermissionsWarning(Av.Camera) ? renderPermissionsWarning(Av.Camera) : null}
                    </div>
                </div>
            </div>
        );
    }
}

export default compose(withPermissionsObserver)(Preview);
