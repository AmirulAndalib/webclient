import React from 'react';
import { PerfectScrollbar } from '../../../ui/perfectScrollbar.jsx';
import SearchField from './searchField.jsx';
import ResultContainer from './resultContainer.jsx';

const GIF_PANEL_CLASS = 'gif-panel-wrapper';
const MAX_HEIGHT = 550;

export const API = {
    HOSTNAME: 'https://giphy.mega.nz/',
    ENDPOINT: 'v1/gifs',
    SCHEME: 'giphy://',
    convert: path => {
        if (path && typeof path === 'string') {
            const FORMAT = [API.SCHEME, API.HOSTNAME];
            if (path.indexOf(API.SCHEME) === 0 || path.indexOf(API.HOSTNAME) === 0) {
                return (
                    String.prototype.replace.apply(path, path.indexOf(API.SCHEME) === 0 ? FORMAT : FORMAT.reverse())
                );
            }
        }
    },
    LIMIT: 50,
    OFFSET: 50
};

export const LABELS = freeze({
    get SEARCH() {
        return l[24025];
    },
    get NO_RESULTS() {
        return l[24050];
    },
    get NOT_AVAILABLE() {
        return l[24512];
    },
    get END_OF_RESULTS() {
        return l[24156];
    }
});

export default class GifPanel extends React.Component {
    domRef = React.createRef();
    pathRef = '';
    controllerRef = null;
    fetchRef = null;

    delayProcID = null;

    defaultState = {
        value: '',
        searching: false,
        results: [],
        loading: true,
        offset: 0,
        bottom: false,
        unavailable: false
    };

    state = { ...this.defaultState };

    getContainerHeight = () => (
        window.innerHeight * 0.6 > MAX_HEIGHT ? MAX_HEIGHT : window.innerHeight * 0.6
    );

    getFormattedPath = path => {
        const PATH = path + (path.indexOf('?') === -1 ? '?' : '&');
        const LIMIT = `limit=${API.LIMIT}`;
        return `${API.HOSTNAME + API.ENDPOINT}/${PATH + LIMIT}`;
    };

    clickedOutsideComponent = ev => {
        const $target = ev && $(ev.target);
        const outsideElements = ['.small-icon.tiny-reset', '.small-icon.gif'];

        return (
            $target.parents(`.${GIF_PANEL_CLASS}`).length === 0 &&
            outsideElements.every(outsideElement => !$target.is(outsideElement))
        );
    };

    bindEvents = () => {
        $(document)
            .rebind('mousedown.gifPanel', ev => {
                if (this.clickedOutsideComponent(ev)) {
                    this.props.onToggle();
                }
            })
            .rebind('keydown.gifPanel', ({ keyCode }) => {
                if (keyCode && keyCode === 27 /* ESC */) {
                    // Clear the text on the first `ESC` press; minimize on the second
                    return SearchField.hasValue() ? this.doReset() : this.props.onToggle();
                }
            });
    };

    unbindEvents = () => {
        if (this.delayProcID) {
            delay.cancel(this.delayProcID);
        }
        $(document).unbind('.gifPanel');
    };

    doFetch = path => {
        this.setState({ loading: true, unavailable: false }, () => {
            this.pathRef = path;
            this.controllerRef = typeof AbortController === 'function' && new AbortController();
            this.fetchRef =
                fetch(this.getFormattedPath(path), { signal: this.controllerRef.signal })
                    .then(response => response.json())
                    .then(({ data }) => {
                        this.fetchRef = this.pathRef = null;
                        if (this.domRef.current) {
                            if (data && data.length) {
                                return this.setState(state => ({
                                    results: [...state.results, ...data],
                                    loading: false
                                }));
                            }
                            return this.setState({ bottom: true, loading: false }, () =>
                                this.resultContainerRef && this.resultContainerRef.reinitialise()
                            );
                        }
                    })
                    .catch(ex => {
                        return ex.name === 'AbortError' ? null : this.setState({ unavailable: true });
                    });
        });
    };

    doPaginate = () => {
        const { value, loading, searching } = this.state;
        if (!loading) {
            this.setState(state => ({ offset: state.offset + API.OFFSET }), () => {
                this.doFetch(
                    searching ?
                        `search?q=${escape(value)}&offset=${this.state.offset}` :
                        `trending?offset=${this.state.offset}`
                );
            });
        }
    };

    doReset = () => {
        this.setState({  ...this.defaultState  }, () => {
            this.doFetch('trending');
            onIdle(() => SearchField.focus());
            this.resultContainerRef.scrollToY(0);
        });
    };

    handleChange = ev => {
        const { value } = ev.target;
        const searching = value.length >= 2;

        if (value.length === 0) {
            return this.doReset();
        }

        if (this.fetchRef !== null && this.pathRef === 'trending' && this.controllerRef) {
            this.controllerRef.abort();
            this.fetchRef = this.pathRef = null;
        }

        this.setState(state => ({
            ...this.defaultState,
            value,
            searching,
            results: searching ? [] : state.results
        }), () => {
            this.resultContainerRef.scrollToY(0);
            this.delayProcID = searching ?
                delay('gif-search', () => this.doFetch(`search?q=${escape(value)}`), 1600) :
                null;
        });
    };

    handleBack = () => this.doReset();

    doSend = result => {
        const { mp4, webp, mp4_size, webp_size, width, height } = result.images.fixed_height;
        const message = (
            Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT +
            Message.MANAGEMENT_MESSAGE_TYPES.CONTAINS_META +
            Message.MESSAGE_META_TYPE.GIPHY +
            JSON.stringify({
                textMessage: result.title,
                src: API.convert(mp4),
                src_webp: API.convert(webp),
                s: mp4_size,
                s_webp: webp_size,
                w: width,
                h: height
            })
        );
        this.props.chatRoom.sendMessage(message);
        this.props.onToggle();
    };

    componentDidMount() {
        if (this.state.results && this.state.results.length === 0) {
            this.doFetch('trending');
        }
        this.bindEvents();
    }

    componentWillUnmount() {
        this.unbindEvents();
    }

    render() {
        const { value, searching, results, loading, bottom, unavailable } = this.state;

        return (
            <div
                ref={this.domRef}
                className="gif-panel-wrapper">
                <div
                    className="gif-panel"
                    style={{ height: this.getContainerHeight() }}>
                    <div className="gif-panel-header">
                        <SearchField
                            value={value}
                            searching={searching}
                            onChange={this.handleChange}
                            onReset={this.doReset}
                            onBack={this.handleBack}
                        />
                    </div>

                    <div className="gif-panel-content">
                        <PerfectScrollbar
                            ref={container => {
                                this.resultContainerRef = container;
                            }}
                            options={{ 'suppressScrollX': true }}>
                            <ResultContainer
                                results={results}
                                loading={loading}
                                bottom={bottom}
                                unavailable={unavailable}
                                onPaginate={this.doPaginate}
                                onClick={this.doSend}
                            />
                        </PerfectScrollbar>
                    </div>
                </div>
            </div>
        );
    }
}
