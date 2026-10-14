'use strict';
const SEPARATE_PROVIDERS = ['deepseek', 'gemini', 'grok'];
function channelFor(a) { return a.channel || (SEPARATE_PROVIDERS.includes(a.provider) ? 'web' : 'subscription'); }
function accountId(a) { return a.id || `${a.provider}:${channelFor(a)}`; }
function normalizeAccount(a) { return {...a, id:accountId(a), channel:channelFor(a)}; }
function findAccount(accounts, provider, channel) { return accounts.find(a => a.provider===provider && channelFor(a)===channel); }
module.exports={SEPARATE_PROVIDERS,channelFor,accountId,normalizeAccount,findAccount};
