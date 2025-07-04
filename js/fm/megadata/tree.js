/**
 * buildtree
 *
 * Re-creates tree DOM elements in given order i.e. { ascending, descending }
 * for given parameters i.e. { name, [last interaction, status] },
 * Sorting for status and last interaction are available only for contacts.
 * @param {Object} n The ufs-like node.
 * @param {String} [dialog] dialog identifier or force rebuild constant.
 * @param {String} [stype] what to sort.
 * @param {Object} [sSubMap] Internal use
 * @returns {MegaPromise}
 */
MegaData.prototype.buildtree = function(n, dialog, stype, sSubMap) {
    'use strict';

    if (!n) {
        console.error('Invalid node passed to M.buildtree');
        return false;
    }

    var folders = [];
    var _ts_l = (typeof treesearch !== 'undefined' && treesearch) ? treesearch.toLowerCase() : undefined;
    var _tf;
    var _a = 'treea_';
    var _li = 'treeli_';
    var _sub = 'treesub_';
    var rebuild = false;
    var curItemHandle;
    var buildnode;
    var containsc;
    var i;
    var node;
    var name;
    var html;
    var prefix;
    var inshares = n.h === 'shares';
    var outshares = n.h === 'out-shares';
    var publiclinks = n.h === 'public-links';
    var treeType;
    var expand = function(i, e) {
        if (i) {
            e.firstElementChild.classList.add('expanded');
        }
    };
    var labelhash = [];
    var cvtree = {};
    var firstRun = sSubMap === undefined;

    /*
     * XXX: Initially this function was designed to render new nodes only,
     * but due to a bug the entire tree was being rendered/created from
     * scratch every time. Trying to fix this now is a pain because a lot
     * of the New-design code was made with that bug in place and therefore
     * with the assumption the tree panels are recreated always.
     */

    if (dialog === this.buildtree.FORCE_REBUILD) {
        rebuild = true;
        dialog = undefined;
    }

    stype = stype || "cloud-drive";
    if (!dialog || rebuild) { // dialog should not be filtered unless it is forced.
        _tf = M.filterTreePanel[stype + '-label'];
    }

    if (firstRun) {

        sSubMap = 0;
        firstRun = true;

        if (d) {
            console.time('buildtree');
        }
    }

    /* eslint-disable local-rules/jquery-replacements */
    if (n.h === M.RootID && !sSubMap) {
        var wrapperClass = '.mega-top-menu .drive';

        if (folderlink) {
            wrapperClass = '.mega-top-menu .root-folder';
        }
        i = escapeHTML(n.h);
        if (typeof dialog === 'undefined') {

            // Clear folder link tree pane
            if (!folderlink && rebuild
                && (node = document.querySelector('.mega-top-menu .root-folder .content-panel.cloud-drive ul'))) {
                node.remove();
            }

            if (rebuild || $('.content-panel.cloud-drive ul').length === 0) {
                $(`${wrapperClass} .content-panel.cloud-drive .tree`)
                    .safeHTML(`<ul id="treesub_${i}"></ul>`);
            }
        }
        else {
            $('.' + dialog + ' .cloud-drive .dialog-content-block').html('<ul id="mctreesub_' + i + '"></ul>');
        }
    }
    else if (inshares) {
        if (typeof dialog === 'undefined') {
            $('.content-panel.shared-with-me').html('<ul id="treesub_shares"></ul>');
        }
        else {
            $('.' + dialog + ' .shared-with-me .dialog-content-block').html('<ul id="mctreesub_shares"></ul>');
        }
        stype = "shared-with-me";
    }
    // else if (outshares) {
    //     $('.content-panel.out-shares').html('<ul id="treesub_os_out-shares"></ul>');
    //     stype = "out-shares";
    //     cvtree = M.getOutShareTree();
    // }
    // else if (publiclinks) {
    //     $('.content-panel.public-links').html('<ul id="treesub_pl_public-links"></ul>');
    //     stype = "public-links";
    //     cvtree = M.getPublicLinkTree();
    // }
    // else if (n.h === M.RubbishID) {
    //     if (typeof dialog === 'undefined') {
    //         $('.content-panel.rubbish-bin').html('<ul id="treesub_' + escapeHTML(M.RubbishID) + '"></ul>');
    //     }
    //     else {
    //         $('.' + dialog + ' .rubbish-bin .dialog-content-block')
    //             .html('<ul id="mctreesub_' + escapeHTML(M.RubbishID) + '"></ul>');
    //     }
    //     stype = "rubbish-bin";
    // }
    else if (n.h === 's4' && 'utils' in s4) {
        s4.utils.renderContainerTree(dialog, sSubMap);
        stype = 's4';
    }
    /* eslint-enable local-rules/jquery-replacements */

    prefix = stype;
    // Detect copy and move dialogs, make sure that right DOMtree will be sorted.
    // copy and move dialogs have their own trees and sorting is done independently
    if (dialog) {
        if ($.copyDialog) {
            prefix = 'Copy' + stype;
        }
        else if ($.moveDialog) {
            prefix = 'Move' + stype;
        }
        else if ($.selectFolderDialog) {
            prefix = 'SelectFolder' + stype;
        }
        else if ($.saveAsDialog) {
            prefix = 'SaveAs' + stype;
        }
    }

    const btd = d > 2;
    if (btd) {
        console.group('BUILDTREE for "' + n.h + '"');
    }

    if (n.h && n.h.indexOf('os_') === 0) {
        treeType = 'os';
        n.h = n.h.substr(3);
    }
    else if (n.h && n.h.indexOf('pl_') === 0) {
        treeType = 'pl';
        n.h = n.h.substr(3);
    }

    var tree = this.tree[n.h] || cvtree;

    if (tree) {
        folders = obj_values(tree);

        if (inshares) {
            folders = folders
                .filter(function(n) {
                    return !M.d[n.p];
                });
        }

        if (outshares || publiclinks) {
            // Remove child duplication on the tree.
            folders = folders
                .filter(function(n) {
                    var folderParents = {};
                    while (n && n.p !== M.RootID) {
                        folderParents[n.p] = 1;
                        n = M.d[n.p];
                    }

                    for (var i in folders) {
                        if (folderParents[folders[i].h]) {
                            return false;
                        }
                    }
                    return true;
                });
        }

        if (btd) {
            console.debug('Building tree', folders.map(function(n) {
                return n.h
            }));
        }

        const stp = prefix === 'cloud-drive' && folderlink ? 'folder-link' : prefix;
        const sortDirection = Object(M.sortTreePanel[stp]).dir || 1;
        let sortFn = M.getSortByNameFn2(sortDirection);

        switch (Object(M.sortTreePanel[stp]).by) {
            case 'fav':
                sortFn = M.sortByFavFn(sortDirection);
                break;
            case 'created':
                var type;

                if (outshares || publiclinks) {
                    type = stype;
                }

                sortFn = function (a, b) {
                    return M.getSortByDateTimeFn(type)(a, b, sortDirection);
                };
                break;
            case 'label':
                sortFn = M.sortByLabelFn(sortDirection, true);
                break;
        }

        folders.sort(sortFn);

        // In case of copy and move dialogs
        if (typeof dialog !== 'undefined') {
            _a = 'mctreea_';
            _li = 'mctreeli_';
            _sub = 'mctreesub_';
        }

        // Special prefixs for Out-shares and Public links
        var typefix = '';

        if (stype === 'out-shares' || treeType === 'os') {
            _a += 'os_';
            _li += 'os_';
            _sub += 'os_';
            typefix = 'os_';
        }
        else if (stype === 'public-links' || treeType === 'pl') {
            _a += 'pl_';
            _li += 'pl_';
            _sub += 'pl_';
            typefix = 'pl_';
        }

        if (folders.length && (node = document.getElementById(_a + n.h))) {
            // render > if new folders found on an empty folder
            if (!node.classList.contains('contains-folders')) {
                node.classList.add('contains-folders');
            }
        }

        const tn = fmconfig.treenodes || Object.create(null);
        const dn = $.openedDialogNodes || Object.create(null);

        for (var idx = 0; idx < folders.length; idx++) {
            buildnode = false;
            curItemHandle = folders[idx].h;
            containsc = this.tree[curItemHandle]
                && Object.values(this.tree[curItemHandle]).some(mega.sensitives.shouldShowInTree) || '';
            name = folders[idx].name;

            if (folders[idx].t & M.IS_S4CRT) {
                continue;
            }

            if (curItemHandle === M.RootID || tn[typefix + curItemHandle] || dialog && dn[curItemHandle]) {

                if (containsc) {
                    buildnode = true;
                }
                else {
                    fmtreenode(typefix + curItemHandle, false);
                }
            }

            if ((node = document.getElementById(_li + curItemHandle))) {

                if ((node = node.querySelector('.nw-fm-tree-item'))) {

                    if (containsc) {
                        node.classList.add('contains-folders');
                    }
                    else {
                        node.classList.remove('contains-folders');
                    }
                }

                M.applySensitiveStatus(node, folders[idx]);
            }
            else {
                node = this.tree$tmpl.cloneNode(true);
                node.id = _li + curItemHandle;

                if (_tf) {
                    node.classList.add('tree-item-on-filter-hidden');
                }
                node = node.lastElementChild;
                if (!node) {
                    console.warn('Tree template error...', [node]);
                    continue;
                }
                node.id = _sub + curItemHandle;
                if (buildnode) {
                    node.classList.add('opened');
                }

                node = node.parentNode.firstElementChild;
                node.id = _a + curItemHandle;
                if (buildnode) {
                    node.classList.add('expanded');
                }
                if (containsc) {
                    node.classList.add('contains-folders');
                }
                if (M.currentdirid === curItemHandle) {
                    node.classList.add('opened');
                }
                if (folders[idx].t & M.IS_LINKED) {
                    node.classList.add('linked');
                }

                M.applySensitiveStatus(node, folders[idx]);

                var titleTooltip = [];
                if (folders[idx].t & M.IS_TAKENDOWN) {
                    titleTooltip.push(l[7705]);
                }
                if (missingkeys[curItemHandle]) {
                    node.classList.add('undecryptable');
                    titleTooltip.push(M.getUndecryptedLabel(folders[idx]));
                    name = l[8686];
                }
                if (titleTooltip.length) {
                    node.setAttribute('title', titleTooltip.map(escapeHTML).join("\n"));
                }

                if (folders[idx].lbl) {
                    var labelClass = M.getLabelClassFromId(folders[idx].lbl);

                    if (!labelClass) {
                        console.error('Invalid label %s for %s (%s)', folders[idx].lbl, curItemHandle, name);
                    }
                    else {
                        node.classList.add('labeled');
                        var nodeLabel = node.querySelector('.colour-label-ind');
                        nodeLabel.classList.add(labelClass);
                        nodeLabel.classList.remove('hidden');
                    }
                }
                node = node.querySelector('.nw-fm-tree-folder');

                if (folders[idx].s4 || M.tree.s4 && M.tree.s4[folders[idx].p]) {
                    node.className = 'nw-fm-tree-icon-wrap sprite-fm-mono icon-bucket-outline';
                }
                else if (folders[idx].su || Object(M.c.shares[curItemHandle]).su) {
                    node.classList.add('inbound-share');
                }
                else if (folders[idx].t & M.IS_SHARED) {
                    node.classList.add('shared-folder');
                }
                else if (mega.fileRequest.publicFolderExists(curItemHandle, true)) {
                    node.classList.add('file-request-folder');
                }
                else if (curItemHandle === M.CameraId) {
                    node.classList.add('camera-folder');
                }
                else if (curItemHandle === M.cf.h) {
                    node.classList.add('chat-folder');
                }
                node.textContent = name;
                html = node.parentNode.parentNode;

                if (folders[idx - 1] && !(folders[idx - 1].t & M.IS_S4CRT)
                    && (node = document.getElementById(_li + folders[idx - 1].h))) {

                    if (btd) {
                        console.debug('Buildtree, ' + curItemHandle + ' after ' + _li + folders[idx - 1].h, name);
                    }
                    $(node).after(html);
                }
                else {
                    node = document.getElementById(_sub + n.h);

                    if (idx === 0 && (i = node && node.querySelector('li:not(.s4-static-item)'))) {
                        if (btd) {
                            console.debug('Buildtree, ' + curItemHandle + ' before ' + _sub + n.h, name);
                        }
                        $(i).before(html);
                    }
                    else {
                        if (btd) {
                            console.debug('Buildtree, ' + curItemHandle + ' append ' + _sub + n.h, name);
                        }
                        $(node).append(html);
                    }
                }
            }

            if (_ts_l) {
                node = document.getElementById(_li + curItemHandle);
                if (node) {
                    if (_tf) {
                        node.classList.add('tree-item-on-filter-hidden');
                    }
                    else {
                        node.classList.remove('tree-item-on-filter-hidden');
                    }
                }
                if (name.toLowerCase().indexOf(_ts_l) === -1) {
                    if (node) {
                        node.classList.add('tree-item-on-search-hidden');
                    }
                }
                else {
                    $(document.getElementById(_a + curItemHandle))
                        .parents('li').removeClass('tree-item-on-search-hidden').each(expand)
                        .parents('ul').addClass('opened');
                }

                if (firstRun) {
                    sSubMap = this.getSearchedTreeHandles(curItemHandle, _ts_l);
                }

                buildnode = sSubMap[curItemHandle];
            }

            if (_tf && _tf[folders[idx].lbl]) {
                labelhash[curItemHandle] = true;
            }
            // need to add function for hide parent folder for color
            if (buildnode) {

                if (!_ts_l) {
                    sSubMap++;
                }
                M.buildtree(folders[idx], dialog, stype, sSubMap);
            }
        }// END of for folders loop

        for (var h in labelhash) {
            if (labelhash[h]) {
                $(document.querySelector('#' + _li + h)).removeClass('tree-item-on-filter-hidden')
                    .parents('li').removeClass('tree-item-on-filter-hidden');
            }
        }
    }

    if (btd) {
        console.groupEnd();
    }

    if (firstRun) {
        if (d) {
            console.timeEnd('buildtree');
        }

        if (_ts_l) {
            mBroadcaster.sendMessage('treesearch', _ts_l, stype);
        }
    }
};

