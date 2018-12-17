function loadPosts(clientId, refreshToken) {
    let XHR = new XMLHttpRequest();

    // let urlEncodedDataPairs = [];
    // urlEncodedDataPairs.push('grant_type', 'authorization_code');
    // urlEncodedDataPairs.push('code', code);
    // urlEncodedDataPairs.push('redirect_uri', REDIRECT_URI);

    XHR.addEventListener('load', event => {
        console.log("got account info");
        console.log(XHR.response);
    });

    XHR.addEventListener("error", event => {
        console.log("error in getting account info");
        console.log(XHR.response);
    });

    XHR.open('GET', 'https://oauth.reddit.com/api/v1/me')

    XHR.setRequestHeader("Authorization", "bearer " + refreshToken);
    XHR.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    let urlEncodedData = '';
    /*urlEncodedData += 'grant_type=authorization_code' +
        '&code=' + code +
        '&redirect_uri=' + REDIRECT_URI;*/
    XHR.send(urlEncodedData);
}