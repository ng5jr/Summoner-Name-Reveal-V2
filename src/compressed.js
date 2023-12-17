const API_HEADERS={accept:"application/json","content-type":"application/json"};async function create(a,b,c){const d={method:a,headers:API_HEADERS,...(c?{body:JSON.stringify(c)}:void 0)};try{const a=await fetch(b,d);if(!a.ok)throw new Error(`HTTP error! status: ${a.status}`);return await a.json()}catch(c){return console.error(`Error in create function for ${a} ${b}: ${c}`),null}}const delay=a=>new Promise(b=>setTimeout(b,a));function romanToNumber(a){const b={I:1,V:5,X:10,L:50,C:100,D:500,M:1e3};let c=0,d=0;for(let e=a.length-1;0<=e;e--){const f=b[a[e]];c+=f<d?-f:f,d=f}return c}function sumArrayElements(a){return Array.isArray(a)?a.reduce((a,b)=>a+b,0):(console.error("Expected an array, received:",a),0)}async function queryMatch(a,b=0,c=19){try{const d=await create("GET",`/lol-match-history/v1/products/lol/${a}/matches?begIndex=${b}&endIndex=${c}`),e=d.games.games;return!!Array.isArray(e)&&extractMatchData(e)}catch(b){return console.error("Error querying match for puuid:",a,b),!1}}function extractMatchData(a){const b={gameMode:[],championId:[],killList:[],deathsList:[],assistsList:[],Minions:[],gold:[],winList:[],causedEarlySurrenderList:[],laneList:[],spell1Id:[],spell2Id:[],items:[],types:[]};return a.forEach(a=>{const c=a.participants[0];b.gameMode.push(a.queueId),b.championId.push(c.championId),b.killList.push(c.stats.kills),b.deathsList.push(c.stats.deaths),b.assistsList.push(c.stats.assists),b.Minions.push(c.stats.neutralMinionsKilled+c.stats.totalMinionsKilled),b.gold.push(c.stats.goldEarned),b.winList.push(c.stats.win?"true":"false"),b.causedEarlySurrenderList.push(c.stats.causedEarlySurrender),b.laneList.push(c.timeline.lane),b.spell1Id.push(c.spell1Id),b.spell2Id.push(c.spell2Id);const d=[];for(let b=0;7>b;b++){const a="item"+b,e=c.stats[a];d.push(e)}b.items.push(d),b.types.push(a.gameType)}),b}async function getMatchDataForPuuids(a){try{const b=a.map(a=>queryMatch(a,0,21));return await Promise.all(b)}catch(a){return console.error("Error fetching match data for multiple PUUIDs:",a),[]}}async function fetchRankedStats(a){try{return await create("GET",`/lol-ranked/v1/ranked-stats/${a}`)}catch(b){return console.error("Error fetching ranked stats for puuid:",a,b),null}}async function getRankedStatsForPuuids(a){try{const b=await Promise.all(a.map(fetchRankedStats));return b.map(extractSimplifiedStats)}catch(a){return console.error("Error fetching ranked stats for multiple PUUIDs:",a),[]}}function extractSimplifiedStats(a){if(!a||!a.queueMap)return"Unranked";const b=a.queueMap.RANKED_SOLO_5x5,c=a.queueMap.RANKED_FLEX_SR;return determineRank(b,c)}function determineRank(a,b){return isValidRank(a)?formatRank(a):isValidRank(b)?formatRank(b):"Unranked"}function isValidRank(a){return a&&a.tier&&a.division&&"NA"!==a.tier&&!a.isProvisional}function formatRank(a){return["IRON","BRONZE","SILVER","GOLD","PLATINUM","EMERALD","DIAMOND"].includes(a.tier)?`${a.tier[0]}${romanToNumber(a.division)}`:a.tier}fetchRankedStats,getRankedStatsForPuuids;async function getChampionSelectChatInfo(){try{const a=await create("GET","/lol-chat/v1/conversations");return a?a.find(a=>"championSelect"===a.type):null}catch(a){return console.error("Error fetching champion select chat info:",a),null}}async function postMessageToChat(a,b){try{await create("POST",`/lol-chat/v1/conversations/${a}/messages`,{body:b,type:"celebration"})}catch(b){console.error(`Error posting message to chat ${a}:`,b)}}async function getMessageFromChat(a){try{await create("GET",`/lol-chat/v1/conversations/${a}/messages`)}catch(b){console.error(`Error getting messages from chat ${a}:`,b)}}getChampionSelectChatInfo,postMessageToChat,getMessageFromChat;async function observeQueue(a){try{const b=initializeWebSocket();b.onopen=()=>subscribeToGameFlow(b),b.onmessage=a,b.onerror=a=>{console.error("WebSocket Error:",a)}}catch(a){console.error("Error observing game queue:",a)}}function initializeWebSocket(){const a=getWebSocketURI();return new WebSocket(a,"wamp")}function getWebSocketURI(){const a=document.querySelector("link[rel=\"riot:plugins:websocket\"]");if(!a)throw new Error("WebSocket link element not found");return a.href}function subscribeToGameFlow(a){"/lol-gameflow/v1/gameflow-phase".replaceAll("/","_");a.send(JSON.stringify([5,"OnJsonApiEvent_lol-gameflow_v1_gameflow-phase"]))}async function handleChampionSelect(){try{await delay(5e3);const a=await create("GET","/riotclient/region-locale"),b=a.webRegion,c=await getChampionSelectChatInfo();if(!c)return;const d=await create("GET","//riotclient/chat/v5/participants"),e=d.participants.filter(a=>a.cid.includes("champ-select")),f=e.map(a=>a.puuid),g=await getMatchDataForPuuids(f),h=await getRankedStatsForPuuids(f),i=e.map((a,b)=>formatPlayerData(a,h[b],g[b]));for(const a of i)await postMessageToChat(c.id,a);const j=e.map(a=>encodeURIComponent(`${a.game_name}#${a.game_tag}`)).join("%2C");await postMessageToChat(c.id,`https://www.op.gg/multisearch/${b}?summoners=${j}`)}catch(a){console.error("Error in Champion Select phase:",a)}}function formatPlayerData(a,b,c){const d=calculateWinRate(c.winList),e=mostCommonRole(c.laneList),f=calculateKDA(c.killList,c.assistsList,c.deathsList);return`${a.game_name} - ${b} - ${d} - ${e} - ${f}`}async function updateLobbyState(a){try{const b=JSON.parse(a.data);"ChampSelect"===b[2].data&&(await handleChampionSelect())}catch(a){console.error("Error updating lobby state:",a)}}function calculateWinRate(a){if(!a||0===a.length)return"N/A";const b=a.filter(a=>"true"===a).length,c=a.length;return`${(100*(b/c)).toFixed(2)}%`}function mostCommonRole(a){if(!a)return"N/A";const b=a.reduce((a,b)=>(a[b]=(a[b]||0)+1,a),{});let c=0,d=[];for(const e in b)b[e]>c?(d=[e],c=b[e]):b[e]===c&&d.push(e);return d.join("/")}function calculateKDA(a,b,c){const d=sumArrayElements(a.map(a=>"string"==typeof a?a.split(",").map(Number):[a]).flat()),e=sumArrayElements(b.map(a=>"string"==typeof a?a.split(",").map(Number):[a]).flat()),f=sumArrayElements(c.map(a=>"string"==typeof a?a.split(",").map(Number):[a]).flat());let g=0===f?"PERFECT":((d+e)/f).toFixed(2);return`${g} KDA`}async function initializeApp(){try{await observeQueue(updateLobbyState)}catch(a){console.error("Error initializing application:",a)}}window.addEventListener("load",initializeApp);