/**
 * getSearchedTreeHandles
 *
 * Search tree of given handle and return object of subfolders that has name contains search terms,
 * Value of the result is shown how deep the subfolder is located from given parent node(handle).
 * this will return empty object if search result is empty.
 *
 * @param {String} [h] Parent node handle to starts search.
 * @param {String} [term] Search term.
 * @param {Number} [deepness] Internal use
 * @param {*} [res] internal
 * @returns {Object}
 */
MegaData.prototype.getSearchedTreeHandles = function(h, term, deepness, res) {
    "use strict";

    if (!deepness) {
        deepness = 1;
    }

    res = res || Object.create(null);

    if (!M.tree[h]) {
        return res;
    }

    if (deepness === 1) {
        term = term.toLowerCase();
    }

    const fHandles = Object.keys(M.tree[h]);

    for (let i = fHandles.length; i--;) {

        this.getSearchedTreeHandles(fHandles[i], term, deepness + 1, res);

        if (res[fHandles[i]] || String(M.tree[h][fHandles[i]].name).toLowerCase().includes(term)) {

            res[h] = deepness;
            res[fHandles[i]] = deepness + 1;
        }
    }

    return res;
};

MegaData.prototype.buildtree.FORCE_REBUILD = 34675890009;

MegaData.prototype.initTreePanelSorting = function() {
    "use strict";

    // Sorting sections for tree panels, dialogs, and per field.
    // XXX: do NOT change the order, add new entries at the tail, and ask before removing anything..
    const sections = [
        'folder-link', 'contacts', 'conversations', 'backups',
        'shared-with-me', 'cloud-drive', 'rubbish-bin',
        'out-shares', 'public-links', 's4'
    ];
    const byType = ['name', 'status', 'last-interaction', 'label', 'created', 'fav', 'ts', 'mtime'];
    const dialogs = ['Copy', 'Move', 'SelectFolder', 'SaveAs'];

    const bitmap = Object.create(null);
    this.sortTreePanel = Object.create(null);

    const store = () => {
        let res = '';
        const bitdef = Object.keys(bitmap);

        for (let i = 0; i < bitdef.length; i++) {
            const k = bitdef[i];
            const v = bitmap[k];
            const by = v.by;
            const dir = v.dir || 1;

            if (!by || by === v.byDefault && dir > 0) {
                // defaults, do not store.
                continue;
            }

            const b1 = String.fromCharCode(i);
            const b2 = String.fromCharCode(byType.indexOf(by) << 1 | (dir < 0 ? 1 : 0));

            res += b1 + b2;
        }

        mega.config.set('xtp', res.length ? res : undefined);
    };

    const validate = (p, va = ['by', 'dir']) => {
        assert(va.indexOf(p) !== -1, 'Invalid property, must be one of ' + va);
    };

    const handler = {
        get(target, prop) {
            validate(prop);

            if (Reflect.has(target, prop)) {
                return Reflect.get(target, prop);
            }
            return prop === 'by' ? target.byDefault : 1;
        },
        set(target, prop, value) {
            validate(prop);
            validate(value, prop === 'by' ? byType : [-1, 1]);

            if (Reflect.set(target, prop, value)) {
                delay('sortTreePanel:store', store, 1408);
                return true;
            }
        }
    };

    const setSortTreePanel = (type, byDefault, dialog) => {
        const key = (dialog || '') + type;

        bitmap[key] = Object.create(null);
        Object.defineProperty(bitmap[key], 'byDefault', {value: byDefault});
        Object.defineProperty(this.sortTreePanel, key, {value: new Proxy(bitmap[key], handler)});
    };

    for (let x = 0; x < sections.length; ++x) {
        const type = sections[x];
        const by = type === 'contacts' ? "status" : "name";

        setSortTreePanel(type, by);

        for (let y = 0; y < dialogs.length; ++y) {
            setSortTreePanel(type, by, dialogs[y]);
        }
    }
    Object.freeze(this.sortTreePanel);

    if (d) {
        console.info('xtp.bitmap', [bitmap]);
    }

    const xtp = mega.config.get('xtp');
    if (xtp) {
        const bitdef = Object.keys(bitmap);

        for (let i = 0; i < xtp.length; i += 2) {
            const b1 = xtp.charCodeAt(i);
            const b2 = xtp.charCodeAt(i + 1);
            const map = bitmap[bitdef[b1]];

            map.by = byType[b2 >> 1];
            map.dir = b2 & 1 ? -1 : 1;
        }
    }
};

