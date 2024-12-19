var React = require("react");
import {MegaRenderMixin} from "../chat/mixins";
var DropdownsUI = require('./dropdowns.jsx');
var PerfectScrollbar = require('./perfectScrollbar.jsx').PerfectScrollbar;

export class DropdownEmojiSelector extends MegaRenderMixin {
    domRef = React.createRef();
    emojiSearchRef = React.createRef();

    static defaultProps = {
        'requiresUpdateOnResize': true,
        'hideable': true
    };

    constructor(props) {
        super(props);

        this.data_categories = null;
        this.data_emojis = null;
        this.data_emojiByCategory = null;
        this.customCategoriesOrder = [
            "frequently_used",
            "people",
            "nature",
            "food",
            "activity",
            "travel",
            "objects",
            "symbols",
            "flags"
        ];
        this.frequentlyUsedEmojis = [
            'slight_smile',
            'grinning',
            'smile',
            'rofl',
            'wink',
            'yum',
            'rolling_eyes',
            'stuck_out_tongue',
            'smiling_face_with_3_hearts',
            'heart_eyes',
            'kissing_heart',
            'sob',
            'pleading_face',
            'thumbsup',
            'pray',
            'wave',
            'fire',
            'sparkles',
        ];
        this.heightDefs = {
            'categoryTitleHeight': 55,
            'emojiRowHeight': 35,
            'containerHeight': 302,
            'totalScrollHeight': 302,
            'numberOfEmojisPerRow': 9
        };
        this.categoryLabels = {
            'frequently_used': l[17737],
            'people': l[8016],
            'objects': l[17735],
            'activity': l[8020],
            'nature': l[8017],
            'travel': l[8021],
            'symbols': l[17736],
            'food': l[8018],
            'flags': l[17703]
        };

        this.state = this.getInitialState();
        this.onSearchChange = this.onSearchChange.bind(this);
        this.onUserScroll = this.onUserScroll.bind(this);
        this._onScrollChanged = this._onScrollChanged.bind(this);
    }
    getInitialState() {
        return clone({
            'previewEmoji': null,
            'searchValue': '',
            'browsingCategory': false,
            'isActive': false,
            'isLoading': true,
            'loadFailed': false,
            'visibleCategories': "0"
        })
    }
    _generateEmoji(meta) {
        var filename = twemoji.convert.toCodePoint(meta.u);

        return <img
            width="20"
            height="20"
            className="emoji emoji-loading"
            draggable="false"
            alt={meta.u}
            title={":" + meta.n + ":"}
            onLoad={(e) => {
                e.target.classList.remove('emoji-loading');
            }}
            onError={(e) => {
                e.target.classList.remove('emoji-loading');
                e.target.classList.add('emoji-loading-error');
            }}
            src={
                staticpath +
                "images/mega/twemojis/2_v2/72x72/" +
                filename + ".png"
            }
        />;
    }
    _generateEmojiElement(emoji, cat) {
        var self = this;

        var categoryName = self.data_categories[cat];

        return <div
            data-emoji={emoji.n}
            className="button square-button emoji" key={categoryName + "_" + emoji.n}
            onMouseEnter={(e) => {
                if (self.mouseEnterTimer) {
                    clearTimeout(self.mouseEnterTimer);
                }

                e.stopPropagation();
                e.preventDefault();

                // delay the .setState change, because of the tons of icons we've, which are
                // re-rendered in case of .setState
                self.mouseEnterTimer = setTimeout(function() {
                    self.setState({'previewEmoji': emoji});
                }, 250);
            }}
            onMouseLeave={(e) => {
                if (self.mouseEnterTimer) {
                    clearTimeout(self.mouseEnterTimer);
                }
                e.stopPropagation();
                e.preventDefault();

                self.setState({'previewEmoji': null});
            }}
            onClick={(e) => {
                if (self.props.onClick) {
                    self.props.onClick(e, emoji.n, emoji);

                    $(document).trigger('closeDropdowns');
                }
            }}
        >
            {self._generateEmoji(emoji)}
        </div>;
    }
    UNSAFE_componentWillUpdate(nextProps, nextState) {
        if (
            nextState.searchValue !== this.state.searchValue ||
            nextState.browsingCategories !== this.state.browsingCategories
        ) {
            this._cachedNodes = {};
            if (this.scrollableArea) {
                this.scrollableArea.scrollToY(0);
            }
            this._onScrollChanged(0, nextState);
        }

        if (nextState.isActive === true) {
            var self = this;
            if (
                nextState.isLoading === true ||
                (!self.loadingPromise && (!self.data_categories || !self.data_emojis))
            ) {
                const p = [megaChat.getEmojiDataSet('categories'), megaChat.getEmojiDataSet('emojis')];

                this.loadingPromise = Promise.all(p)
                    .then(([categories, emojis]) => {
                        this.data_emojis = emojis;
                        this.data_categories = categories;

                        // custom categories order
                        self.data_categories.push('frequently_used');
                        self.data_categoriesWithCustomOrder = [];
                        self.customCategoriesOrder.forEach(function(catName) {
                            self.data_categoriesWithCustomOrder.push(
                                self.data_categories.indexOf(catName)
                            );
                        });

                        self.data_emojiByCategory = {};

                        var frequentlyUsedEmojisMeta = {};
                        self.data_emojis.forEach(function(emoji) {
                            var cat = emoji.c;
                            if (!self.data_emojiByCategory[cat]) {
                                self.data_emojiByCategory[cat] = [];
                            }
                            if (self.frequentlyUsedEmojis.indexOf(emoji.n) > -1) {
                                frequentlyUsedEmojisMeta[emoji.n] = emoji.u;
                            }

                            emoji.element = self._generateEmojiElement(emoji, cat);

                            self.data_emojiByCategory[cat].push(
                                emoji
                            );
                        });


                        self.data_emojiByCategory[8] = [];

                        self.frequentlyUsedEmojis.forEach(function(slug) {
                            var emoji = {
                                'n': slug,
                                'u': frequentlyUsedEmojisMeta[slug]
                            };

                            emoji.element = self._generateEmojiElement(emoji, 99);
                            self.data_emojiByCategory[8].push(
                                emoji
                            );
                        });

                        self._onScrollChanged(0);

                        self.setState({'isLoading': false});
                    })
                    .catch((ex) => {
                        if (d) {
                            console.error("Emoji loading failed.", ex);
                        }
                        this.setState({'loadFailed': true, 'isLoading': false});
                    });
            }
        }
        else if (nextState.isActive === false) {

            if (this.data_emojis) {
                // cleanup cached React/DOM elements from the emoji set
                for (let i = this.data_emojis.length; i--;) {
                    delete this.data_emojis[i].element;
                }
            }
            this.data_emojis = null;
            this.data_categories = null;
            this.data_emojiByCategory = null;
            this.loadingPromise = null;
        }
    }
    onSearchChange(e) {
        var self = this;
        self.setState({
            searchValue: e.target.value,
            browsingCategory: false
        });
    }
    onUserScroll($ps) {
        if (this.state.browsingCategory) {
            var $cat = $('.emoji-category-container[data-category-name="' + this.state.browsingCategory + '"]');
            if (!elementInViewport($cat)) {
                this.setState({'browsingCategory': false});
            }
        }

        this._onScrollChanged($ps.getScrollPositionY());
    }
    generateEmojiElementsByCategory(categoryId, posTop, stateObj) {
        var self = this;

        if (!self._cachedNodes) {
            self._cachedNodes = {};
        }
        if (!stateObj) {
            stateObj = self.state;
        }

        if (typeof self._cachedNodes[categoryId] !== 'undefined') {
            return self._cachedNodes[categoryId];
        }

        var categoryName = self.data_categories[categoryId];
        var emojis = [];
        var searchValue = stateObj.searchValue;

        var totalEmojis = 0;
        self.data_emojiByCategory[categoryId].forEach(function (meta) {
            var slug = meta.n;
            if (searchValue.length > 0) {
                if ((":" + slug + ":").toLowerCase().indexOf(searchValue.toLowerCase()) < 0) {
                    return;
                }
            }

            totalEmojis++;

            emojis.push(
                meta.element
            );
        });


        if (emojis.length > 0) {
            var totalHeight = self.heightDefs.categoryTitleHeight + Math.ceil(
                    (totalEmojis / self.heightDefs.numberOfEmojisPerRow)
                ) * self.heightDefs.emojiRowHeight;

            return self._cachedNodes[categoryId] = [
                totalHeight,
                <div
                    key={categoryName}
                    data-category-name={categoryName} className="emoji-category-container"
                    style={{
                        'position': 'absolute',
                        'top': posTop
                    }}
                    >
                    {emojis.length > 0 ? <div className="clear"></div> : null}
                    <div className="emoji-type-txt">
                        {
                            self.categoryLabels[categoryName] ?
                                self.categoryLabels[categoryName] :
                                categoryName
                        }
                    </div>

                    <div className="clear"></div>
                    {emojis}
                    <div className="clear"></div>
                </div>
            ];
        }
        else {
            return self._cachedNodes[categoryId] = undefined;
        }
    }
    _isVisible(scrollTop, scrollBottom, elTop, elBottom) {
        var visibleTop = elTop < scrollTop ? scrollTop : elTop;
        var visibleBottom = elBottom > scrollBottom ? scrollBottom : elBottom;

        return visibleBottom - visibleTop > 0;
    }
    _onScrollChanged(scrollPositionY, stateObj) {
        var self = this;

        if (!self.data_categoriesWithCustomOrder) {
            return;
        }

        if (scrollPositionY === false) {
            scrollPositionY = self.scrollableArea.getScrollPositionY();
        }
        if (!stateObj) {
            stateObj = self.state;
        }

        var visibleStart = scrollPositionY;
        var visibleEnd = visibleStart + self.heightDefs.containerHeight;

        var currentPos = 0;
        var visibleCategories = [];
        self._emojiReactElements = [];
        self.data_categoryPositions = {};

        self.data_categoriesWithCustomOrder.forEach(function (k) {
            var categoryDivMeta = self.generateEmojiElementsByCategory(k, currentPos, stateObj);
            if (categoryDivMeta) {
                var startPos = currentPos;
                currentPos += categoryDivMeta[0];
                var endPos = currentPos;

                self.data_categoryPositions[k] = startPos;

                if (
                    self._isVisible(
                        visibleStart,
                        visibleEnd,
                        startPos,
                        endPos
                    )
                ) {
                    visibleCategories.push(k);
                    self._emojiReactElements.push(categoryDivMeta[1]);
                }
            }
        });

        if (self._emojiReactElements.length === 0) {
            const emojisNotFound = (
                <span className="emojis-not-found" key={'emojis-not-found'}>
                    {l[20920]}
                </span>
            );
            self._emojiReactElements.push(emojisNotFound);
        }

        visibleCategories = visibleCategories.join(',');

        self.setState({
            'totalScrollHeight': currentPos,
            'visibleCategories': visibleCategories
        });
    }
    _renderEmojiPickerPopup() {
        var self = this;

        var preview;
        if (self.state.previewEmoji) {
            var meta = self.state.previewEmoji;

            preview = <div className="emoji-preview">
                {self._generateEmoji(meta)}
                <div className="emoji title">{":" + meta.n + ":"}</div>
            </div>;
        }

        var categoryIcons = {
            "frequently_used": "icon-emoji-type-frequent",
            "people": "icon-emoji-type-people",
            "nature": "icon-emoji-type-nature",
            "food": "icon-emoji-type-food",
            "activity": "icon-emoji-type-activity",
            "travel": "icon-emoji-type-travel",
            "objects": "icon-emoji-type-objects",
            "symbols": "icon-emoji-type-symbol",
            "flags": "icon-emoji-type-flag",
        };

        var categoryButtons = [];

        var activeCategoryName = false;
        if (!self.state.searchValue) {
            var firstActive = self.state.visibleCategories.split(",")[0];
            if (firstActive) {
                activeCategoryName = self.data_categories[firstActive];
            }
        }

        self.customCategoriesOrder.forEach(categoryName => {
            categoryButtons.push(
                <div
                    visiblecategories={this.state.visibleCategories}
                    className={`
                        button square-button emoji
                        ${activeCategoryName === categoryName ? 'active' : ''}
                    `}
                    key={categoryIcons[categoryName]}
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();

                        this.setState({ browsingCategory: categoryName, searchValue: '' });
                        this._cachedNodes = {};

                        const categoryPosition =
                            this.data_categoryPositions[this.data_categories.indexOf(categoryName)] + 10;
                        this.scrollableArea.scrollToY(categoryPosition);
                        this._onScrollChanged(categoryPosition);

                        const {current} = this.emojiSearchRef || !1;
                        current?.focus();
                    }}>
                    <i className={`sprite-fm-mono ${categoryIcons[categoryName]}`} />
                </div>
            );
        });

        return (
            <>
                <div className="popup-header emoji">
                    {preview || (
                        <div className="search-block emoji">
                            <i className="sprite-fm-mono icon-preview-reveal" />
                            <input
                                ref={this.emojiSearchRef}
                                type="search"
                                placeholder={l[102]}
                                onChange={this.onSearchChange}
                                autoFocus={true}
                                value={this.state.searchValue} />
                        </div>
                    )}
                </div>

                <PerfectScrollbar
                    className="popup-scroll-area emoji perfectScrollbarContainer"
                    searchValue={this.state.searchValue}
                    onUserScroll={this.onUserScroll}
                    visibleCategories={this.state.visibleCategories}
                    ref={ref => {
                        this.scrollableArea = ref;
                    }}>
                    <div className="popup-scroll-content emoji">
                        <div style={{ height: this.state.totalScrollHeight }}>
                            {this._emojiReactElements}
                        </div>
                    </div>
                </PerfectScrollbar>

                <div className="popup-footer emoji">{categoryButtons}</div>
            </>
        );
    }
    render() {
        var self = this;

        var popupContents = null;

        if (self.state.isActive === true) {
            if (self.state.loadFailed === true) {
                popupContents = <div className="loading">{l[1514]}</div>;
            }
            else if (this.state.isLoading || !this.data_emojiByCategory || !this.data_categories) {
                popupContents = <div className="loading">{l[5533]}</div>;
            }
            else {
                popupContents = self._renderEmojiPickerPopup();
            }
        }
        else {
            popupContents = null;
        }

        return <DropdownsUI.Dropdown
            className="popup emoji"
            {...self.props}
            isLoading={self.state.isLoading}
            loadFailed={self.state.loadFailed}
            visibleCategories={this.state.visibleCategories}
            forceShowWhenEmpty={true}
            onActiveChange={(newValue) => {
                // reset state if the dropdown is hidden
                if (newValue === false) {
                    self.setState(self.getInitialState());
                    self._cachedNodes = {};
                    self._onScrollChanged(0);
                }
                else {
                    self.setState({'isActive': true});
                }
                if (self.props.onActiveChange) {
                    self.props.onActiveChange(newValue);
                }
            }}
            searchValue={self.state.searchValue}
            browsingCategory={self.state.browsingCategory}
            previewEmoji={self.state.previewEmoji}>
            <div ref={this.domRef}>
                {popupContents}
            </div>
        </DropdownsUI.Dropdown>;
    }
}
