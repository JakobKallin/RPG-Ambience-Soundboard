"use strict";
function default_1(appId) {
    var ids = {
        app: appId
    };
    ids.client = ids.app + '.apps.googleusercontent.com';
    var urls = {
        files: 'https://www.googleapis.com/drive/v3/files',
        client: 'https://apis.google.com/js/client.js',
        scope: 'https://www.googleapis.com/auth/drive'
    };
    function downloadMetadata(id) {
        var url = urls.files + '/' + id + '?fields=thumbnailLink';
        return request('GET', url);
    }
    function downloadContents(id) {
        var url = urls.files + '/' + id + '?alt=media';
        return request('GET', url);
    }
    function downloadBlob(id, progress) {
        var url = urls.files + '/' + id + '?alt=media';
        return request('GET', url, { responseType: 'blob', progress: progress });
    }
    function downloadPreview(id) {
        return downloadMetadata(id).then(function (metadata) {
            return metadata.thumbnailLink;
        });
    }
    function search(options) {
        var mimeType = options.mimeType;
        var extension = options.extension;
        var query = "trashed=false and mimeType='" + mimeType + "'";
        var url = urls.files + '?q=' + encodeURIComponent(query);
        return searchPage(url, extension);
    }
    function searchPage(url, extension) {
        return request('GET', url)
            .then(function (listing) {
            var items = listing.files.filter(function (item) {
                var tokens = item.name.split('.');
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
            var element = document.createElement('script');
            element.addEventListener('load', function () { return resolve(); });
            element.addEventListener('error', function () { return reject(new Error('Could not load script: ' + url)); });
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
    var accessToken = null;
    function loadAccessToken(immediate) {
        return new Promise(function (resolve, reject) {
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
                }, function (result) {
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
            var xhr = new XMLHttpRequest();
            xhr.open(method, url);
            xhr.responseType = options.responseType;
            Object.keys(options.headers).forEach(function (key) {
                var value = options.headers[key];
                xhr.setRequestHeader(key, value);
            });
            xhr.addEventListener('load', function () {
                var response = options.responseType
                    ? xhr.response
                    : responseFromRequest(xhr);
                resolve(response);
            });
            xhr.addEventListener('error', function (e) { return reject(new Error('Could not load URL: ' + url)); });
            xhr.addEventListener('abort', function (e) { return reject(new Error('Loading of URL aborted: ' + url)); });
            if (options.progress) {
                xhr.addEventListener('progress', function (e) {
                    if (e.lengthComputable) {
                        options.progress(e.loaded / e.total);
                    }
                });
            }
            xhr.send();
        });
    }
    function responseFromRequest(xhr) {
        var mimeTypeString = xhr.getResponseHeader('Content-Type');
        var mimeType = mimeTypeString.split(';')[0];
        if (mimeType === 'application/json') {
            return JSON.parse(xhr.responseText);
        }
        else {
            return xhr.responseText;
        }
    }
    return {
        authenticate: function (immediate) { return loadAccessToken(immediate); },
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