var treesearch = false;

/**
 * redrawTree
 *
 * Re-creates tree DOM elements.
 * if f variable is true or undefined rebuild the tree.
 * if f variable is false, apply DOM update only;
 * @param {Boolean} f force rebuild.
 */

MegaData.prototype.redrawTree = function(f) {
    'use strict';

    $('li.tree-item-on-search-hidden').removeClass('tree-item-on-search-hidden');

    var force = M.buildtree.FORCE_REBUILD;
    if (f === false) {
        force = undefined;
    }

    if (M.currentrootid === M.RootID || String(M.currentdirid).match("^search/")) {
        M.buildtree(M.d[M.RootID], force);

        // Update S4 tree if user removes the container
        if (M.tree.s4) {
            M.buildtree({h: 's4'}, force);
        }
    }
    /*
    else if (M.currentrootid === M.InboxID) {
        M.buildtree(M.d[M.InboxID], force);
    }
    */
    else if (M.currentrootid === M.RubbishID) {
        M.buildtree({h: M.RubbishID}, force);
    }
    else if (M.currentrootid === 's4') {
        M.buildtree({h: 's4'}, force);
    }
    else if (M.currentrootid === 'shares') {
        M.buildtree({h: 'shares'}, force);
    }
    else if (M.currentrootid === 'out-shares') {
        M.buildtree({h: 'out-shares'}, force);
    }
    else if (M.currentrootid === 'public-links') {
        M.buildtree({h: 'public-links'}, force);
    }

    M.addTreeUIDelayed(2);
    $('.nw-fm-tree-item').noTransition(function() {
        M.onTreeUIOpen(M.currentdirid, false);
    });
};

