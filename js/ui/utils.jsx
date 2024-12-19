import React from 'react';
import { createRoot } from 'react-dom';
import { ContactAwareComponent, SoonFcWrap } from '../chat/mixins.js';

class RenderTo extends React.Component {
    $$rootRef = undefined;
    popupElement = undefined;

    _setClassNames() {
        this.popupElement.className = this.props.className || '';
    }

    _renderLayer() {
        this.$$rootRef.render(this.props.children);
        queueMicrotask(() => this.props.popupDidMount?.(this.popupElement));
    }

    componentDidUpdate() {
        this._setClassNames();
        this._renderLayer();
    }

    componentWillUnmount() {
        onIdle(() => this.$$rootRef.unmount());
        this.props.popupWillUnmount?.(this.popupElement);
        this.props.element.removeChild(this.popupElement);
    }

    componentDidMount() {
        this.popupElement = document.createElement('div');
        this.$$rootRef = createRoot(this.popupElement);
        this._setClassNames();
        if (this.props.style) {
            $(this.popupElement).css(this.props.style);
        }
        this.props.element.appendChild(this.popupElement);
        this._renderLayer();
    }

    render() {
        // Render a placeholder
        return null;
    }
}

export const withOverflowObserver = Component =>
    class extends ContactAwareComponent {
        displayName = 'OverflowObserver';
        ref = React.createRef();

        state = {
            overflowed: false
        };

        constructor(props) {
            super(props);
            this.handleMouseEnter = this.handleMouseEnter.bind(this);
        }

        handleMouseEnter() {
            const element = this.ref && this.ref.current;
            if (element) {
                this.setState({ overflowed: element.scrollWidth > element.offsetWidth });
            }
        }

        shouldComponentUpdate(nextProps, nextState) {
            return (
                nextState.overflowed !== this.state.overflowed ||
                (nextProps.children !== this.props.children || nextProps.content !== this.props.content)
            );
        }

        render() {
            const { simpletip } = this.props;

            return (
                <div
                    ref={this.ref}
                    className={`
                        overflow-observer
                        ${this.state.overflowed ? 'simpletip simpletip-tc' : ''}
                    `}
                    data-simpletipposition={simpletip?.position || 'top'}
                    data-simpletipoffset={simpletip?.offset}
                    data-simpletip-class={simpletip?.className || 'medium-width center-align'}
                    onMouseEnter={this.handleMouseEnter}>
                    <Component {...this.props} />
                </div>
            );
        }
    };

export const Emoji = ({ children }) => {
    return <ParsedHTML content={megaChat.html(children)} />;
};

export class ParsedHTML extends React.Component {
    ref = React.createRef();

    updateInternalState() {
        const { children, content } = this.props;
        const ref = this.ref && this.ref.current;

        if (!children && !content) {
            return d > 1 && console.warn('Emoji: No content passed.');
        }

        if (ref) {
            if (ref.childNodes.length) {
                while (ref.firstChild) {
                    ref.removeChild(ref.firstChild);
                }
            }
            ref.appendChild(parseHTML(children || content));
        }
    }

    shouldComponentUpdate(nextProps) {
        return (
            nextProps && (nextProps.children !== this.props.children || nextProps.content !== this.props.content)
        );
    }

    componentDidUpdate() {
        this.updateInternalState();
    }

    componentDidMount() {
        this.updateInternalState();
    }

    render() {
        const { className, onClick, tag } = this.props;
        const Tag = tag || 'span';

        return (
            <Tag
                ref={this.ref}
                className={className}
                onClick={onClick}
            />
        );
    }
}

export const reactStringWrap = (src, find, WrapClass, wrapProps) => {
    const endTag = find.replace('[', '[/');
    return <>
        {src.split(find)[0]}
        <WrapClass
            {...wrapProps}
        >
            {src.substring(src.indexOf(find) + find.length, src.indexOf(endTag))}
        </WrapClass>
        {src.split(endTag)[1]}
    </>;
};

export const OFlowEmoji = withOverflowObserver(Emoji);
export const OFlowParsedHTML = withOverflowObserver(ParsedHTML);

export default {
    RenderTo,
    SoonFcWrap,
    OFlowEmoji,
    OFlowParsedHTML,
};
