let BASE_URL = 'https://www.googleapis.com/youtube/v3/search';
let axios = require('axios');

module.exports = function(options,callback) {
    if(!options.apiKey) {
        throw new Error('API key required');
    }

    let params = {
        part: 'snippet',
        key: options.apiKey,
        q : options.term,
        maxResults: 10,
        type: 'video'
    };

    axios.get(BASE_URL, {params})
    .then(reponse => {
       if(callback) { callback(reponse.data.items)}
    })
    .catch(err => {
        console.log(err);
    })
}