/**
 * Check filter is available on current tree
 * @param {String} [handle] handle for what to check. if empty using currentrootid.
 * @returns boolean
 */
MegaData.prototype.checkFilterAvailable = function(handle) {
    "use strict";

    var t = this.tree;
    var result = false;
    handle = typeof handle === 'undefined' ? M.currentrootid : handle;

    $.each(t[handle], function(index, item) {
        if (item.lbl > 0) {
            result = true;
        }
        if (t[item.h] && M.checkFilterAvailable(item.h)) {
            result = true;
        }
    });
    return result;
};

/**
 * Check current viewing tree has label or not
 * @param {String} [handle] specify tree handle, if not check current tree
 * @returns boolean
 */
MegaData.prototype.isLabelExistTree = function(handle) {
    "use strict";

    handle = handle ? handle : M.currentrootid;
    var ct = M.tree[handle];

    if (handle === 'out-shares') {
        ct = M.getOutShareTree();
    }
    else if (handle === 'public-links') {
        ct = M.getPublicLinkTree();
    }

    for (var h in ct) {
        if (ct[h].lbl > 0 || (M.tree[h] && M.isLabelExistTree(h))) {
            return true;
        }
    }
    return false;
};

/**
 * Create tree of public-link's children. Same structure as M.tree
 * @return {Object}
 */
