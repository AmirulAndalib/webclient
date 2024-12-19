var React = require("react");
import utils from './utils.jsx';
import {MegaRenderMixin} from "../chat/mixins";
import {ContactPickerWidget} from './../chat/ui/contacts.jsx';

export class Dropdown extends MegaRenderMixin {
    domRef = React.createRef();

    static defaultProps = {
        'requiresUpdateOnResize': true,
    };

    constructor(props) {
        super(props);
        this.onActiveChange = this.onActiveChange.bind(this);
        this.onResized = this.onResized.bind(this);
    }

    UNSAFE_componentWillUpdate(nextProps) {
        // eslint-disable-next-line eqeqeq
        if (this.props.active != nextProps.active) {
            this.onActiveChange(nextProps.active);
        }
    }

    specShouldComponentUpdate(nextProps, nextState) {
        if (this.props.active != nextProps.active) {
            if (this.props.onBeforeActiveChange) {
                this.props.onBeforeActiveChange(nextProps.active);
            }
            return true;
        }
        // eslint-disable-next-line eqeqeq
        else if (this.props.focused != nextProps.focused) {
            return true;
        }
        // eslint-disable-next-line eqeqeq
        else if (this.state && this.state.active != nextState.active) {
            return true;
        }
        // not sure, leave to the render mixing to decide.
        return undefined;
    }

    onActiveChange(newVal) {
        if (this.props.onActiveChange) {
            this.props.onActiveChange(newVal);
        }
    }
    reposElementUsing(element, obj, info) {
        var $element;
        if (this.popupElement) {
            $element = $(this.popupElement);
        }
        else {
            return;
        }
        var self = this;
        var vertOffset = 0;
        var horizOffset = 0;
        var offsetLeft = 0;

        if (!self.props.noArrow) {
            var $arrow = $('.dropdown-white-arrow', $element);
            var arrowHeight;
            if (self.props.arrowHeight) {
                arrowHeight = self.props.arrowHeight;
                if (info.vertical === "top") {
                    arrowHeight = 0;
                }
                else {
                    arrowHeight *= -1;
                }
            }
            else {
                arrowHeight = $arrow.outerHeight();
            }
            if (info.vertical === "top") {
                $(element)
                    .removeClass("down-arrow")
                    .addClass("up-arrow");
            }
            else {
                $(element)
                    .removeClass("up-arrow")
                    .addClass("down-arrow");
            }

            vertOffset += info.vertical === "top" ? arrowHeight : 0;
        }


        if (self.props.vertOffset) {
            vertOffset += self.props.vertOffset * (info.vertical === "top" ? 1 : -1);
        }

        if (self.props.horizOffset) {
            horizOffset += self.props.horizOffset;
        }

        $(element).css({
            left: obj.left + (offsetLeft ? offsetLeft / 2 : 0) + horizOffset + 'px',
            top: obj.top + vertOffset + 'px'
        });

        if (this.props.positionLeft) {
            $(element).css({ left: this.props.positionLeft });
        }
    }
    onResized() {
        var self = this;
        if (this.props.active === true && this.popupElement) {
            var $element = $(this.popupElement);
            // eslint-disable-next-line local-rules/jquery-scopes
            var $positionToElement = $('.button.active-dropdown:visible');
            if ($positionToElement.length === 0) {
                return;
            }
            var $container = $positionToElement.closest('.messages.scroll-area');

            if ($container.length === 0) {
                $container = $(document.body);
            }

            $element.css('margin-left', '');

            $element.position({
                of: $positionToElement,
                my: self.props.positionMy ? self.props.positionMy : "center top",
                at: self.props.positionAt ? self.props.positionAt : "center bottom",
                collision: this.props.collision || 'flipfit',
                within: self.props.wrapper || $container,
                using: function(obj, info) {
                    self.reposElementUsing(this, obj, info);
                }});
        }
    }

