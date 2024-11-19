class MegaContextMenu extends MegaComponentGroup {
    constructor() {
        super();

        this.domNode = document.createElement('div');
        this.domNode.className = 'context-menu-items';

        this.keys = Object.keys(MegaContextMenu.menuItems);

        // build all context menu items
        for (let i = this.keys.length; i--;) {
            const key = this.keys[i];
            const menu = MegaContextMenu.menuItems[key];

            const item = new MegaButton({
                text: menu.text,
                icon: menu.icon,
                type: 'fullwidth',
                parentNode: this.domNode,
                componentClassname: `text-icon ${key.replace('.', '')}`
            });

            item.on('click', () => menu.onClick(this.handle));

            this.addChild(key, item);
        }
    }

    /**
     * Build menu items and show context menu dialog
     *
     * @param {Object} options Options for the context menu
     * @returns {void}
     */
    show(options) {
        this.name = options.name;
        if (options.handle) {
            this.handle = options.handle;
        }
        const menuItems = Object.create(null);

        if (this.name === 'item-detail-menu') {
            menuItems['.edit-item'] = 1;
            menuItems['.delete-item'] = 1;
        }
        else if (this.name === 'item-list-menu') {
            menuItems['.copy-password'] = 1;
            const node = M.getNodeByHandle(this.handle);
            if (node && node.pwm.u) {
                menuItems['.copy-username'] = 1;
            }
            if (node && node.pwm.url) {
                menuItems['.launch-website'] = 1;
            }
            menuItems['.edit-item'] = 1;
            menuItems['.delete-item'] = 1;
        }
        else if (this.name === 'avatar-menu') {
            menuItems['.logout'] = 1;
            menuItems['.settings'] = 1;
        }

        for (let i = this.keys.length; i--;) {
            const key = this.keys[i];
            const item = this.domNode.querySelector(key);

            // if the context menu has the key then remove hidden class to show the item
            item.classList[menuItems[key] ? 'remove' : 'add']('hidden');
        }

        let contents = [this.domNode];

        if (options.parentNode) {
            options.parentNode.append(...contents);
            contents = [options.parentNode];
        }

        mega.ui.menu.show({
            ...options,
            contents
        });
    }
}

(mega => {
    "use strict";

    lazy(mega.ui, 'contextMenu', () => new MegaContextMenu());

    lazy(MegaContextMenu, 'menuItems', () => {
        return {
            '.delete-item': {
                text: l.delete_item,
                icon: 'sprite-pm-mono icon-trash-thin-outline',
                onClick: () => {
                    if (mega.pm.validateUserStatus()) {
                        mega.ui.pm.delete.showConfirm();
                        eventlog(500545);
                    }
                }
            },
            '.edit-item': {
                text: l.edit_item,
                icon: 'sprite-pm-mono icon-edit-thin-outline',
                onClick: () => {
                    if (!mega.ui.passform) {
                        mega.ui.passform = new PasswordItemForm();
                    }

                    mega.ui.passform.show({
                        type: 'update'
                    });
                    eventlog(500544);
                }
            },
            '.launch-website': {
                text: "Launch website",
                icon: 'sprite-pm-mono icon-external-link-thin-outline',
                onClick: (nodeHandle) => {
                    const node = M.getNodeByHandle(nodeHandle);
                    const {url} = node.pwm;
                    window.open(/^https?:\/\//i.test(url) ? url : `https://${url}`, '_blank', 'noopener,noreferrer');
                    eventlog(500543);
                }
            },
            '.copy-username': {
                text: "Copy username",
                icon: 'sprite-pm-mono icon-copy-user-thin-outline',
                onClick: (nodeHandle) => {
                    const node = M.getNodeByHandle(nodeHandle);
                    mega.ui.pm.utils.copyPMToClipboard(node.pwm.u, l.username_copied);
                    eventlog(500542);
                }
            },
            '.copy-password': {
                text: l[19601],
                icon: 'sprite-pm-mono icon-copy-password-thin-outline',
                onClick: (nodeHandle) => {
                    const node = M.getNodeByHandle(nodeHandle);
                    mega.ui.pm.utils.copyPMToClipboard(node.pwm.pwd, l[19602]);
                    eventlog(500541);
                }
            },
            '.logout': {
                text: 'Log out',
                icon: 'sprite-pm-mono icon-log-out-thin-outline',
                onClick: async() => {
                    const content = await mega.ui.pm.recoveryLogout.init();

                    mega.ui.overlay.show({
                        name: 'recoverykey-logout-overlay',
                        navImage: 'left-icon sprite-fm-illustration-wide img-mega-logo sk-elm icon-size-80',
                        showClose: true,
                        centered: true,
                        classList: ['logout-overlay', 'with-top-nav'],
                        icon: 'bell',
                        title: l.logout_before,
                        contents: [content]
                    });

                    mega.ui.overlay.one('close.overlay', () => {
                        mega.ui.overlay.removeClass('logout-overlay', 'with-top-nav');
                    });
                }
            },
            '.settings': {
                text: 'Settings',
                icon: 'sprite-pm-mono icon-settings-thin-outline',
                onClick: () => {
                    // TODO: Implement settings
                }
            }
        };
    });

})(window.mega);
