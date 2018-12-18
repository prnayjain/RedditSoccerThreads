function MyListItem(listElement, commentsPostUrl, teams) {
    this.listElement = listElement;
    this.commentsPostUrl = commentsPostUrl;
    this.teams = teams;
    streamPostUrl = null;
}

// class RedditPost {
//     //public
//     url;
//     teams;

//     constructor(url, teams) {
//         this.url = url;
//         this.teams = teams;
//     }
// }

// Remove accented characters
// Change to lower case
// Trim
function normalize(title) {
    return title.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().trim();
}

function loadPosts(clientId, accessToken, refreshToken) {
    let postList = this.document.getElementById("posts");

    const r = new snoowrap({
        userAgent: this.navigator.userAgent,
        clientId: clientId,
        accessToken: accessToken,
        refreshToken: refreshToken
    });

    r.config({ debug: config.debug });

    let listItems = [];

    r.getSubreddit('soccer').getNew().then(posts => {
        forEachLoad(posts, 1);
    });

    function forEachLoad(posts, count) {
        console.log("first post on page " + count + " is " + posts[0].title);
        for (const element of posts) {
            if (!element || !isMatchPost(element.title)) continue;

            let idx = element.url.indexOf("reddit") + 6;
            let streamUrl = element.url.substr(0, idx) + "-stream" + element.url.substr(idx);
            let title = normalize(element.title);
            let teams = getTeams(title);

            let postElement = this.document.createElement('li');
            //postElement.id = "Match " + (listItems.length + 1);
            postElement.textContent = teams[0] + " | " + teams[1] + " ";

            let anchor = document.createElement('a');
            anchor.setAttribute("href", streamUrl);
            anchor.text = "Comments";

            postElement.appendChild(anchor);
            postList.appendChild(postElement);

            listItems.push(new MyListItem(postElement, streamUrl, teams));
        }
        if (count < 4) {
            posts.fetchMore({ "amount": 25, "append": false }).then(
                newposts => forEachLoad(newposts, count + 1),
                error => console.log(error)
                );
        } else {
            setStreamLinks(r, listItems);
        }
    }
}

function setStreamLinks(r, listItems) {
    let found = [];
    for (let i = 0; i < listItems.length; i++) {
        found.push(false);
    }
    r.getSubreddit('soccerstreams').getNew().then(posts => {
        for (const element of posts) {
            for (let i = 0; i < listItems.length; i++) {
                if (found[i]) continue;
                let teams = listItems[i].teams;
                let title = normalize(element.title);
                if (title.includes(teams[0]) && title.includes(teams[1])) {
                    let anchor = document.createElement('a');
                    anchor.setAttribute("href", element.url);
                    anchor.text = "Streams";
                    listItems[i].listElement.append(" ");
                    listItems[i].listelem.appendChild(anchor);
                    listItems[i].streamPostUrl = element.url;
                    found[i] = true;
                }
            }
        }
    });
}

function getTeams(title) {
    return [getTeam1(title), getTeam2(title)];
}

// Functions below assume title follows the pattern
// "Match thread: 'Team 1' vs. 'Team2' [League Name]"

function isMatchPost(postTitle) {
    if (!postTitle) return false;
    postTitle = normalize(postTitle);
    return (postTitle.indexOf("match thread") == 0) &&
        /*!postTitle.includes('request') &&*/
        postTitle.includes('vs');
}

function getTeam1(title) {
    // let tmp = title.split("vs");
    // if (tmp.length < 2) return "None";
    // tmp = tmp[0].split("]");
    // if (tmp.length < 2) return "None";
    // return tmp[1].trim();
    let tmp = title.split("vs");
    if (tmp.length < 2) return "None";
    tmp = tmp[0].split(":");
    if (tmp.length < 2) return "None";
    return tmp[1].trim();
}

function getTeam2(title) {
    // let tmp = title.split("vs");
    // if (tmp.length < 2) return "None";
    // return tmp[1].trim();

    let tmp = title.split("vs");
    if (tmp.length < 2) return "None";
    tmp = tmp[1].split("[");
    if (tmp.length < 2) return "None";
    tmp = tmp[0].trim();
    if (tmp[0] == '.') tmp = tmp.substr(1);
    return tmp.trim();
}