let CLIENT_ID = config.clientId;
let REDIRECT_URI = "http://lvh.me"
document.getElementById("authBtn").addEventListener("click", function () {
    let RANDOM_STRING = Math.random().toString(36).substring(2);
    let authorize = browser.identity.launchWebAuthFlow(
        {
            url: "https://www.reddit.com/api/v1/authorize?" +
                "client_id=" + CLIENT_ID +
                "&response_type=code" +
                "&state=" + RANDOM_STRING +
                "&redirect_uri=http://lvh.me" +
                "&duration=permanent" +
                "&scope=identity+read",
            interactive: true
        }
    );
    authorize.then(
        url => {
            console.log("I got the code!")
            let state = url.slice(url.indexOf("state") + 6, url.indexOf("&"));
            if (state == RANDOM_STRING) {
                let code = url.substr(url.lastIndexOf("=") + 1);

                console.log("going to get access token");
                let XHR = new XMLHttpRequest();

                // let urlEncodedDataPairs = [];
                // urlEncodedDataPairs.push('grant_type', 'authorization_code');
                // urlEncodedDataPairs.push('code', code);
                // urlEncodedDataPairs.push('redirect_uri', REDIRECT_URI);

                XHR.addEventListener('load', event => {
                    console.log("got access token");
                    let responseObject = JSON.parse(XHR.response);
                    let btn = document.getElementById("authBtn");
                    btn.style.visibility = 'hidden';
                    console.log(CLIENT_ID);
                    console.log(responseObject);
                    loadPosts(CLIENT_ID, responseObject["access_token"], responseObject["refresh_token"]);
                });

                XHR.addEventListener("error", event => {
                    console.log("error in getting access token");
                    console.log(XHR.response);
                });

                XHR.open('POST', 'https://www.reddit.com/api/v1/access_token')

                XHR.setRequestHeader("Authorization", "Basic " + btoa(CLIENT_ID + ":"));
                XHR.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

                let urlEncodedData = 'grant_type=authorization_code' +
                    '&code=' + code +
                    '&redirect_uri=' + REDIRECT_URI;
                XHR.send(urlEncodedData);
            } else {
                alert("state parameter was not same");
            }
        },
        console.log
    );
})