    componentDidMount() {
        super.componentDidMount();
        chatGlobalEventManager.addEventListener('resize', 'drpdwn' + this.getUniqueId(), this.onResized.bind(this));
        this.onResized();
        var self = this;
        $(document.body).rebind('closeAllDropdownsExcept.drpdwn' + this.getUniqueId(), function (e, target) {
            if (self.props.active && target !== self) {
                if (self.props && self.props.closeDropdown) {
                    self.props.closeDropdown();
                }
            }
        });
    }

    componentDidUpdate() {
        this.onResized();
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        $(document.body).unbind('closeAllDropdownsExcept.drpdwn' + this.getUniqueId());
        if (this.props.active) {
            // fake an active=false so that any onActiveChange handlers would simply trigger back UI to the state
            // in which this element is not active any more (since it would be removed from the DOM...)
            this.onActiveChange(false);
        }
        chatGlobalEventManager.removeEventListener('resize', 'drpdwn' + this.getUniqueId());
    }

    doRerender() {
        var self = this;

        setTimeout(function() {
            self.safeForceUpdate();
        }, 100);

        // idb + DOM updates = delayed update so .onResized won't properly reposition the DOM node using $.position,
        // so we need to manually call this
        setTimeout(function() {
            self.onResized();
        }, 200);
    }

    renderChildren() {
        var self = this;

        return React.Children.map(this.props.children, function (child) {
            if (child) {
                var activeVal = self.props.active || self.state.active;
                activeVal = String(activeVal);

                return React.cloneElement(child, {
                    active: activeVal
                });
            }
            return null;
        });
    }

    render() {
        if (this.props.active !== true) {
            return null;
        }

        var self = this;

        var child = null;

        if (this.props.children) {
            child = <div ref={this.domRef}>{self.renderChildren()}</div>;
        }
        else if (this.props.dropdownItemGenerator) {
            child = this.props.dropdownItemGenerator(this);
        }

        if (!child && !this.props.forceShowWhenEmpty) {
            if (this.props.active !== false) {
                queueMicrotask(function() {
                    self.onActiveChange(false);
                });
            }
            return null;
        }

        return (
            <utils.RenderTo
                element={document.body}
                className={`
                    dropdown
                    body
                    ${this.props.noArrow ? '' : 'dropdown-arrow up-arrow'}
                    ${this.props.className || ''}
                `}
                style={this.popupElement && {
                    zIndex: 123,
                    position: 'absolute',
                    width: this.props.styles ? this.props.styles.width : undefined
                }}
                popupDidMount={popupElement => {
                    this.popupElement = popupElement;
                    this.onResized();
                }}
                popupWillUnmount={() => {
                    delete this.popupElement;
                }}>
                <div
                    ref={this.domRef}
                    onClick={() => {
                        $(document.body).trigger('closeAllDropdownsExcept', this);
                    }}>
                    {this.props.noArrow ? null : <i className="dropdown-white-arrow" />}
                    {child}
                </div>
            </utils.RenderTo>
        );
    }
}

export class DropdownContactsSelector extends MegaRenderMixin {
    static defaultProps = {
        requiresUpdateOnResize: true
    };