MegaData.prototype.getPublicLinkTree = function() {

    'use strict';

    var pltree = {};
    for (var h in M.su.EXP) {
        if (M.d[h].t) {
            pltree[h] = Object.assign({}, M.d[h]);
            pltree[h].t = this.getTreeValue(M.d[h]);
        }
    }
    return pltree;
};

/**
 * Create tree of out-share's children. Same structure as M.tree
 * @return {Object}
 */
MegaData.prototype.getOutShareTree = function() {

    'use strict';

    var ostree = {};
    for (var suh in M.su) {
        if (suh !== 'EXP') {
            for (var h in M.su[suh]) {
                if (M.d[h]) {
                    ostree[h] = Object.assign({}, M.d[h]);
                    ostree[h].t = this.getTreeValue(M.d[h]);
                }
            }
        }
    }
    return ostree;
};

/**
 * Get t value of custom view trees
 * @return {MegaNode} An ufs-node
 */
MegaData.prototype.getTreeValue = function(n) {

    'use strict';

    var t = n.t;
    if (n.fav) {
        t |= M.IS_FAV;
    }
    if (n.sen) {
        t |= M.IS_SEN;
    }
    if (M.su.EXP && M.su.EXP[n.h]) {
        t |= M.IS_LINKED;
    }
    if (M.getNodeShareUsers(n, 'EXP').length || M.ps[n.h]) {
        t |= M.IS_SHARED;
    }
    if (M.getNodeShare(n).down === 1) {
        t |= M.IS_TAKENDOWN;
    }
    return t;
};

