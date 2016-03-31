export default function(appId) {
    const ids = {
        app: appId
    };
    ids.client = ids.app + '.apps.googleusercontent.com';
    
    const urls = {
        files: 'https://www.googleapis.com/drive/v2/files',
        client: 'https://apis.google.com/js/client.js',
        scope: 'https://www.googleapis.com/auth/drive.file'
    };
    
    function downloadMetadata(id) {
        const url = urls.files + '/' + id;
        return request('GET', url);
    }
    
    function downloadContents(id) {
        const url = urls.files + '/' + id + '?alt=media';
        return request('GET', url);
    }
    
    function search(options) {
        const mimeType = options.mimeType;
        const extension = options.extension;
        
        const query = "trashed=false and mimeType='" + mimeType + "'";
        const url = urls.files + '?q=' + encodeURIComponent(query);
        return searchPage(url, extension);
    }
    
    function searchPage(url, extension) {
        return request('GET', url)
        .then(function(listing) {
            const items = listing.items.filter(function(item) {
                return item.fileExtension === extension;
            })
            .map(function(item) {
                return item.id;
            });
            
            if ( 'nextLink' in listing ) {
                return searchPage(listing.nextLink, extension);
            }
            else {
                return items;
            }
        });
    }
    
    function request(method, url) {
        return authenticate()
        .then(function(token) {
            return http(method, url, {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });
        });
    }
    
    function loadScript(url) {
        return new Promise(function(resolve, reject) {
            const element = document.createElement('script');
            element.addEventListener('load', function() { resolve(); });
            element.addEventListener('error', function() { reject(); });
            element.async = true;
            element.src = url;
            document.head.appendChild(element);
        });
    }
    
    function loadGoogleApi() {
        return new Promise(function(resolve, reject) {
            loadScript(urls.client)
            .then(function() {
                gapi.load('client', { callback: function() {
                    resolve();
                }});
            })
        });
    }
    
    var accessToken = null;
    function authenticate() {
        return new Promise(function(resolve, reject) {
            if ( accessToken === null ) {
                loadAccessToken(true)
                .catch(function() {
                    return loadAccessToken(false);
                })
                .then(function(token) {
                    accessToken = token;
                    resolve(accessToken);
                });
            }
            else {
                resolve(accessToken);
            }
        });
    }
    
    function loadAccessToken(immediate) {
        return new Promise(function(resolve, reject) {
            loadGoogleApi()
            .then(function() {
                gapi.auth.authorize({
                    client_id: ids.client,
                    scope: urls.scope,
                    immediate: immediate
                }, function(result) {
                    if ( result && !result.error ) {
                        resolve(result.access_token);
                    }
                    else {
                        reject();
                    }
                });
            });
        });
    }
    
    function http(method, url, options) {
        options = options || {};
        options.headers = options.headers || {};
        
        return new Promise(function(resolve, reject) {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url);
            
            Object.keys(options.headers).forEach(function(key) {
                const value = options.headers[key];
                xhr.setRequestHeader(key, value);
            });
            
            xhr.addEventListener('load', function() {
                var response = responseFromRequest(xhr);
                resolve(response);
            });
            xhr.addEventListener('error', function(e) { reject(e); });
            xhr.addEventListener('abort', function(e) { reject(e); });
            
            xhr.send();
        });
    }
    
    function responseFromRequest(xhr) {
        var mimeTypeString = xhr.getResponseHeader('Content-Type');
        var mimeType = mimeTypeString.split(';')[0];
        if ( mimeType === 'application/json' ) {
            return JSON.parse(xhr.responseText);
        }
        else {
            return xhr.responseText;
        }
    }
        
    return {
        download: {
            metadata: downloadMetadata,
            contents: downloadContents
        },
        search: search
    };
};
