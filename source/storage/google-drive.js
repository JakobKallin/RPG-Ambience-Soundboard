"use strict";
function default_1(appId) {
    const ids = {
        app: appId
    };
    ids.client = ids.app + '.apps.googleusercontent.com';
    const urls = {
        files: 'https://www.googleapis.com/drive/v3/files',
        client: 'https://apis.google.com/js/client.js',
        scope: 'https://www.googleapis.com/auth/drive'
    };
    function downloadMetadata(id) {
        const url = urls.files + '/' + id + '?fields=thumbnailLink';
        return request('GET', url);
    }
    function downloadContents(id) {
        const url = urls.files + '/' + id + '?alt=media';
        return request('GET', url);
    }
    function downloadBlob(id, progress) {
        const url = urls.files + '/' + id + '?alt=media';
        return request('GET', url, { responseType: 'blob', progress: progress });
    }
    function downloadPreview(id) {
        return downloadMetadata(id).then((metadata) => {
            return metadata.thumbnailLink;
        });
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
            .then(function (listing) {
            const items = listing.files.filter(function (item) {
                const tokens = item.name.split('.');
                return tokens[tokens.length - 1] === extension;
            })
                .map(function (item) {
                return item.id;
            });
            if ('nextLink' in listing) {
                return searchPage(urls.files + '?pageToken=' + encodeURIComponent(listing.nextPageToken), extension);
            }
            else {
                return items;
            }
        });
    }
    function request(method, url, options) {
        options = options || {};
        return loadAccessToken(true)
            .then(function (token) {
            return http(method, url, {
                headers: {
                    'Authorization': 'Bearer ' + token
                },
                responseType: options.responseType || '',
                progress: options.progress
            });
        });
    }
    function loadScript(url) {
        return new Promise(function (resolve, reject) {
            const element = document.createElement('script');
            element.addEventListener('load', () => resolve());
            element.addEventListener('error', () => reject(new Error('Could not load script: ' + url)));
            element.async = true;
            element.src = url;
            document.head.appendChild(element);
        });
    }
    function loadGoogleApi() {
        return new Promise(function (resolve, reject) {
            loadScript(urls.client)
                .then(function () {
                gapi.load('client', { callback: function () {
                        resolve();
                    } });
            })
                .catch(reject);
        });
    }
    let accessToken = null;
    function loadAccessToken(immediate) {
        return new Promise((resolve, reject) => {
            if (accessToken) {
                resolve(accessToken);
            }
            else if (immediate) {
                loadGoogleApi()
                    .then(googleAuth)
                    .catch(reject);
            }
            else {
                googleAuth();
            }
            function googleAuth() {
                gapi.auth.authorize({
                    client_id: ids.client,
                    scope: urls.scope,
                    immediate: immediate
                }, result => {
                    if (result && !result.error) {
                        accessToken = result.access_token;
                        resolve(accessToken);
                    }
                    else {
                        reject();
                    }
                });
            }
        });
    }
    function http(method, url, options) {
        options = options || {};
        options.headers = options.headers || {};
        options.responseType = options.responseType || '';
        return new Promise(function (resolve, reject) {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url);
            xhr.responseType = options.responseType;
            Object.keys(options.headers).forEach(function (key) {
                const value = options.headers[key];
                xhr.setRequestHeader(key, value);
            });
            xhr.addEventListener('load', function () {
                let response = options.responseType
                    ? xhr.response
                    : responseFromRequest(xhr);
                resolve(response);
            });
            xhr.addEventListener('error', e => reject(new Error('Could not load URL: ' + url)));
            xhr.addEventListener('abort', e => reject(new Error('Loading of URL aborted: ' + url)));
            if (options.progress) {
                xhr.addEventListener('progress', e => {
                    if (e.lengthComputable) {
                        options.progress(e.loaded / e.total);
                    }
                });
            }
            xhr.send();
        });
    }
    function responseFromRequest(xhr) {
        let mimeTypeString = xhr.getResponseHeader('Content-Type');
        let mimeType = mimeTypeString.split(';')[0];
        if (mimeType === 'application/json') {
            return JSON.parse(xhr.responseText);
        }
        else {
            return xhr.responseText;
        }
    }
    return {
        authenticate: (immediate) => loadAccessToken(immediate),
        download: {
            metadata: downloadMetadata,
            contents: downloadContents,
            blob: downloadBlob,
            preview: downloadPreview
        },
        search: search
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
;