/**
 * Initializes tree panel
 */
MegaData.prototype.addTreeUI = function() {
    "use strict";

    if (d) {
        console.time('treeUI');
    }
    var $treePanel = $('.fm-tree-panel');
    var $treeItem = $('.nw-fm-tree-item', $treePanel);

    if (!folderlink) {
        $treeItem.draggable(
            {
                revert: true,
                containment: 'document',
                revertDuration: 200,
                distance: 10,
                scroll: false,
                cursorAt: {right: 88, bottom: 58},
                helper() {
                    $(this).draggable("option", "containment", [72, 42, $(window).width(), $(window).height()]);
                    return M.getDDhelper();
                },
                start(e) {
                    $.treeDragging = true;
                    $.hideContextMenu(e);
                    var html = '';
                    var id = $(e.target).attr('id');
                    if (id) {
                        id = id.replace(/treea_+|(os_|pl_)/g, '');
                    }
                    if (id && M.d[id]) {
                        html = ('<div class="tree-item-dragger nw-fm-tree-item">' +
                                '<span class="nw-fm-tree-folder ' + fileIcon(M.d[id]) + '"></span>' +
                                '<span class="item-name">' +
                                    escapeHTML(M.d[id].name) + '</span>' +
                                '</div>'
                        );
                    }
                    $('#draghelper .dragger-icon').remove();

                    // eslint-disable-next-line local-rules/jquery-replacements
                    $('#draghelper .dragger-content').html(html);
                    $('body').addClass('dragging');
                    $.draggerHeight = $('#draghelper .dragger-content').outerHeight();
                    $.draggerWidth = $('#draghelper .dragger-content').outerWidth();
                },
                drag(e, ui) {
                    if (ui.position.top + $.draggerHeight - 28 > $(window).height()) {
                        ui.position.top = $(window).height() - $.draggerHeight + 26;
                    }
                    if (ui.position.left + $.draggerWidth - 58 > $(window).width()) {
                        ui.position.left = $(window).width() - $.draggerWidth + 56;
                    }
                },
                stop() {
                    $.treeDragging = false;
                    $('body').removeClass('dragging').removeClassWith("dndc-");
                }
            });

        $(
            '.fm-tree-panel .nw-fm-tree-item,' +
            '.js-myfile-tree-panel > a[name="cloud-drive"],' +
            '.mega-top-menu button[name="s4"],' +
            '.mega-top-menu a[name="rubbish-bin"],' +
            '.shared-with-me tr,' +
            '.nw-conversations-item,' +
            'ul.conversations-pane > li,' +
            '.messages-block'
        ).filter(":visible").droppable({
            tolerance: 'pointer',
            drop(e, ui) {
                $.doDD(e, ui, 'drop', 1);
            },
            over(e, ui) {
                $.doDD(e, ui, 'over', 1);
            },
            out(e, ui) {
                $.doDD(e, ui, 'out', 1);
            }
        });
    }

    $treeItem.rebind('click.treeUI contextmenu.treeUI', function(e) {

        var $this = $(this);
        var id = $this.attr('id').replace('treea_', '');
        var tmpId = id;
        var cv = M.isCustomView(id);
        const eid = $this.attr('data-eventid');

        id = cv ? cv.nodeID : id;

        if (e.type === 'contextmenu') {
            $('.nw-fm-tree-item').removeClass('dragover');
            $this.addClass('dragover');

            var $uls = $this.parents('ul').find('.selected');

            if ($uls.length > 1) {
                $.selected = $uls.attrs('id')
                    .map(function(id) {
                        return id.replace(/treea_+|(os_|pl_|device-centre_)/g, '');
                    });
            }
            else {
                $.selected = [id];

                Soon(function() {
                    $this.addClass('hovered');
                });
            }
            return !!M.contextMenuUI(e, 1);
        }

        var $target = $(e.target);
        if ($target.hasClass('nw-fm-tree-arrow')) {
            M.onTreeUIExpand(tmpId);
        }
        else if (e.shiftKey) {
            $this.addClass('selected');
        }
        else {
            if ($target.hasClass('opened')) {
                M.onTreeUIExpand(tmpId);
            }
            if (e.ctrlKey) {
                $.ofShowNoFolders = true;
            }

            id = cv ? cv.prefixPath + id : id;

            if (M.dyh && cv && cv.type === 's4' && cv.subType !== 'container') {
                id = M.dyh('folder-id', id);
            }

            $.hideTopMenu();
            M.openFolder(id, e.ctrlKey)
                .then(() => {
                    // If the side Info panel is visible, update the information in it
                    if (!cv) {
                        mega.ui.mInfoPanel.reRenderIfVisible([id]);
                    }
                });
        }

        if (eid) {
            eventlog(eid);
        }

        return false;
    });

    /**
     * Let's shoot two birds with a stone, when nodes are moved we need a resize
     * to let dynlist refresh - plus, we'll implicitly invoke initTreeScroll.
     */
    $(window).trigger('resize');

    if (d) {
        console.timeEnd('treeUI');
    }
};

