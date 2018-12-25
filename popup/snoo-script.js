let bgPage = chrome.extension.getBackgroundPage();
let config = bgPage.config;
let CLIENT_ID = config.clientId;
let COOKIE_URL = config.cookieUrl;
let COOKIE_NAME = config.cookieName;

let authBtn = document.getElementById("authBtn");

window.addEventListener('load', onLoaded);
function onLoaded() {
    authBtn.classList.add("hidden");
    refreshBtn.disabled = true;
    chrome.cookies.get({
        url: COOKIE_URL,
        name: COOKIE_NAME
    },
        cookie => {
            if (chrome.extension.lastError) {
                console.log(chrome.extension.lastError);
                authBtn.classList.remove("hidden");
            }
            if (cookie) {
                console.log("cookie present!");
                console.log(cookie);
                cookieVal = JSON.parse(cookie.value)
                loadPosts(CLIENT_ID, cookieVal.access_token, cookieVal.refresh_token);
            } else {
                authBtn.classList.remove("hidden");
            }
        });
};

authBtn.addEventListener("click", function () {
    bgPage.authorize();
    self.close();
});

function MyListItem(commentsPostUrl, teams) {
    this.listElement = null;
    this.commentsPostUrl = commentsPostUrl;
    this.teams = teams;
    this.streamPostUrl = null;
}

let postList = this.document.getElementById("posts");
let refreshBtn = document.getElementById("refreshBtn");
refreshBtn.addEventListener('click', function () {
    while (postList.childNodes.length > 0) postList.removeChild(postList.childNodes[0]);
    refreshBtn.disabled = true;
    chrome.storage.local.remove(["time", "posts"],
        () => {
            if (chrome.extension.lastError) {
                console.log(chrome.extension.lastError);
                return;
            }
            onLoaded();
        }
    );
});

function loadPosts(clientId, accessToken, refreshToken) {
    chrome.storage.local.get("time",
        lastTime => {
            if (lastTime && (new Date().getTime() - lastTime.time) < config.timeThreshold/*seconds*/ * 1000) {
                refreshBtn.disabled = false;
                loadFromStorage();
            } else {
                loadFromReddit(clientId, accessToken, refreshToken);
            }
        });
}

function loadFromReddit(clientId, accessToken, refreshToken) {
    console.log("Loading from reddit");
    const r = new snoowrap({
        userAgent: this.navigator.userAgent,
        clientId: clientId,
        accessToken: accessToken,
        refreshToken: refreshToken
    });

    r.config({ debug: config.debug });

    let listItems = [];

    r.getSubreddit('soccer').getNew().then(
        posts => forEachLoad(posts, 1),
        onError
    );

    function forEachLoad(posts, count) {
        //console.log("first post on page " + count + " is " + posts[0].title);
        for (const element of posts) {
            if (!element.title) continue;

            let title = normalize(element.title);
            if (!isMatchPost(element.title)) continue;

            // change domain from reddit.com to reddit-stream.com
            let idx = element.url.indexOf("reddit") + 6;
            let commentsPostUrl = element.url.substr(0, idx) + "-stream" + element.url.substr(idx);

            let teams = getTeams(title);
            let item = new MyListItem(commentsPostUrl, teams);
            item.listElement = displayCommentStreamPost(item);
            listItems.push(item);
        }
        if (count < config.newPageLimit) {
            posts.fetchMore({ "amount": 25, "append": false }).then(
                newposts => forEachLoad(newposts, count + 1),
                onError
            );
        } else {
            if (config.loadStreams) {
                loadStreamLinks(r, listItems);
            } else {
                setInStorage(listItems);
            }
            refreshBtn.disabled = false;
        }
    }
}

function loadStreamLinks(r, listItems) {
    let found = [];
    for (let i = 0; i < listItems.length; i++) {
        found.push(false);
    }
    r.getSubreddit('soccerstreams').getNew().then(
        posts => {
            for (const element of posts) {
                let title = normalize(element.title);
                for (let i = 0; i < listItems.length; i++) {
                    if (found[i]) continue;
                    let teams = listItems[i].teams;
                    if (title.includes(teams[0]) || title.includes(teams[1])) {
                        listItems[i].streamPostUrl = element.url;
                        found[i] = true;
                        displayStreamPost(listItems[i]);
                    }
                }
            }
            setInStorage(listItems);
        },
        onError);
}

function loadFromStorage() {
    console.log("Loading from storage");
    chrome.storage.local.get("posts",
        results => {
            if (chrome.extension.lastError) {
                console.log(chrome.extension.lastError);
                return;
            }
            let parsed = JSON.parse(results.posts);
            for (let i = 0; i < parsed.length; i++) {
                let item = new MyListItem(parsed[i].commentsPostUrl, parsed[i].teams);
                if (parsed[i].streamPostUrl) item.streamPostUrl = parsed[i].streamPostUrl;
                item.listElement = displayCommentStreamPost(item);
                if (config.loadStreams) displayStreamPost(item);
            }
        }
    );
}

// Serialize all fields except 'listElement' which holds the list element in html
function setInStorage(listItems) {
    chrome.storage.local.set({ time: new Date().getTime() });
    let stored = JSON.stringify(listItems, function replacer(key, value) {
        return (key == "listElement") ? undefined : value;
    });
    chrome.storage.local.set({
        posts: stored
    },
        () => {
            if (chrome.extension.lastError) {
                console.log(chrome.extension.lastError);
                return;
            }
            console.log("Storage done")
        }
    );
}

// Remove accented characters
// Change to lower case
// Trim
function normalize(title) {
    return title.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().trim();
}

function anchorToTab(anchor) {
    anchor.onclick = function () {
        chrome.tabs.create({ active: true, url: anchor.href });
    };
}

function displayCommentStreamPost(item) {
    let postElement = this.document.createElement('li');
    //postElement.textContent = item.teams[0] + " | " + item.teams[1] + " ";

    let anchor = document.createElement('a');
    anchor.setAttribute("href", item.commentsPostUrl);
    anchor.text = item.teams[0] + " | " + item.teams[1];
    anchorToTab(anchor);
    postElement.appendChild(anchor);
    postList.appendChild(postElement);
    return postElement;
}

function displayStreamPost(item) {
    if (!item.streamPostUrl) return;
    let anchor = document.createElement('a');
    anchor.setAttribute("href", item.streamPostUrl);
    anchor.text = "Streams";
    anchorToTab(anchor);
    item.listElement.append(" ");
    item.listElement.appendChild(anchor);
}

function onError(error) {
    console.log(error);
}

function getTeams(title) {
    return [getTeam1(title), getTeam2(title)];
}

// Functions below assume title follows the pattern
// "Match thread: 'Team 1' vs. 'Team2' [League Name]"

function isMatchPost(postTitle) {
    return (postTitle.indexOf("match thread") == 0) &&
        !postTitle.includes('request') &&
        postTitle.includes('vs');
}

function getTeam1(title) {
    let tmp = title.split("vs");
    if (tmp.length < 2) return "None";
    tmp = tmp[0].split(":");
    if (tmp.length < 2) return tmp[0].trim();
    return tmp[1].trim();
}

function getTeam2(title) {
    let tmp = title.split("vs");
    if (tmp.length < 2) return "None";
    tmp = tmp[1].split("[");
    //if (tmp.length < 2) return "None";
    tmp = tmp[0].trim();
    if (tmp[0] == '.') tmp = tmp.substr(1);
    return tmp.trim();
}