    constructor(props) {
        super(props);
        this.state = {
            'selected': this.props.selected ? this.props.selected : []
        }
        this.onSelectClicked = this.onSelectClicked.bind(this);
        this.onSelected = this.onSelected.bind(this);
    }
    specShouldComponentUpdate(nextProps, nextState) {
        // eslint-disable-next-line eqeqeq
        if (this.props.active != nextProps.active) {
            return true;
        }
        // eslint-disable-next-line eqeqeq
        else if (this.props.focused != nextProps.focused) {
            return true;
        }
        // eslint-disable-next-line eqeqeq
        else if (this.state && this.state.active != nextState.active) {
            return true;
        }
        // eslint-disable-next-line eqeqeq
        else if (this.state && JSON.stringify(this.state.selected) != JSON.stringify(nextState.selected)) {
            return true;
        }
        else {
            // not sure, leave to the render mixing to decide.
            return undefined;
        }
    }
    onSelected(nodes) {
        this.setState({'selected': nodes});
        if (this.props.onSelected) {
            this.props.onSelected(nodes);
        }
        this.forceUpdate();
    }
    onSelectClicked() {
        this.props.onSelectClicked();
    }
    render() {
        return (
            <Dropdown
                className={`
                    popup contacts-search
                    ${this.props.className}
                    tooltip-blur
                `}
                active={this.props.active}
                closeDropdown={this.props.closeDropdown}
                ref={ref => {
                    this.dropdownRef = ref;
                }}
                positionMy={this.props.positionMy}
                positionAt={this.props.positionAt}
                arrowHeight={this.props.arrowHeight}
                horizOffset={this.props.horizOffset}
                vertOffset={this.props.vertOffset}
                noArrow={true}>
                <ContactPickerWidget
                    onClose={this.props.closeDropdown}
                    onEventuallyUpdated={() => this.dropdownRef?.doRerender()}
                    active={this.props.active}
                    className="popup contacts-search tooltip-blur small-footer"
                    contacts={M.u}
                    selectFooter={this.props.selectFooter}
                    megaChat={this.props.megaChat}
                    exclude={this.props.exclude}
                    allowEmpty={this.props.allowEmpty}
                    multiple={this.props.multiple}
                    topButtons={this.props.topButtons}
                    showAddContact={this.props.showAddContact}
                    onAddContact={() => eventlog(500237)}
                    onSelected={() => eventlog(500238)}
                    onSelectDone={this.props.onSelectDone}
                    multipleSelectedButtonLabel={this.props.multipleSelectedButtonLabel}
                    singleSelectedButtonLabel={this.props.singleSelectedButtonLabel}
                    nothingSelectedButtonLabel={this.props.nothingSelectedButtonLabel}
                />
            </Dropdown>
        );
    }
}

export class DropdownItem extends MegaRenderMixin {
    domRef = React.createRef();

    static defaultProps = {
        requiresUpdateOnResize: true
    };

    constructor(props) {
        super(props);
        this.state = {'isClicked': false};
        this.onClick = this.onClick.bind(this);
        this.onMouseOver = this.onMouseOver.bind(this);
    }

    renderChildren() {
        var self = this;
        return React.Children.map(this.props.children, function(child) {
            var props = {
                active: self.state.isClicked,
                closeDropdown: function() {
                    self.setState({'isClicked': false});
                }
            };
            return React.cloneElement(child, props);
        });
    }

    onClick(ev) {
        const { children, persistent, onClick } = this.props;

        if (children) {
            ev.stopPropagation();
            ev.preventDefault();
            this.setState({ isClicked: !this.state.isClicked });
        }

        if (!persistent) {
            $(document).trigger('closeDropdowns');
        }

        return onClick && onClick(ev);
    }

    onMouseOver(e) {
        if (this.props.submenu) {
            var $contextItem = $(e.target).closest(".contains-submenu");
            var $subMenu = $contextItem.next('.submenu');
            var contextTopPos = $contextItem.position().top;
            var contextleftPos = 0;

            $contextItem.addClass("opened");
            $subMenu.addClass("active");

            contextleftPos = $contextItem.offset().left +
                $contextItem.outerWidth() + $subMenu.outerWidth() +10;

            if (contextleftPos > $(document.body).width()) {
                $subMenu.addClass("left-position");
            }

            $subMenu.css({
                "top": contextTopPos
            });
        }
        else if (!$(e.target).parent('.submenu').length) {
            var $dropdown = $(e.target).closest(".dropdown.body");
            $dropdown.find(".contains-submenu").removeClass("opened");
            $dropdown.find(".submenu").removeClass("active");
        }
    }

    render() {
        const { className, disabled, label, icon, submenu } = this.props;

        return (
            <div
                ref={this.domRef}
                className={`
                    dropdown-item
                    ${className ? className : ''}
                    ${submenu ? 'contains-submenu' : ''}
                    ${disabled ? 'disabled' : ''}
                `}
                onClick={disabled ? undefined : ev => this.onClick(ev)}
                onMouseOver={this.onMouseOver}>
                {icon && <i className={icon} />}
                {label && <span>{label}</span>}
                {submenu ? <i className="sprite-fm-mono icon-arrow-right submenu-icon" /> : ''}
                <div>{this.renderChildren()}</div>
            </div>
        );
    }
}
