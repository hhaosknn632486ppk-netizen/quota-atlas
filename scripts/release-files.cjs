'use strict';
const modules='accounts activity-state alert-policy announcements claude codex demo domain events gap-recovery notification-delivery local-paths provider-api public-posts public-timing service source-health sources store vault web-quota workbuddy'.split(' ').map(n=>'app/lib/'+n+'.cjs');
const app=[...modules,'app/main.cjs','app/preload.cjs','app/package.json','app/install-shortcut.cjs',...'companion.js i18n.js icon.png index.html renderer.js styles.css upgrade.css widget.css widget.html widget.js'.split(' ').map(n=>'app/ui/'+n)];
const docs='start.cmd start.ps1 install.cmd install.ps1 update.cmd path-safety.ps1 uninstall.cmd uninstall.ps1 PRIVACY.txt SUPPORT.txt README.txt README.en.txt CONNECTIONS.txt LICENSE THIRD_PARTY_NOTICES.txt'.split(' ');
module.exports={app,releaseFiles:[...app,...docs]};
