var React = require("react");
import {MegaRenderMixin} from "../mixins";

const SharedFolderItem = ({ node, isLoading }) => {
    return (
        <div
            key={node.h}
            className={`
                chat-shared-block
                incoming
                ${isLoading ? 'is-loading' : ''}
            `}
            onClick={() => M.openFolder(node.h)}
            onDoubleClick={() => M.openFolder(node.h)}>
            <div className="item-type-icon-90 icon-folder-incoming-90"/>
            <div className="chat-shared-info">
                <span className="txt">{node.name}</span>
                <span className="txt small">{fm_contains(node.tf, node.td)}</span>
            </div>
        </div>
    );
};

class IncSharesAccordionPanel extends MegaRenderMixin {
    domRef = React.createRef();

    UNSAFE_componentWillMount() {
        this.hadLoaded = false;
    }

    getContactHandle() {
        var self = this;
        var room = self.props.chatRoom;
        var contactHandle = room.getParticipantsExceptMe()[0];
        if (!contactHandle || room.type !== "private") {
            return {};
        }
        return contactHandle;
    }

    render() {
        var self = this;
        var room = self.props.chatRoom;
        var contactHandle = self.getContactHandle();
        var contents = null;
        var MAX_ITEMS = 10;


        if (this.props.expanded) {
            if (!this.hadLoaded) {
                this.hadLoaded = true;

                // load shares
                self.isLoadingMore = true;
                dbfetch.geta(Object.keys(M.c.shares || {}), new MegaPromise())
                    .always(function() {
                        self.isLoadingMore = false;
                        Soon(function() {
                            if (self.isComponentEventuallyVisible()) {
                                self.safeForceUpdate();
                            }
                        }, 5000);
                    });
            }
            var incomingSharesContainer = null;
            var sharedFolders = M.c[contactHandle] && Object.keys(M.c[contactHandle]) || [];

            if (!self.isLoadingMore && (!sharedFolders || sharedFolders.length === 0)) {
                incomingSharesContainer =  <div className="chat-dropdown empty-txt">
                    {l[19986]}
                </div>;
            }
            else {
                var haveMore = sharedFolders.length > MAX_ITEMS;
                // do sort
                var defSortFn = M.getSortByNameFn();
                sharedFolders.sort(function(a, b) {
                    var nodeA = M.d[a];
                    var nodeB = M.d[b];
                    return defSortFn(nodeA, nodeB, -1);
                });

                var renderNodes = [];
                for (var i = 0; i < Math.min(sharedFolders.length, MAX_ITEMS); i++) {
                    var nodeHandle = sharedFolders[i];
                    var node = M.d[nodeHandle];
                    if (!node) {
                        continue;
                    }
                    renderNodes.push(
                        <SharedFolderItem key={node.h} isLoading={self.isLoadingMore}
                            node={node}
                            chatRoom={room} />
                    );
                }

                incomingSharesContainer =  <div>
                    {renderNodes}
                    {haveMore ?
                        <div className="chat-share-nav body">
                            <div className="chat-share-nav show-all" onClick={function() {
                                M.openFolder(contactHandle);
                            }}>
                                <span className="item-type-icon icon-folder-incoming-24">
                                    <span className="item-type-icon icon-folder-incoming-24"></span>
                                </span>
                                <span className="txt">{l[19797] ? l[19797] : "Show All"}</span>
                            </div>
                        </div> : null}
                </div>;
            }
            contents = <div className="chat-dropdown content have-animation">
                {incomingSharesContainer}
                {self.isLoadingMore ?
                    <div className="chat-dropdown empty-txt">
                        <div className="loading-spinner light small"><div className="main-loader"></div></div>
                    </div> :
                    null
                }
            </div>;
        }

        return (
            <div
                ref={this.domRef}
                className="chat-dropdown container">
                <div
                    className={`
                        chat-dropdown
                        header
                        ${this.props.expanded ? 'expanded' : ''}
                    `}
                    onClick={this.props.onToggle}>
                    <span>{this.props.title}</span>
                    <i className="sprite-fm-mono icon-arrow-down" />
                </div>
                <div
                    className={`
                        chat-shared-files-container
                        ${this.isLoadingMore ? 'is-loading' : ''}
                    `}>
                    {contents}
                </div>
            </div>
        );
    }
}


export {
    SharedFolderItem,
    IncSharesAccordionPanel
};
