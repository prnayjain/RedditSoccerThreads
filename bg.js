var config = {
    clientId: "PsIWMnWm10vVvA",
    debug: true,
    newPageLimit: 5,
    timeThreshold: 0/*seconds*/,
    loadStreams: true,
    cookieUrl: "https://oauth.reddit.com/",
    cookieName: "tokens"
}

let REDIRECT_URI = chrome.identity.getRedirectURL();
let COOKIE_URL = config.cookieUrl;
let COOKIE_NAME = config.cookieName;
let CLIENT_ID = config.clientId;

function log(msg) {
    if (config.debug) {
        console.log(msg);
    }
}

function authorize() {
    let RANDOM_STRING = Math.random().toString(36).substring(2);
    chrome.identity.launchWebAuthFlow({
        url: "https://www.reddit.com/api/v1/authorize?" +
            "client_id=" + CLIENT_ID +
            "&response_type=code" +
            "&state=" + RANDOM_STRING +
            "&redirect_uri=" + REDIRECT_URI +
            "&duration=permanent" +
            "&scope=identity+read",
        interactive: true
    },
        url => {
            if (chrome.extension.lastError) {
                log(chrome.extension.lastError);
                return;
            }
            log("I got the code!");
            let state = url.slice(url.indexOf("state") + 6, url.indexOf("&"));
            if (state == RANDOM_STRING) {
                let code = url.substr(url.lastIndexOf("=") + 1);

                log("going to get access token");
                let XHR = new XMLHttpRequest();
                XHR.addEventListener('load', event => {
                    log("got access token");
                    let responseObject = JSON.parse(XHR.response);
                    //let btn = document.getElementById("authBtn");
                    //btn.style.visibility = 'hidden';

                    chrome.cookies.set({
                        url: COOKIE_URL,
                        name: COOKIE_NAME,
                        value: JSON.stringify({
                            access_token: responseObject["access_token"],
                            refresh_token: responseObject["refresh_token"]
                        })
                    },
                        () => {
                            if (chrome.extension.lastError) {
                                log("Couldnt save tokens");
                                log(error);
                            }
                        }
                    );
                    //loadPosts(CLIENT_ID, responseObject["access_token"], responseObject["refresh_token"]);
                });

                XHR.addEventListener("error", event => {
                    log("error in getting access token");
                    log(XHR.response);
                });

                XHR.open('POST', 'https://www.reddit.com/api/v1/access_token')

                XHR.setRequestHeader("Authorization", "Basic " + btoa(CLIENT_ID + ":"));
                XHR.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

                let urlEncodedData = 'grant_type=authorization_code' +
                    '&code=' + code +
                    '&redirect_uri=' + REDIRECT_URI;
                XHR.send(urlEncodedData);
            } else {
                log("state parameter was not same");
            }
        }
    );
}