/**
 * Invokes debounced tree panel initialization.
 */
MegaData.prototype.addTreeUIDelayed = function(ms) {
    'use strict';

    delay('treeUI', function() {
        M.addTreeUI();
    }, ms || 30);
};

/**
 * Handles expanding of tree panel elements.
 * @param {String} id An ufs-node's handle
 * @param {Boolean} [force]
 */
MegaData.prototype.onTreeUIExpand = function(id, force) {
    "use strict";

    this.buildtree({h: id});

    var $tree = $('#treea_' + id);

    if ($tree.hasClass('expanded') && !force) {
        fmtreenode(id, false);
        $('#treesub_' + id).removeClass('opened');
        $tree.removeClass('expanded');
    }
    else if ($tree.hasClass('contains-folders')) {
        fmtreenode(id, true);
        $('#treesub_' + id).addClass('opened')
            .find('.tree-item-on-search-hidden')
            .removeClass('tree-item-on-search-hidden');
        $tree.addClass('expanded');
    }

    M.addTreeUIDelayed();
};

/**
 * Handles opening of tree panel elemement.
 * @param {String} id An ufs-node's handle
 * @param {Object} [event] Event triggering action
 * @param {Boolean} [ignoreScroll] Whether scroll element into view.
 */
MegaData.prototype.onTreeUIOpen = function(id, event, ignoreScroll) {
    "use strict";

    id = String(id);
    const cv = M.isCustomView(id);
    var id_r = this.getNodeRoot(id);
    var id_s = id.split('/')[0];
    var target;
    var scrollTo = false;
    var stickToTop;
    if (d) {
        console.group('onTreeUIOpen', id, event, ignoreScroll);
        console.time('onTreeUIOpen');
    }

    if (id_r === 'shares') {
        this.onSectionUIOpen('shared-with-me');
    }
    else if (id_r === 's4' || cv && cv.type === 's4') {
        this.onSectionUIOpen('s4');
    }
    else if (cv) {
        this.onSectionUIOpen(id_r || id_s);
    }
    else if (id_r === this.RootID) {
        this.onSectionUIOpen('cloud-drive');
    }
    else if (id_s === 'chat') {
        this.onSectionUIOpen('conversations');
    }
    else if (id_s === 'user-management') {
        this.onSectionUIOpen('user-management');
    }
    else if (id_r === 'account') {
        this.onSectionUIOpen('account');
    }
    else if (id_r === 'dashboard') {
        this.onSectionUIOpen('dashboard');
    }
    else if (this.RubbishID && id_r === this.RubbishID) {
        this.onSectionUIOpen('rubbish-bin');
    }
    else if (id_s === 'transfers') {
        this.onSectionUIOpen('transfers');
    }
    else if (id_s === 'recents') {
        this.onSectionUIOpen('recents');
    }
    else if (id_s === mega.devices.rootId) {
        this.onSectionUIOpen(mega.devices.rootId);
    }
    else if (M.isDynPage(id_s)) {
        this.onSectionUIOpen(id_s);
    }
    else if (M.isGalleryPage(id_s)) {
        this.onSectionUIOpen(id_s);
    }

    if (!fminitialized) {
        if (d) {
            console.groupEnd();
            console.timeEnd('onTreeUIOpen');
        }
        return false;
    }

    if (!event) {
        var ids = this.getPath(id);
        let i = ids.length;
        while (i-- > 1) {
            if (this.d[ids[i]] && ids[i].length === 8) {
                this.onTreeUIExpand(ids[i], 1);
            }
        }
        if (ids[0] === this.RootID) {
            this.onSectionUIOpen('cloud-drive');
        }
    }
    if ($.hideContextMenu) {
        $.hideContextMenu(event);
    }

    const elms = document.querySelectorAll('.fm-tree-panel .nw-fm-tree-item');
    for (let i = elms.length; i--;) {

        if (elms[i].classList.contains('selected')) {
            elms[i].classList.remove('selected', 'on-gallery');
            const icon = elms[i].querySelector('.sprite-fm-mono');

            if (icon) {
                icon.className = icon.className.replace('-solid', '-outline');
            }
        }
    }

    if (cv) {
        target = document.querySelector(`#treea_${cv.prefixTree}${id.split('/')[1]}`);

        if (target && id.startsWith('discovery')) {
            target.classList.add('on-gallery');
        }

        if (cv.type === 's4') {
            let linkName = cv.containerID;

            if (cv.subType === 'bucket') {
                linkName =  cv.nodeID;
            }
            else if (['keys', 'policies', 'users', 'groups'].includes(cv.subType)) {
                linkName += `_${cv.subType}`;
            }

            target = document.getElementById(`treea_${linkName}`);

            const targetIcon = target && target.querySelector('.sprite-fm-mono');

            if (targetIcon) {
                targetIcon.className = targetIcon.className.replace('-outline', '-solid');
            }
        }
    }
    else {
        target = document.getElementById(`treea_${id_s}`);
    }

    if (target) {
        target.classList.add('selected');
        if (fmconfig.uiviewmode | 0 && fmconfig.viewmode === 2 || getFmViewMode(id) === 2) {
            target.classList.add('on-gallery');
        }
    }

    if (!ignoreScroll) {

        if (!folderlink && id === this.RootID) {
            stickToTop = false;
            scrollTo = mega.ui.topmenu.activeItem;
        }
        else if (id === id_r || id === 'recents') {
            stickToTop = true;
            scrollTo = mega.ui.topmenu.activeItem;
        }
        else if (target) {
            scrollTo = target;
        }

        const ps = scrollTo && scrollTo.closest('.ps--active-y');
        let isVisible = true;

        if (ps) {
            const t = ps.scrollTop;
            const b = t + ps.offsetHeight;
            let et = scrollTo.offsetTop;

            if (!mega.ui.topmenu.activeItem) {

                let p = scrollTo.parentElement;

                while (p && !p.classList.contains('fm-tree-panel')) {

                    if (p.tagName === 'LI') {
                        et += p.offsetTop;
                    }

                    p = p.parentElement;
                }
            }

            const eb = et + scrollTo.offsetHeight;

            stickToTop = stickToTop === undefined ? et < t : stickToTop;
            isVisible = eb <= b && et >= t;
        }

        if (ps && !isVisible) {
            setTimeout(function() {
                scrollTo.scrollIntoView(stickToTop);
            }, 50);
        }
    }

    this.addTreeUIDelayed();

    if (d) {
        console.timeEnd('onTreeUIOpen');
        console.groupEnd();
    }
};

/**
 * @param {HTMLElement} domNode DOM Element to work with
 * @param {Object} treeNode The node to work with
 * @returns {void}
 */
MegaData.prototype.applySensitiveStatus = function(domNode, treeNode) {
    'use strict';

    if (!(treeNode.t & M.IS_SEN) || pfid) {
        return;
    }

    if (mega.sensitives.showGlobally) {
        domNode.classList.add('is-sensitive');
        domNode.classList.remove('hidden-as-sensitive');
    }
    else {
        domNode.classList.add('hidden-as-sensitive');
        domNode.classList.remove('is-sensitive');
    }
};
